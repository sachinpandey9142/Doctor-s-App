import { useEffect, useRef } from "react";

import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  setReconnectCallback,
  type ReceiveMessagePayload,
  type ConversationUpdatedPayload,
} from "@/services/socket/socketClient";
import type { Conversation } from "@/types/models";

/**
 * Manages the app-wide Socket.IO connection lifecycle:
 * - Connects when the user is logged in (has a token)
 * - Disconnects on logout
 * - On reconnect: refetches conversations so the list stays fresh
 * - Registers the receiveMessage listener for real-time chat
 */
export const useSocketChat = () => {
  const token = useAuthStore((state) => state.token);
  const appendIncomingMessage = useChatStore(
    (state) => state.appendIncomingMessage,
  );
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const upsertConversation = useChatStore((state) => state.upsertConversation);
  const removeConversation = useChatStore((state) => state.removeConversation);

  // Use a ref so the reconnect callback can always access the latest fetchConversations
  // without re-registering the socket listener on every render
  const fetchConversationsRef = useRef(fetchConversations);
  fetchConversationsRef.current = fetchConversations;

  useEffect(() => {
    if (!token) {
      setReconnectCallback(null);
      disconnectSocket();
      return;
    }

    const socket = connectSocket(token);

    // On reconnect: refresh conversation list to pick up any missed messages
    setReconnectCallback(() => {
      void fetchConversationsRef.current();
    });

    const handleReceiveMessage = (payload: ReceiveMessagePayload) => {
      appendIncomingMessage(payload);
    };

    const handleConversationUpdated = (
      conversation: ConversationUpdatedPayload | Conversation,
    ) => {
      upsertConversation(conversation);
    };

    const handleConversationRemoved = ({
      conversationId,
    }: {
      conversationId: string;
    }) => {
      removeConversation(conversationId);
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("conversationUpdated", handleConversationUpdated);
    socket.on("conversationRemoved", handleConversationRemoved);

    return () => {
      const activeSocket = getSocket();
      activeSocket?.off("receiveMessage", handleReceiveMessage);
      activeSocket?.off("conversationUpdated", handleConversationUpdated);
      activeSocket?.off("conversationRemoved", handleConversationRemoved);
      setReconnectCallback(null);
    };
  }, [appendIncomingMessage, removeConversation, token, upsertConversation]);
};
