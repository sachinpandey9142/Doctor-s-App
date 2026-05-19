import { create } from "zustand";

import {
  createConversationRequest,
  createGroupConversationRequest,
  getConversationsRequest,
  getMessagesRequest,
  sendMessageRequest,
  joinCaseChatRequest,
  getConversationRequest,
} from "@/services/api/chatApi";
import { useToastStore, extractErrorMessage } from "@/store/toastStore";
import { getSocket } from "@/services/socket/socketClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/store/authStore";
import {
  attachPeerToConversation,
  attachPeerToConversations,
} from "@/utils/identityResolver";
import type { ReceiveMessagePayload } from "@/services/socket/socketClient";
import type { Conversation, Message } from "@/types/models";

const MESSAGES_PER_PAGE = 40;

interface ConversationPagination {
  page: number;
  hasMore: boolean;
  loading: boolean;
}

interface ChatState {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  paginationByConversation: Record<string, ConversationPagination>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  loadingHeadersByConversation: Record<string, boolean>;
  drafts: Record<string, string>;
  isHydrated: boolean;
  hydrateDrafts: () => Promise<void>;
  setDraft: (conversationId: string, text: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
  openOrCreateConversation: (participantId: string) => Promise<Conversation>;
  createGroupConversation: (payload: {
    name: string;
    memberIds: string[];
    image?: string;
  }) => Promise<Conversation>;
  joinCaseDiscussion: (postId: string) => Promise<Conversation>;
  getConversation: (conversationId: string) => Promise<Conversation>;
  fetchMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    text?: string,
    mediaUrl?: string,
  ) => Promise<void>;
  resendMessage: (conversationId: string, tempId: string) => Promise<void>;
  resendAllFailedMessages: () => Promise<void>;
  removeFailedMessage: (conversationId: string, tempId: string) => void;
  toggleMessageReaction: (
    conversationId: string,
    messageId: string,
    reaction: string,
  ) => void;
  updateMessageReactions: (
    conversationId: string,
    messageId: string,
    reactions: Record<string, string[]>,
  ) => void;
  appendIncomingMessage: (payload: ReceiveMessagePayload) => void;
  upsertConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  updateUserStatus: (payload: {
    userId: string;
    isOnline: boolean;
    lastSeen: string | null;
  }) => void;
  markConversationMessagesRead: (
    conversationId: string,
    userId: string,
  ) => void;
}

const sortConversations = (items: Conversation[]) =>
  [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

const mergeMessages = (existing: Message[], incoming: Message[]): Message[] => {
  const byId = new Map<string, Message>();
  [...incoming, ...existing].forEach((m) => {
    if (!m || !m._id || !m.senderId) {
      return;
    }

    byId.set(m._id, m);
  });
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  paginationByConversation: {},
  loadingConversations: false,
  loadingMessages: false,
  loadingHeadersByConversation: {},
  drafts: {},
  isHydrated: false,

  hydrateDrafts: async () => {
    try {
      const stored = await AsyncStorage.getItem("doctors-app-chat-drafts");
      if (stored) {
        set({ drafts: JSON.parse(stored), isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  setDraft: async (conversationId: string, text: string) => {
    set((state) => {
      const newDrafts = { ...state.drafts };
      if (!text.trim()) {
        delete newDrafts[conversationId];
      } else {
        newDrafts[conversationId] = text;
      }
      AsyncStorage.setItem(
        "doctors-app-chat-drafts",
        JSON.stringify(newDrafts),
      ).catch(() => {});
      return { drafts: newDrafts };
    });
  },

  fetchConversations: async () => {
    set({ loadingConversations: true });

    try {
      const conversations = await getConversationsRequest();
      set({
        conversations: sortConversations(
          attachPeerToConversations(
            conversations,
            useAuthStore.getState().user?._id,
          ),
        ),
        loadingConversations: false,
      });
    } catch (error) {
      set({ loadingConversations: false });
      useToastStore
        .getState()
        .showToast(
          extractErrorMessage(error, "Failed to load conversations"),
          "error",
        );
    }
  },

  openOrCreateConversation: async (participantId) => {
    const raw = await createConversationRequest(participantId);
    const conversation = attachPeerToConversation(
      raw,
      useAuthStore.getState().user?._id,
    );

    set((state) => {
      const exists = state.conversations.find(
        (item) => item._id === conversation._id,
      );
      const merged = exists
        ? state.conversations.map((item) =>
            item._id === conversation._id ? conversation : item,
          )
        : [conversation, ...state.conversations];

      return { conversations: sortConversations(merged) };
    });

    return conversation;
  },

  createGroupConversation: async (payload) => {
    const raw = await createGroupConversationRequest(payload);
    const conversation = attachPeerToConversation(
      raw,
      useAuthStore.getState().user?._id,
    );

    set((state) => {
      const exists = state.conversations.find(
        (item) => item._id === conversation._id,
      );
      const merged = exists
        ? state.conversations.map((item) =>
            item._id === conversation._id ? conversation : item,
          )
        : [conversation, ...state.conversations];

      return { conversations: sortConversations(merged) };
    });

    return conversation;
  },

  joinCaseDiscussion: async (postId) => {
    const raw = await joinCaseChatRequest(postId);
    const conversation = attachPeerToConversation(
      raw,
      useAuthStore.getState().user?._id,
    );

    set((state) => {
      const exists = state.conversations.find(
        (item) => item._id === conversation._id,
      );
      const merged = exists
        ? state.conversations.map((item) =>
            item._id === conversation._id ? conversation : item,
          )
        : [conversation, ...state.conversations];

      return { conversations: sortConversations(merged) };
    });

    return conversation;
  },

  getConversation: async (conversationId) => {
    set((state) => ({
      loadingHeadersByConversation: {
        ...state.loadingHeadersByConversation,
        [conversationId]: true,
      },
    }));
    try {
      const raw = await getConversationRequest(conversationId);
      const conversation = attachPeerToConversation(
        raw,
        useAuthStore.getState().user?._id,
      );
      set((state) => {
        const exists = state.conversations.some(
          (item) => item._id === conversation._id,
        );
        const merged = exists
          ? state.conversations.map((item) =>
              item._id === conversation._id ? conversation : item,
            )
          : [conversation, ...state.conversations];

        return {
          conversations: sortConversations(merged),
          loadingHeadersByConversation: {
            ...state.loadingHeadersByConversation,
            [conversationId]: false,
          },
        };
      });
      return conversation;
    } catch (error) {
      set((state) => ({
        loadingHeadersByConversation: {
          ...state.loadingHeadersByConversation,
          [conversationId]: false,
        },
      }));
      throw error;
    }
  },

  fetchMessages: async (conversationId) => {
    set({ loadingMessages: true });

    try {
      const response = await getMessagesRequest(
        conversationId,
        1,
        MESSAGES_PER_PAGE,
      );

      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: response.data,
        },
        paginationByConversation: {
          ...state.paginationByConversation,
          [conversationId]: {
            page: 1,
            hasMore: Number(response.pagination?.totalPages ?? 1) > 1,
            loading: false,
          },
        },
        loadingMessages: false,
      }));
    } catch (error) {
      set({ loadingMessages: false });
      useToastStore
        .getState()
        .showToast(
          extractErrorMessage(error, "Failed to load messages"),
          "error",
        );
    }
  },

  loadOlderMessages: async (conversationId) => {
    const pagination = get().paginationByConversation[conversationId];

    // Guard: don't double-load or load beyond what's available
    if (!pagination || !pagination.hasMore || pagination.loading) {
      return;
    }

    const nextPage = pagination.page + 1;

    // Mark as loading so the UI can show a spinner at the top
    set((state) => ({
      paginationByConversation: {
        ...state.paginationByConversation,
        [conversationId]: { ...pagination, loading: true },
      },
    }));

    try {
      const response = await getMessagesRequest(
        conversationId,
        nextPage,
        MESSAGES_PER_PAGE,
      );

      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: mergeMessages(
            state.messagesByConversation[conversationId] || [],
            response.data,
          ),
        },
        paginationByConversation: {
          ...state.paginationByConversation,
          [conversationId]: {
            page: nextPage,
            hasMore: nextPage < Number(response.pagination?.totalPages ?? 1),
            loading: false,
          },
        },
      }));
    } catch (error) {
      // Restore previous pagination state so the user can retry
      set((state) => ({
        paginationByConversation: {
          ...state.paginationByConversation,
          [conversationId]: { ...pagination, loading: false },
        },
      }));
      useToastStore
        .getState()
        .showToast(
          extractErrorMessage(error, "Failed to load older messages"),
          "error",
        );
    }
  },

  sendMessage: async (conversationId, text, mediaUrl) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const optimisticMessage: Message = {
      _id: tempId,
      tempId,
      conversationId,
      senderId: user,
      text: text || "",
      mediaUrl: mediaUrl || "",
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [
          optimisticMessage,
          ...(state.messagesByConversation[conversationId] || []),
        ].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ), // assuming reverse order
      },
      conversations: sortConversations(
        state.conversations.map((conversation) =>
          conversation._id === conversationId
            ? {
                ...conversation,
                lastMessage: text || "Sent an attachment",
                updatedAt: optimisticMessage.createdAt,
              }
            : conversation,
        ),
      ),
    }));

    try {
      const message = await sendMessageRequest({
        conversationId,
        text,
        mediaUrl,
        tempId,
      });

      set((state) => {
        const currentMessages =
          state.messagesByConversation[conversationId] || [];
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: currentMessages.map((msg) =>
              msg._id === tempId ? { ...message, status: "sent" } : msg,
            ),
          },
        };
      });
    } catch (error) {
      set((state) => {
        const currentMessages =
          state.messagesByConversation[conversationId] || [];
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: currentMessages.map((msg) =>
              msg._id === tempId ? { ...msg, status: "failed" } : msg,
            ),
          },
        };
      });
      useToastStore
        .getState()
        .showToast("Failed to send message. Tap to retry.", "error");
    }
  },

  resendMessage: async (conversationId, tempId) => {
    const state = get();
    const currentMessages = state.messagesByConversation[conversationId] || [];
    const failedMsg = currentMessages.find((m) => m._id === tempId);
    if (!failedMsg || failedMsg.status !== "failed") return;

    set((state) => {
      const currentMessages =
        state.messagesByConversation[conversationId] || [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: currentMessages.map((msg) =>
            msg._id === tempId ? { ...msg, status: "pending" } : msg,
          ),
        },
      };
    });

    try {
      const message = await sendMessageRequest({
        conversationId,
        text: failedMsg.text,
        mediaUrl: failedMsg.mediaUrl,
        tempId,
      });

      set((state) => {
        const currentMessages =
          state.messagesByConversation[conversationId] || [];
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: currentMessages.map((msg) =>
              msg._id === tempId ? { ...message, status: "sent" } : msg,
            ),
          },
        };
      });
    } catch (error) {
      set((state) => {
        const currentMessages =
          state.messagesByConversation[conversationId] || [];
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: currentMessages.map((msg) =>
              msg._id === tempId ? { ...msg, status: "failed" } : msg,
            ),
          },
        };
      });
      useToastStore.getState().showToast("Message failed again.", "error");
    }
  },

  resendAllFailedMessages: async () => {
    const state = get();
    for (const [conversationId, messages] of Object.entries(
      state.messagesByConversation,
    )) {
      const failedMessages = messages.filter((m) => m.status === "failed");
      for (const failedMsg of failedMessages) {
        if (failedMsg.tempId) {
          await get().resendMessage(conversationId, failedMsg.tempId);
        }
      }
    }
  },

  removeFailedMessage: (conversationId, tempId) => {
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: (
          state.messagesByConversation[conversationId] || []
        ).filter((m) => m._id !== tempId),
      },
    }));
  },

  toggleMessageReaction: (conversationId, messageId, reaction) => {
    const socket = getSocket();
    if (!socket) return;

    // Optimistic Update
    set((state) => {
      const messages = state.messagesByConversation[conversationId] || [];
      const updatedMessages = messages.map((msg) => {
        if (msg._id !== messageId) return msg;

        const currentReactions = msg.reactions ? { ...msg.reactions } : {};
        const users = [...(currentReactions[reaction] || [])];
        const currentUserId = useAuthStore.getState().user?._id;

        if (!currentUserId) return msg;

        const userIndex = users.indexOf(currentUserId);
        if (userIndex > -1) {
          users.splice(userIndex, 1);
        } else {
          users.push(currentUserId);
        }

        if (users.length === 0) {
          delete currentReactions[reaction];
        } else {
          currentReactions[reaction] = users;
        }

        return { ...msg, reactions: currentReactions };
      });
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: updatedMessages,
        },
      };
    });

    socket.emit("toggleMessageReaction", { messageId, reaction });
  },

  updateMessageReactions: (conversationId, messageId, reactions) => {
    set((state) => {
      const messages = state.messagesByConversation[conversationId] || [];
      const exists = messages.some((m) => m?._id === messageId);
      if (!exists) return state;

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages.map((msg) =>
            msg?._id === messageId ? { ...msg, reactions } : msg,
          ),
        },
      };
    });
  },

  upsertConversation: (raw) => {
    const conversation = attachPeerToConversation(
      raw,
      useAuthStore.getState().user?._id,
    );
    set((state) => {
      const exists = state.conversations.some(
        (item) => item._id === conversation._id,
      );
      const merged = exists
        ? state.conversations.map((item) =>
            item._id === conversation._id ? conversation : item,
          )
        : [conversation, ...state.conversations];

      return { conversations: sortConversations(merged) };
    });
  },

  removeConversation: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.filter(
        (conversation) => conversation._id !== conversationId,
      ),
      messagesByConversation: Object.fromEntries(
        Object.entries(state.messagesByConversation).filter(
          ([key]) => key !== conversationId,
        ),
      ),
      paginationByConversation: Object.fromEntries(
        Object.entries(state.paginationByConversation).filter(
          ([key]) => key !== conversationId,
        ),
      ),
    }));
  },

  appendIncomingMessage: ({ conversationId, message }) => {
    if (!message || !message._id || !message.senderId) {
      return;
    }

    set((state) => {
      const currentMessages =
        state.messagesByConversation[conversationId] || [];
      const exists = currentMessages.some((item) => item?._id === message._id);

      let nextMessages = currentMessages;

      if (!exists) {
        // If it's our own message coming back via socket, it might have a tempId we can use to replace the pending one
        const tempIdExists =
          message.tempId &&
          currentMessages.some(
            (item) =>
              item?.tempId === message.tempId || item?._id === message.tempId,
          );

        if (tempIdExists) {
          nextMessages = currentMessages.map((item) =>
            item?.tempId === message.tempId || item?._id === message.tempId
              ? { ...message, status: "sent" }
              : item,
          );
        } else {
          nextMessages = [message, ...currentMessages];
        }
      }

      const nextConversations = state.conversations.map((conversation) =>
        conversation._id === conversationId
          ? {
              ...conversation,
              lastMessage: message.text || "Sent an attachment",
              updatedAt: message.createdAt,
              unreadCount: conversation.unreadCount ?? 0,
            }
          : conversation,
      );

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: nextMessages,
        },
        conversations: sortConversations(
          attachPeerToConversations(
            nextConversations,
            useAuthStore.getState().user?._id,
          ),
        ),
      };
    });
  },

  updateUserStatus: ({ userId, isOnline, lastSeen }) => {
    set((state) => {
      const nextConversations = state.conversations.map((conv) => {
        const isParticipant = conv.participants?.some((p) => p._id === userId);
        if (!isParticipant) return conv;

        return {
          ...conv,
          participants: conv.participants.map((p) =>
            p._id === userId
              ? { ...p, isOnline, lastSeen: lastSeen || undefined }
              : p,
          ),
        };
      });

      return {
        conversations: attachPeerToConversations(
          nextConversations,
          useAuthStore.getState().user?._id,
        ),
      };
    });
  },

  markConversationMessagesRead: (conversationId, userId) => {
    set((state) => {
      const currentMessages =
        state.messagesByConversation[conversationId] || [];
      const updatedMessages = currentMessages.map((msg) => {
        if (msg.senderId._id !== userId && !msg.readBy?.includes(userId)) {
          return { ...msg, readBy: [...(msg.readBy || []), userId] };
        }
        return msg;
      });

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: updatedMessages,
        },
      };
    });
  },
}));
