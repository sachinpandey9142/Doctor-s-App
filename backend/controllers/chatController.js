const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { createNotification } = require("../services/notificationService");

const buildParticipantsHash = (idA, idB) =>
  [String(idA), String(idB)].sort().join(":");

const CHAT_POPULATE_FIELDS =
  "name email role specialization hospital experience isVerified reputationScore profileImage followers following createdAt";

const populateConversation = (query) =>
  query
    .populate("participants", CHAT_POPULATE_FIELDS)
    .populate("admins", CHAT_POPULATE_FIELDS)
    .populate("createdBy", CHAT_POPULATE_FIELDS);

const getClearedAtForUser = (conversation, userId) => {
  const entry = (conversation.clearedBy || []).find(
    (item) => String(item.userId) === String(userId),
  );
  return entry?.clearedAt || null;
};

const emitConversationUpdated = async (req, conversationId) => {
  const io = req.app.get("io");
  if (!io) {
    return;
  }

  const conversation = await populateConversation(
    Conversation.findById(conversationId),
  );
  if (!conversation) {
    return;
  }

  const targets = new Set(
    (conversation.participants || []).map((participant) =>
      String(participant._id || participant),
    ),
  );
  targets.forEach((participantId) => {
    io.to(`user:${participantId}`).emit("conversationUpdated", {
      conversationId: String(conversation._id),
    });
  });
};

const isFollowerAllowed = (currentUser, candidateId) => {
  return (currentUser.followers || []).some(
    (id) => String(id) === String(candidateId),
  );
};

const normalizeMemberIds = (memberIds = []) =>
  Array.from(new Set(memberIds.map((id) => String(id).trim()).filter(Boolean)));

const assertGroupAdmin = (conversation, userId) => {
  const isAdmin = (conversation.admins || []).some(
    (adminId) => String(adminId._id || adminId) === String(userId),
  );
  if (!isAdmin) {
    throw new ApiError(403, "Only group admins can perform this action");
  }
};

const ensureConversationMembership = (conversation, userId) => {
  const isMember = (conversation.participants || []).some(
    (participantId) =>
      String(participantId._id || participantId) === String(userId),
  );
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }
};

const reassignAdminIfNeeded = async (conversation) => {
  const participantIds = (conversation.participants || []).map((participant) =>
    String(participant._id || participant),
  );
  const adminIds = (conversation.admins || []).map((admin) =>
    String(admin._id || admin),
  );

  if (participantIds.length === 0) {
    return null;
  }

  if (adminIds.length > 0) {
    return conversation;
  }

  conversation.admins = [participantIds[0]];
  conversation.createdBy = participantIds[0];
  return conversation.save();
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

  let conversation = await populateConversation(
    Conversation.findOne({ participantsHash }),
  );

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, participantId],
      participantsHash,
      isGroup: false,
      lastMessage: "",
    });

    conversation = await populateConversation(
      Conversation.findById(conversation._id),
    );
  }

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

const getConversations = catchAsync(async (req, res) => {
  const conversations = await populateConversation(
    Conversation.find({ participants: req.user._id }),
  )
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: conversations,
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
  const clearedAt = getClearedAtForUser(conversation, req.user._id);

  const messageFilter = { conversationId };
  if (clearedAt) {
    messageFilter.createdAt = { $gt: clearedAt };
  }

  const [messages, total] = await Promise.all([
    Message.find(messageFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("senderId", "name profileImage role isVerified")
      .lean(),
    Message.countDocuments(messageFilter),
  ]);

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
  });

  conversation.lastMessage = cleanedText || "Sent an attachment";
  await conversation.save();

  const hydratedMessage = await Message.findById(message._id).populate(
    "senderId",
    "name profileImage role isVerified specialization",
  );

  const io = req.app.get("io");
  if (io) {
    io.to(String(conversationId)).emit("receiveMessage", {
      conversationId: String(conversationId),
      message: hydratedMessage,
    });

    const participantIds = new Set(
      (conversation.participants || []).map((participantId) =>
        String(participantId._id || participantId),
      ),
    );
    participantIds.forEach((participantId) => {
      io.to(`user:${participantId}`).emit("conversationUpdated", {
        conversationId: String(conversationId),
      });
    });
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

const createGroup = catchAsync(async (req, res) => {
  const groupName = String(req.body.groupName || "").trim();
  const groupImage = String(req.body.groupImage || "").trim();
  const memberIds = normalizeMemberIds(req.body.memberIds || []);

  if (groupName.length < 2) {
    throw new ApiError(400, "Group name is required");
  }

  if (memberIds.length < 1) {
    throw new ApiError(400, "Select at least one follower to create a group");
  }

  const nonFollowers = memberIds.filter(
    (memberId) => !isFollowerAllowed(req.user, memberId),
  );
  if (nonFollowers.length > 0) {
    throw new ApiError(400, "You can only add followers to a group");
  }

  if (memberIds.some((memberId) => String(memberId) === String(req.user._id))) {
    throw new ApiError(400, "You cannot add yourself as a member");
  }

  const participants = [req.user._id, ...memberIds];

  const createdConversation = await Conversation.create({
    isGroup: true,
    groupName,
    groupImage,
    createdBy: req.user._id,
    admins: [req.user._id],
    participants,
    lastMessage: "",
  });

  const conversation = await populateConversation(
    Conversation.findById(createdConversation._id),
  );

  await emitConversationUpdated(req, conversation._id);

  res.status(201).json({
    success: true,
    data: conversation,
  });
});

const getGroups = catchAsync(async (req, res) => {
  const conversations = await populateConversation(
    Conversation.find({ participants: req.user._id, isGroup: true }),
  )
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: conversations,
  });
});

const getGroupById = catchAsync(async (req, res) => {
  const conversation = await populateConversation(
    Conversation.findOne({
      _id: req.params.id,
      isGroup: true,
      participants: req.user._id,
    }),
  );

  if (!conversation) {
    throw new ApiError(404, "Group not found or access denied");
  }

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

const renameGroup = catchAsync(async (req, res) => {
  const groupName = String(req.body.groupName || "").trim();
  const groupImage = String(req.body.groupImage || "").trim();

  if (groupName.length < 2) {
    throw new ApiError(400, "Group name is required");
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    isGroup: true,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new ApiError(404, "Group not found or access denied");
  }

  assertGroupAdmin(conversation, req.user._id);

  conversation.groupName = groupName;
  if (groupImage) {
    conversation.groupImage = groupImage;
  }

  await conversation.save();

  const populated = await populateConversation(
    Conversation.findById(conversation._id),
  );
  await emitConversationUpdated(req, conversation._id);

  res.status(200).json({
    success: true,
    data: populated,
  });
});

const addGroupMembers = catchAsync(async (req, res) => {
  const memberIds = normalizeMemberIds(req.body.memberIds || []);

  if (memberIds.length === 0) {
    throw new ApiError(400, "Select at least one follower to add");
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    isGroup: true,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new ApiError(404, "Group not found or access denied");
  }

  assertGroupAdmin(conversation, req.user._id);

  const followerIds = new Set(
    (req.user.followers || []).map((id) => String(id)),
  );
  const invalidMembers = memberIds.filter(
    (memberId) => !followerIds.has(String(memberId)),
  );
  if (invalidMembers.length > 0) {
    throw new ApiError(400, "You can only add followers to a group");
  }

  await Conversation.findByIdAndUpdate(
    conversation._id,
    { $addToSet: { participants: { $each: memberIds } } },
    { new: true },
  );

  const populated = await populateConversation(
    Conversation.findById(conversation._id),
  );
  await emitConversationUpdated(req, conversation._id);

  res.status(200).json({
    success: true,
    data: populated,
  });
});

const removeGroupMember = catchAsync(async (req, res) => {
  const targetUserId = String(req.body.targetUserId || "").trim();

  if (!targetUserId) {
    throw new ApiError(400, "targetUserId is required");
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    isGroup: true,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new ApiError(404, "Group not found or access denied");
  }

  assertGroupAdmin(conversation, req.user._id);

  if (String(targetUserId) === String(req.user._id)) {
    throw new ApiError(400, "Use leave group to exit yourself");
  }

  await Conversation.findByIdAndUpdate(conversation._id, {
    $pull: {
      participants: targetUserId,
      admins: targetUserId,
      clearedBy: { userId: targetUserId },
    },
  });

  const updated = await Conversation.findById(conversation._id);
  if (updated) {
    await reassignAdminIfNeeded(updated);
  }

  const populated = updated
    ? await populateConversation(Conversation.findById(updated._id))
    : null;
  await emitConversationUpdated(req, conversation._id);

  res.status(200).json({
    success: true,
    data: populated,
  });
});

const leaveGroup = catchAsync(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    isGroup: true,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new ApiError(404, "Group not found or access denied");
  }

  const currentParticipantIds = (conversation.participants || []).map(
    (participant) => String(participant._id || participant),
  );
  const remainingParticipants = currentParticipantIds.filter(
    (participantId) => String(participantId) !== String(req.user._id),
  );

  if (remainingParticipants.length === 0) {
    await Promise.all([
      Message.deleteMany({ conversationId: conversation._id }),
      Conversation.findByIdAndDelete(conversation._id),
    ]);

    res.status(200).json({
      success: true,
      data: { left: true, deleted: true },
    });
    return;
  }

  const remainingAdmins = (conversation.admins || [])
    .map((admin) => String(admin._id || admin))
    .filter((adminId) => String(adminId) !== String(req.user._id));

  const nextAdmin = remainingAdmins[0] || remainingParticipants[0];

  conversation.participants = remainingParticipants;
  conversation.admins =
    remainingAdmins.length > 0 ? remainingAdmins : [nextAdmin];
  conversation.createdBy =
    String(conversation.createdBy || req.user._id) === String(req.user._id)
      ? nextAdmin
      : conversation.createdBy;
  conversation.clearedBy = (conversation.clearedBy || []).filter(
    (item) => String(item.userId) !== String(req.user._id),
  );

  await conversation.save();

  await emitConversationUpdated(req, conversation._id);

  res.status(200).json({
    success: true,
    data: { left: true, deleted: false },
  });
});

const clearGroupChat = catchAsync(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    isGroup: true,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new ApiError(404, "Group not found or access denied");
  }

  const clearedAt = new Date();
  const clearedBy = (conversation.clearedBy || []).filter(
    (item) => String(item.userId) !== String(req.user._id),
  );
  clearedBy.push({ userId: req.user._id, clearedAt });
  conversation.clearedBy = clearedBy;

  await conversation.save();
  await emitConversationUpdated(req, conversation._id);

  res.status(200).json({
    success: true,
    data: { clearedAt: clearedAt.toISOString() },
  });
});

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  createGroup,
  getGroups,
  getGroupById,
  renameGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  clearGroupChat,
};
