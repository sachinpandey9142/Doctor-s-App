import { useEffect, useRef } from "react";

import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  setReconnectCallback,
  type ReceiveMessagePayload
} from "@/services/socket/socketClient";

/**
 * Manages the app-wide Socket.IO connection lifecycle:
 * - Connects when the user is logged in (has a token)
 * - Disconnects on logout
 * - On reconnect: refetches conversations so the list stays fresh
 * - Registers the receiveMessage listener for real-time chat
 */
export const useSocketChat = () => {
  const token = useAuthStore((state) => state.token);
  const appendIncomingMessage = useChatStore((state) => state.appendIncomingMessage);
  const fetchConversations = useChatStore((state) => state.fetchConversations);

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

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      const activeSocket = getSocket();
      activeSocket?.off("receiveMessage", handleReceiveMessage);
      setReconnectCallback(null);
    };
  }, [appendIncomingMessage, token]);
};
