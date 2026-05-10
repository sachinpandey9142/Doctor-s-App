const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");

const conversationSelect =
  "name profileImage role isVerified specialization hospital experience reputationScore followers following createdAt";

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
  const payload = conversation?.toJSON
    ? conversation.toJSON()
    : { ...conversation };
  if (!payload) {
    return null;
  }

  payload.unreadCount = getUnreadCount(conversation, userId);
  return payload;
};

const updateUnreadCountsForMessage = (conversation, senderId) => {
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

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // ─── Auth middleware ─────────────────────────────────────────────────────────
  // Two-step verification:
  //   1. JWT signature + expiry check (fast, no DB)
  //   2. User actually exists in MongoDB (catches deleted accounts mid-session)
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized: missing token"));
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error("Unauthorized: invalid or expired token"));
    }

    // Step 2 — verify the user still exists in the database.
    // This prevents ghost connections from deleted or banned accounts.
    try {
      const user = await User.findById(payload.id).select("_id name").lean();
      if (!user) {
        return next(new Error("Unauthorized: user account not found"));
      }

      socket.userId = String(user._id);
      socket.userName = user.name;
      return next();
    } catch {
      return next(new Error("Unauthorized: unable to verify user"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on("joinConversation", async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          socket.emit("socketError", {
            message: "Conversation not found or access denied",
          });
          return;
        }

        socket.join(String(conversationId));
        socket.emit("joinedConversation", {
          conversationId: String(conversationId),
        });

        if (conversation) {
          await Promise.all([
            Conversation.findByIdAndUpdate(conversationId, {
              $set: {
                [`unreadCounts.${String(socket.userId)}`]: 0,
              },
            }),
            Message.updateMany(
              { conversationId, readBy: { $ne: socket.userId } },
              { $addToSet: { readBy: socket.userId } },
            ),
          ]);

          const updatedConversation = await Conversation.findById(
            conversationId,
          )
            .populate("participants", conversationSelect)
            .populate("admins", conversationSelect)
            .populate("createdBy", conversationSelect);

          io.to(`user:${socket.userId}`).emit(
            "conversationUpdated",
            toConversationPayload(updatedConversation, socket.userId),
          );
        }
      } catch (_error) {
        socket.emit("socketError", { message: "Unable to join conversation" });
      }
    });

    socket.on("typing", async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          return;
        }

        socket.to(String(conversationId)).emit("userTyping", {
          conversationId: String(conversationId),
          senderId: socket.userId,
          senderName: socket.userName,
          isGroup: Boolean(conversation.isGroup),
        });
      } catch (_error) {
        // Ignore transient typing errors.
      }
    });

    socket.on("stopTyping", async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          return;
        }

        socket.to(String(conversationId)).emit("userTypingStopped", {
          conversationId: String(conversationId),
          senderId: socket.userId,
          isGroup: Boolean(conversation.isGroup),
        });
      } catch (_error) {
        // Ignore transient typing errors.
      }
    });

    socket.on("markConversationRead", async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          return;
        }

        await Promise.all([
          Conversation.findByIdAndUpdate(conversationId, {
            $set: {
              [`unreadCounts.${String(socket.userId)}`]: 0,
            },
          }),
          Message.updateMany(
            { conversationId, readBy: { $ne: socket.userId } },
            { $addToSet: { readBy: socket.userId } },
          ),
        ]);

        const updatedConversation = await Conversation.findById(conversationId)
          .populate("participants", conversationSelect)
          .populate("admins", conversationSelect)
          .populate("createdBy", conversationSelect);

        io.to(`user:${socket.userId}`).emit(
          "conversationUpdated",
          toConversationPayload(updatedConversation, socket.userId),
        );
      } catch (_error) {
        // Ignore read-state issues on reconnect.
      }
    });

    socket.on("sendMessage", async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId || "").trim();
        const text = String(payload?.text || "").trim();
        const mediaUrl = String(payload?.mediaUrl || "").trim();

        if (!conversationId) {
          throw new Error("conversationId is required");
        }

        if (!text && !mediaUrl) {
          throw new Error("Message text or mediaUrl is required");
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          throw new Error("Conversation not found or access denied");
        }

        const createdMessage = await Message.create({
          conversationId,
          senderId: socket.userId,
          text,
          mediaUrl,
          readBy: [socket.userId],
        });

        conversation.lastMessage = text || "Sent an attachment";
        updateUnreadCountsForMessage(conversation, socket.userId);
        await conversation.save();

        const hydratedMessage = await Message.findById(
          createdMessage._id,
        ).populate(
          "senderId",
          "name profileImage role isVerified specialization hospital experience",
        );

        io.to(String(conversationId)).emit("receiveMessage", {
          conversationId: String(conversationId),
          message: hydratedMessage,
        });

        const updatedConversation = await Conversation.findById(conversationId)
          .populate("participants", conversationSelect)
          .populate("admins", conversationSelect)
          .populate("createdBy", conversationSelect);

        conversationParticipantIds(updatedConversation).forEach(
          (participantId) => {
            io.to(`user:${participantId}`).emit(
              "conversationUpdated",
              toConversationPayload(updatedConversation, participantId),
            );
          },
        );

        const recipients = (conversation.participants || []).filter(
          (participantId) => String(participantId) !== String(socket.userId),
        );

        await Promise.all(
          recipients.map((recipientId) =>
            createNotification({
              userId: recipientId,
              type: "message",
              title: "New message",
              body: text || "You received a media message",
              referenceId: String(conversation._id),
              triggerUserId: socket.userId,
            }),
          ),
        );

        recipients.forEach((recipientId) => {
          io.to(`user:${String(recipientId)}`).emit("notification", {
            type: "message",
            conversationId: String(conversationId),
          });
        });

        if (typeof ack === "function") {
          ack({ success: true, data: hydratedMessage });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({
            success: false,
            message: error.message || "Failed to send message",
          });
        } else {
          socket.emit("socketError", {
            message: error.message || "Failed to send message",
          });
        }
      }
    });

    socket.on("disconnect", () => {
      socket.leave(`user:${socket.userId}`);
    });
  });

  return io;
};

module.exports = initializeSocket;
