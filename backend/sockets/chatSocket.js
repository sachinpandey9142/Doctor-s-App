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
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Track connected users: userId -> Set of socketIds
  const connectedUsers = new Map();
  // Track typing states: conversationId -> Set of userIds
  const typingUsers = new Map();

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

  io.on("connection", async (socket) => {
    socket.join(`user:${socket.userId}`);

    // Track connection
    if (!connectedUsers.has(socket.userId)) {
      connectedUsers.set(socket.userId, new Set());
    }
    connectedUsers.get(socket.userId).add(socket.id);

    // If this is their first connection, mark online
    if (connectedUsers.get(socket.userId).size === 1) {
      await User.findByIdAndUpdate(socket.userId, { isOnline: true });
      io.emit("userStatusChanged", {
        userId: socket.userId,
        isOnline: true,
        lastSeen: null,
      });
    }

    socket.on("joinPoll", ({ postId }) => {
      if (postId) {
        socket.join(`poll:${postId}`);
      }
    });

    socket.on("leavePoll", ({ postId }) => {
      if (postId) {
        socket.leave(`poll:${postId}`);
      }
    });

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

    socket.on("leaveConversation", async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          return;
        }

        socket.leave(String(conversationId));
      } catch (_error) {
        // Ignore transient leave errors.
      }
    });

    socket.on("typing", async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) return;

        if (!typingUsers.has(conversationId)) {
          typingUsers.set(conversationId, new Set());
        }
        typingUsers.get(conversationId).add(socket.userId);

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

        if (!conversation) return;

        if (typingUsers.has(conversationId)) {
          typingUsers.get(conversationId).delete(socket.userId);
          if (typingUsers.get(conversationId).size === 0) {
            typingUsers.delete(conversationId);
          }
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

        if (!conversation) return;

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
        
        // Notify others in the conversation that messages were read
        socket.to(String(conversationId)).emit("messagesRead", {
          conversationId: String(conversationId),
          userId: socket.userId,
        });
      } catch (_error) {
        // Ignore read-state issues on reconnect.
      }
    });

    socket.on("sendMessage", async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId || "").trim();
        const text = String(payload?.text || "").trim();
        const mediaUrl = String(payload?.mediaUrl || "").trim();
        const tempId = String(payload?.tempId || "").trim();

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
          tempId,
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

    socket.on("toggleMessageReaction", async (payload, ack) => {
      try {
        const { messageId, reaction = "heart" } = payload;
        if (!messageId) throw new Error("messageId is required");

        const message = await Message.findById(messageId);
        if (!message) throw new Error("Message not found");

        const currentReactions = message.reactions || new Map();
        
        // Remove user from all other reactions
        for (const [key, usersArray] of currentReactions.entries()) {
          if (key !== reaction) {
            const filtered = usersArray.filter(id => String(id) !== String(socket.userId));
            if (filtered.length === 0) {
              currentReactions.delete(key);
            } else {
              currentReactions.set(key, filtered);
            }
          }
        }

        const users = currentReactions.get(reaction) || [];
        const userIndex = users.findIndex(id => String(id) === String(socket.userId));

        if (userIndex > -1) {
          users.splice(userIndex, 1);
        } else {
          users.push(socket.userId);
        }

        if (users.length === 0) {
          currentReactions.delete(reaction);
        } else {
          currentReactions.set(reaction, users);
        }

        message.reactions = currentReactions;
        await message.save();

        io.to(String(message.conversationId)).emit("messageReactionUpdated", {
          conversationId: String(message.conversationId),
          messageId: String(messageId),
          reactions: currentReactions,
        });

        if (typeof ack === "function") ack({ success: true });
      } catch (error) {
        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        } else {
          socket.emit("socketError", { message: error.message || "Failed to toggle reaction" });
        }
      }
    });

    socket.on("toggleMuteConversation", async ({ conversationId }, ack) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) throw new Error("Conversation not found");

        const mutedBy = conversation.mutedBy || [];
        const isMuted = mutedBy.includes(socket.userId);

        if (isMuted) {
          conversation.mutedBy = mutedBy.filter((id) => String(id) !== String(socket.userId));
        } else {
          conversation.mutedBy.push(socket.userId);
        }

        await conversation.save();

        const updatedConversation = await Conversation.findById(conversationId)
          .populate("participants", conversationSelect)
          .populate("admins", conversationSelect)
          .populate("createdBy", conversationSelect);

        io.to(`user:${socket.userId}`).emit(
          "conversationUpdated",
          toConversationPayload(updatedConversation, socket.userId),
        );

        if (typeof ack === "function") ack({ success: true, isMuted: !isMuted });
      } catch (error) {
        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        } else {
          socket.emit("socketError", { message: error.message || "Failed to toggle mute" });
        }
      }
    });

    socket.on("disconnect", async () => {
      socket.leave(`user:${socket.userId}`);
      
      const userSockets = connectedUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        if (userSockets.size === 0) {
          connectedUsers.delete(socket.userId);
          const lastSeen = new Date();
          await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen });
          
          io.emit("userStatusChanged", {
            userId: socket.userId,
            isOnline: false,
            lastSeen,
          });

          // Cleanup typing states
          for (const [convId, users] of typingUsers.entries()) {
            if (users.has(socket.userId)) {
              users.delete(socket.userId);
              if (users.size === 0) typingUsers.delete(convId);
              io.to(convId).emit("userTypingStopped", {
                conversationId: convId,
                senderId: socket.userId,
                isGroup: false, // fallback, not perfect but stops it
              });
            }
          }
        }
      }
    });
  });

  return io;
};

module.exports = initializeSocket;
