const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Post = require("../models/Post");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { createNotification } = require("../services/notificationService");

const buildParticipantsHash = (idA, idB) =>
  [String(idA), String(idB)].sort().join(":");
const conversationSelect =
  "name profileImage role isVerified specialization hospital experience reputationScore followers following createdAt";

const populateConversation = async (conversationId) => {
  let conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return null;
  }

  conversation = await conversation.populate(
    "participants",
    conversationSelect,
  );
  conversation = await conversation.populate("admins", conversationSelect);
  conversation = await conversation.populate("createdBy", conversationSelect);

  return conversation;
};

const normalizeConversation = (conversation) => {
  if (!conversation) {
    return null;
  }

  return conversation.toJSON ? conversation.toJSON() : { ...conversation };
};

const conversationParticipantIds = (conversation) =>
  (conversation?.participants || []).map((participant) =>
    String(participant._id || participant),
  );

const conversationAdminIds = (conversation) =>
  (conversation?.admins || []).map((participant) =>
    String(participant._id || participant),
  );

const isMember = (conversation, userId) =>
  conversationParticipantIds(conversation).includes(String(userId));

const isAdmin = (conversation, userId) =>
  conversationAdminIds(conversation).includes(String(userId));

const getUnreadCount = (conversation, userId) => {
  const unreadCounts = conversation?.unreadCounts;
  const key = String(userId);

  if (!unreadCounts) {
    return 0;
  }

  if (typeof unreadCounts.get === "function") {
    return Number(unreadCounts.get(key) || 0);
  }

  return Number(unreadCounts[key] || 0);
};

const toConversationPayload = (conversation, userId) => {
  const payload = normalizeConversation(conversation);

  if (!payload) {
    return null;
  }

  payload.unreadCount = getUnreadCount(conversation, userId);
  return payload;
};

const assertGroupAccess = (conversation, userId) => {
  if (
    !conversation ||
    !conversation.isGroup ||
    !isMember(conversation, userId)
  ) {
    throw new ApiError(404, "Group not found or access denied");
  }
};

const assertGroupAdmin = (conversation, userId) => {
  if (
    !isAdmin(conversation, userId) &&
    String(conversation.createdBy?._id || conversation.createdBy) !==
      String(userId)
  ) {
    throw new ApiError(403, "Only group admins can manage this group");
  }
};

const broadcastConversationUpdate = (io, conversation, userIds) => {
  if (!io || !conversation) {
    return;
  }

  const payload = normalizeConversation(conversation);
  userIds.forEach((userId) => {
    io.to(`user:${String(userId)}`).emit("conversationUpdated", payload);
  });
};

const broadcastConversationRemoval = (io, conversationId, userIds) => {
  if (!io) {
    return;
  }

  userIds.forEach((userId) => {
    io.to(`user:${String(userId)}`).emit("conversationRemoved", {
      conversationId: String(conversationId),
    });
  });
};

const markConversationRead = async (conversationId, userId) => {
  await Promise.all([
    Conversation.findByIdAndUpdate(conversationId, {
      $set: {
        [`unreadCounts.${String(userId)}`]: 0,
      },
    }),
    Message.updateMany(
      { conversationId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } },
    ),
  ]);
};

const bumpUnreadCounts = (conversation, senderId) => {
  const unreadCounts = conversation.unreadCounts || {};
  const sender = String(senderId);

  conversationParticipantIds(conversation).forEach((participantId) => {
    const nextValue =
      participantId === sender
        ? 0
        : getUnreadCount(conversation, participantId) + 1;

    if (typeof unreadCounts.set === "function") {
      unreadCounts.set(participantId, nextValue);
    } else {
      unreadCounts[participantId] = nextValue;
    }
  });

  conversation.unreadCounts = unreadCounts;
};

const persistConversationReadState = async (conversation, userId, io) => {
  await markConversationRead(conversation._id, userId);
  const updatedConversation = await populateConversation(conversation._id);
  broadcastConversationUpdate(io, updatedConversation, [userId]);
  return updatedConversation;
};

const createConversation = catchAsync(async (req, res) => {
  const participantId = String(req.body.participantId);

  if (participantId === String(req.user._id)) {
    throw new ApiError(400, "You cannot create a conversation with yourself");
  }

  const participantExists = await User.exists({ _id: participantId });
  if (!participantExists) {
    throw new ApiError(404, "Participant user not found");
  }

  const participantsHash = buildParticipantsHash(req.user._id, participantId);

  let conversation = await Conversation.findOne({ participantsHash }).populate(
    "participants",
    conversationSelect,
  );

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, participantId],
      participantsHash,
      unreadCounts: {
        [String(req.user._id)]: 0,
        [String(participantId)]: 0,
      },
      lastMessage: "",
    });

    conversation = await populateConversation(conversation._id);
  }

  res.status(200).json({
    success: true,
    data: toConversationPayload(conversation, req.user._id),
  });
});

const createGroupConversation = catchAsync(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const image = String(req.body.image || "").trim();
  const memberIds = Array.from(
    new Set(
      (req.body.memberIds || []).map((memberId) => String(memberId).trim()),
    ),
  ).filter(Boolean);
  const selfId = String(req.user._id);

  if (!name) {
    throw new ApiError(400, "Group name is required");
  }

  const selectedMemberIds = memberIds.filter((memberId) => memberId !== selfId);
  if (selectedMemberIds.length === 0) {
    throw new ApiError(400, "Add at least one member to create a group");
  }

  const followerIds = new Set(
    (req.user.followers || []).map((memberId) => String(memberId)),
  );
  const invalidMembers = selectedMemberIds.filter(
    (memberId) => !followerIds.has(memberId),
  );
  if (invalidMembers.length > 0) {
    throw new ApiError(403, "You can only add your followers to a group");
  }

  const users = await User.find({ _id: { $in: selectedMemberIds } }).select(
    "_id",
  );
  if (users.length !== selectedMemberIds.length) {
    throw new ApiError(404, "One or more selected members were not found");
  }

  const participants = [req.user._id, ...selectedMemberIds];
  const unreadCounts = Object.fromEntries(
    participants.map((participantId) => [String(participantId), 0]),
  );

  const conversation = await Conversation.create({
    participants,
    participantsHash: `group_${selfId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    isGroup: true,
    title: name,
    image,
    createdBy: req.user._id,
    admins: [req.user._id],
    unreadCounts,
    lastMessage: "",
  });

  const populated = await populateConversation(conversation._id);

  res.status(201).json({
    success: true,
    data: toConversationPayload(populated, req.user._id),
  });
});

const joinCaseDiscussionChat = catchAsync(async (req, res) => {
  const postId = req.params.postId;

  const post = await Post.findById(postId).populate("userId", "name");
  if (!post || post.type !== "case") {
    throw new ApiError(404, "Case discussion post not found");
  }

  const participantsHash = `case_${postId}`;

  let conversation = await Conversation.findOne({ participantsHash }).populate(
    "participants",
    conversationSelect,
  );

  if (!conversation) {
    const authorName = post.isAnonymous ? "Anonymous Case" : post.userId.name;
    conversation = await Conversation.create({
      participants: [req.user._id],
      participantsHash,
      isGroup: true,
      postId: post._id,
      title: `${authorName}'s Case Discussion`,
      createdBy: req.user._id,
      admins: [req.user._id],
      unreadCounts: { [String(req.user._id)]: 0 },
      lastMessage: "",
    });

    conversation = await populateConversation(conversation._id);
  } else if (
    !conversation.participants.some(
      (participant) => String(participant._id) === String(req.user._id),
    )
  ) {
    conversation.participants.push(req.user._id);
    if (typeof conversation.unreadCounts?.set === "function") {
      conversation.unreadCounts.set(String(req.user._id), 0);
    }
    await conversation.save();
    conversation = await populateConversation(conversation._id);
  }

  res.status(200).json({
    success: true,
    data: toConversationPayload(conversation, req.user._id),
  });
});

const getConversation = catchAsync(async (req, res) => {
  const conversation = await populateConversation(req.params.conversationId);

  if (!conversation || !isMember(conversation, req.user._id)) {
    throw new ApiError(404, "Conversation not found or access denied");
  }

  res.status(200).json({
    success: true,
    data: toConversationPayload(conversation, req.user._id),
  });
});

const getConversations = catchAsync(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .sort({ updatedAt: -1 })
    .populate("participants", conversationSelect)
    .populate("admins", conversationSelect)
    .populate("createdBy", conversationSelect);

  res.status(200).json({
    success: true,
    data: conversations.map((conversation) =>
      toConversationPayload(conversation, req.user._id),
    ),
  });
});

const getMessages = catchAsync(async (req, res) => {
  const conversationId = req.params.conversationId;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found or access denied");
  }

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);

  const [messages, total] = await Promise.all([
    Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "senderId",
        "name profileImage role isVerified specialization hospital experience",
      )
      .lean(),
    Message.countDocuments({ conversationId }),
  ]);

  await persistConversationReadState(
    conversation,
    req.user._id,
    req.app.get("io"),
  );

  res.status(200).json({
    success: true,
    data: messages.reverse(),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});

const sendMessage = catchAsync(async (req, res) => {
  const { conversationId, text = "", mediaUrl = "" } = req.body;

  const cleanedText = String(text || "").trim();
  const cleanedMediaUrl = String(mediaUrl || "").trim();

  if (!cleanedText && !cleanedMediaUrl) {
    throw new ApiError(400, "Message text or mediaUrl is required");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found or access denied");
  }

  const message = await Message.create({
    conversationId,
    senderId: req.user._id,
    text: cleanedText,
    mediaUrl: cleanedMediaUrl,
    readBy: [req.user._id],
  });

  conversation.lastMessage = cleanedText || "Sent an attachment";
  bumpUnreadCounts(conversation, req.user._id);
  await conversation.save();

  const hydratedMessage = await Message.findById(message._id).populate(
    "senderId",
    "name profileImage role isVerified specialization hospital experience",
  );

  const io = req.app.get("io");
  if (io) {
    io.to(String(conversationId)).emit("receiveMessage", {
      conversationId: String(conversationId),
      message: hydratedMessage,
    });

    broadcastConversationUpdate(
      io,
      conversation,
      conversationParticipantIds(conversation),
    );
  }

  const recipients = (conversation.participants || []).filter(
    (participantId) => String(participantId) !== String(req.user._id),
  );

  await Promise.all(
    recipients.map((recipientId) =>
      createNotification({
        userId: recipientId,
        type: "message",
        title: "New message",
        body: cleanedText || "You received a new media message",
        referenceId: String(conversation._id),
        triggerUserId: req.user._id,
      }),
    ),
  );

  res.status(201).json({
    success: true,
    data: hydratedMessage,
  });
});

const renameGroupConversation = catchAsync(async (req, res) => {
  const conversation = await populateConversation(req.params.groupId);

  if (
    !conversation ||
    !conversation.isGroup ||
    !isMember(conversation, req.user._id)
  ) {
    throw new ApiError(404, "Group not found or access denied");
  }

  assertGroupAdmin(conversation, req.user._id);

  const nextName = String(req.body.name || "").trim();
  const nextImage = Object.prototype.hasOwnProperty.call(req.body, "image")
    ? String(req.body.image || "").trim()
    : String(conversation.image || "").trim();

  if (nextName) {
    conversation.title = nextName;
  }

  conversation.image = nextImage;
  await conversation.save();

  const updatedConversation = await populateConversation(conversation._id);
  const io = req.app.get("io");
  broadcastConversationUpdate(
    io,
    updatedConversation,
    conversationParticipantIds(updatedConversation),
  );

  res.status(200).json({
    success: true,
    data: toConversationPayload(updatedConversation, req.user._id),
  });
});

const addGroupMembers = catchAsync(async (req, res) => {
  const conversation = await populateConversation(req.params.groupId);

  if (
    !conversation ||
    !conversation.isGroup ||
    !isMember(conversation, req.user._id)
  ) {
    throw new ApiError(404, "Group not found or access denied");
  }

  assertGroupAdmin(conversation, req.user._id);

  const selfId = String(req.user._id);
  const followerIds = new Set(
    (req.user.followers || []).map((memberId) => String(memberId)),
  );
  const existingIds = new Set(conversationParticipantIds(conversation));
  const memberIds = Array.from(
    new Set(
      (req.body.memberIds || []).map((memberId) => String(memberId).trim()),
    ),
  ).filter(Boolean);
  const validMemberIds = memberIds.filter(
    (memberId) =>
      memberId !== selfId &&
      followerIds.has(memberId) &&
      !existingIds.has(memberId),
  );

  if (validMemberIds.length === 0) {
    throw new ApiError(400, "No valid members to add");
  }

  const users = await User.find({ _id: { $in: validMemberIds } }).select("_id");
  if (users.length !== validMemberIds.length) {
    throw new ApiError(404, "One or more selected members were not found");
  }

  conversation.participants.push(...validMemberIds);
  validMemberIds.forEach((memberId) => {
    if (typeof conversation.unreadCounts?.set === "function") {
      conversation.unreadCounts.set(memberId, 0);
    }
  });

  await conversation.save();

  const updatedConversation = await populateConversation(conversation._id);
  const io = req.app.get("io");
  broadcastConversationUpdate(
    io,
    updatedConversation,
    conversationParticipantIds(updatedConversation),
  );

  res.status(200).json({
    success: true,
    data: toConversationPayload(updatedConversation, req.user._id),
  });
});

const removeGroupMember = catchAsync(async (req, res) => {
  const conversation = await populateConversation(req.params.groupId);

  if (
    !conversation ||
    !conversation.isGroup ||
    !isMember(conversation, req.user._id)
  ) {
    throw new ApiError(404, "Group not found or access denied");
  }

  assertGroupAdmin(conversation, req.user._id);

  const memberId = String(req.params.memberId || "").trim();
  if (!memberId || memberId === String(req.user._id)) {
    throw new ApiError(400, "You cannot remove yourself here");
  }

  if (!isMember(conversation, memberId)) {
    throw new ApiError(404, "Member not found in this group");
  }

  conversation.participants = (conversation.participants || []).filter(
    (participant) => String(participant._id || participant) !== memberId,
  );
  conversation.admins = (conversation.admins || []).filter(
    (participant) => String(participant._id || participant) !== memberId,
  );

  if (conversation.unreadCounts?.delete) {
    conversation.unreadCounts.delete(memberId);
  }

  if ((conversation.participants || []).length === 0) {
    await Promise.all([
      Message.deleteMany({ conversationId: conversation._id }),
      Conversation.findByIdAndDelete(conversation._id),
    ]);

    const io = req.app.get("io");
    broadcastConversationRemoval(io, conversation._id, [
      req.user._id,
      memberId,
    ]);

    return res.status(200).json({
      success: true,
      data: { removedMemberId: memberId, deleted: true },
    });
  }

  if ((conversation.admins || []).length === 0) {
    conversation.admins = [
      conversation.participants[0]._id || conversation.participants[0],
    ];
  }

  await conversation.save();

  const updatedConversation = await populateConversation(conversation._id);
  const io = req.app.get("io");
  broadcastConversationUpdate(
    io,
    updatedConversation,
    conversationParticipantIds(updatedConversation),
  );

  res.status(200).json({
    success: true,
    data: {
      removedMemberId: memberId,
      conversation: toConversationPayload(updatedConversation, req.user._id),
    },
  });
});

const leaveGroupConversation = catchAsync(async (req, res) => {
  const conversation = await populateConversation(req.params.groupId);

  if (
    !conversation ||
    !conversation.isGroup ||
    !isMember(conversation, req.user._id)
  ) {
    throw new ApiError(404, "Group not found or access denied");
  }

  const leaverId = String(req.user._id);
  const formerMembers = conversationParticipantIds(conversation);

  conversation.participants = (conversation.participants || []).filter(
    (participant) => String(participant._id || participant) !== leaverId,
  );
  conversation.admins = (conversation.admins || []).filter(
    (participant) => String(participant._id || participant) !== leaverId,
  );

  if (conversation.unreadCounts?.delete) {
    conversation.unreadCounts.delete(leaverId);
  }

  if ((conversation.participants || []).length === 0) {
    await Promise.all([
      Message.deleteMany({ conversationId: conversation._id }),
      Conversation.findByIdAndDelete(conversation._id),
    ]);

    const io = req.app.get("io");
    broadcastConversationRemoval(io, conversation._id, formerMembers);

    return res.status(200).json({
      success: true,
      data: { left: true, deleted: true },
    });
  }

  if ((conversation.admins || []).length === 0) {
    conversation.admins = [
      conversation.participants[0]._id || conversation.participants[0],
    ];
  }

  await conversation.save();

  const updatedConversation = await populateConversation(conversation._id);
  const io = req.app.get("io");
  broadcastConversationUpdate(
    io,
    updatedConversation,
    conversationParticipantIds(updatedConversation),
  );
  io?.to(`user:${leaverId}`).emit("conversationRemoved", {
    conversationId: String(conversation._id),
  });

  res.status(200).json({
    success: true,
    data: { left: true },
  });
});

const clearGroupChat = catchAsync(async (req, res) => {
  const conversation = await populateConversation(req.params.groupId);

  if (
    !conversation ||
    !conversation.isGroup ||
    !isMember(conversation, req.user._id)
  ) {
    throw new ApiError(404, "Group not found or access denied");
  }

  await persistConversationReadState(
    conversation,
    req.user._id,
    req.app.get("io"),
  );

  res.status(200).json({
    success: true,
    data: { cleared: true },
  });
});

module.exports = {
  createConversation,
  createGroupConversation,
  joinCaseDiscussionChat,
  getConversation,
  getConversations,
  getMessages,
  sendMessage,
  renameGroupConversation,
  addGroupMembers,
  removeGroupMember,
  leaveGroupConversation,
  clearGroupChat,
};
