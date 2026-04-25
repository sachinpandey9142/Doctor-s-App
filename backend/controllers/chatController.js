const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { createNotification } = require("../services/notificationService");

const buildParticipantsHash = (idA, idB) => [String(idA), String(idB)].sort().join(":");

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
    "name profileImage role isVerified specialization"
  );

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, participantId],
      participantsHash,
      lastMessage: ""
    });

    conversation = await Conversation.findById(conversation._id).populate(
      "participants",
      "name profileImage role isVerified specialization"
    );
  }

  res.status(200).json({
    success: true,
    data: conversation
  });
});

const getConversations = catchAsync(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .sort({ updatedAt: -1 })
    .populate("participants", "name profileImage role isVerified specialization")
    .lean();

  res.status(200).json({
    success: true,
    data: conversations
  });
});

const getMessages = catchAsync(async (req, res) => {
  const conversationId = req.params.conversationId;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id
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
      .populate("senderId", "name profileImage role isVerified")
      .lean(),
    Message.countDocuments({ conversationId })
  ]);

  res.status(200).json({
    success: true,
    data: messages.reverse(),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
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
    participants: req.user._id
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found or access denied");
  }

  const message = await Message.create({
    conversationId,
    senderId: req.user._id,
    text: cleanedText,
    mediaUrl: cleanedMediaUrl
  });

  conversation.lastMessage = cleanedText || "Sent an attachment";
  await conversation.save();

  const hydratedMessage = await Message.findById(message._id).populate(
    "senderId",
    "name profileImage role isVerified specialization"
  );

  const io = req.app.get("io");
  if (io) {
    io.to(String(conversationId)).emit("receiveMessage", {
      conversationId: String(conversationId),
      message: hydratedMessage
    });
  }

  const recipients = (conversation.participants || []).filter(
    (participantId) => String(participantId) !== String(req.user._id)
  );

  await Promise.all(
    recipients.map((recipientId) =>
      createNotification({
        userId: recipientId,
        type: "message",
        title: "New message",
        body: cleanedText || "You received a new media message",
        referenceId: String(conversation._id),
        triggerUserId: req.user._id
      })
    )
  );

  res.status(201).json({
    success: true,
    data: hydratedMessage
  });
});

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  sendMessage
};
