import { create } from "zustand";

import {
  createConversationRequest,
  getConversationsRequest,
  getMessagesRequest,
  sendMessageRequest,
  joinCaseChatRequest
} from "@/services/api/chatApi";
import { useToastStore, extractErrorMessage } from "@/store/toastStore";
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
  fetchConversations: () => Promise<void>;
  openOrCreateConversation: (participantId: string) => Promise<Conversation>;
  joinCaseDiscussion: (postId: string) => Promise<Conversation>;
  fetchMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, text?: string, mediaUrl?: string) => Promise<void>;
  appendIncomingMessage: (payload: ReceiveMessagePayload) => void;
}

const sortConversations = (items: Conversation[]) =>
  [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

const mergeMessages = (existing: Message[], incoming: Message[]): Message[] => {
  const byId = new Map<string, Message>();
  [...incoming, ...existing].forEach((m) => byId.set(m._id, m));
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  paginationByConversation: {},
  loadingConversations: false,
  loadingMessages: false,

  fetchConversations: async () => {
    set({ loadingConversations: true });

    try {
      const conversations = await getConversationsRequest();
      set({
        conversations: sortConversations(conversations),
        loadingConversations: false
      });
    } catch (error) {
      set({ loadingConversations: false });
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to load conversations"), "error");
    }
  },

  openOrCreateConversation: async (participantId) => {
    const conversation = await createConversationRequest(participantId);

    set((state) => {
      const exists = state.conversations.find((item) => item._id === conversation._id);
      const merged = exists
        ? state.conversations.map((item) => (item._id === conversation._id ? conversation : item))
        : [conversation, ...state.conversations];

      return { conversations: sortConversations(merged) };
    });

    return conversation;
  },
  
  joinCaseDiscussion: async (postId) => {
    const conversation = await joinCaseChatRequest(postId);

    set((state) => {
      const exists = state.conversations.find((item) => item._id === conversation._id);
      const merged = exists
        ? state.conversations.map((item) => (item._id === conversation._id ? conversation : item))
        : [conversation, ...state.conversations];

      return { conversations: sortConversations(merged) };
    });

    return conversation;
  },

  fetchMessages: async (conversationId) => {
    set({ loadingMessages: true });

    try {
      const response = await getMessagesRequest(conversationId, 1, MESSAGES_PER_PAGE);

      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: response.data
        },
        paginationByConversation: {
          ...state.paginationByConversation,
          [conversationId]: {
            page: 1,
            hasMore: Number(response.pagination?.totalPages ?? 1) > 1,
            loading: false
          }
        },
        loadingMessages: false
      }));
    } catch (error) {
      set({ loadingMessages: false });
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to load messages"), "error");
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
        [conversationId]: { ...pagination, loading: true }
      }
    }));

    try {
      const response = await getMessagesRequest(conversationId, nextPage, MESSAGES_PER_PAGE);

      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: mergeMessages(
            state.messagesByConversation[conversationId] || [],
            response.data
          )
        },
        paginationByConversation: {
          ...state.paginationByConversation,
          [conversationId]: {
            page: nextPage,
            hasMore: nextPage < Number(response.pagination?.totalPages ?? 1),
            loading: false
          }
        }
      }));
    } catch (error) {
      // Restore previous pagination state so the user can retry
      set((state) => ({
        paginationByConversation: {
          ...state.paginationByConversation,
          [conversationId]: { ...pagination, loading: false }
        }
      }));
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to load older messages"), "error");
    }
  },

  sendMessage: async (conversationId, text, mediaUrl) => {
    const message = await sendMessageRequest({ conversationId, text, mediaUrl });

    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: mergeMessages(state.messagesByConversation[conversationId] || [], [message])
      },
      conversations: sortConversations(
        state.conversations.map((conversation) =>
          conversation._id === conversationId
            ? {
                ...conversation,
                lastMessage: message.text || "Sent an attachment",
                updatedAt: message.createdAt
              }
            : conversation
        )
      )
    }));
  },

  appendIncomingMessage: ({ conversationId, message }) => {
    set((state) => {
      const currentMessages = state.messagesByConversation[conversationId] || [];
      const exists = currentMessages.some((item) => item._id === message._id);

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: exists ? currentMessages : [...currentMessages, message]
        },
        conversations: sortConversations(
          state.conversations.map((conversation) =>
            conversation._id === conversationId
              ? {
                  ...conversation,
                  lastMessage: message.text || "Sent an attachment",
                  updatedAt: message.createdAt
                }
              : conversation
          )
        )
      };
    });
  }
}));
