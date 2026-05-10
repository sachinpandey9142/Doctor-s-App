import { io, type Socket } from "socket.io-client";

import { SOCKET_BASE_URL } from "@/constants/config";
import type { Message } from "@/types/models";

let socket: Socket | null = null;

// Called after a reconnect to resync active conversation state.
// Stored here so useSocketChat can register/unregister it without
// causing import cycles between the hook and the store.
let onReconnectCallback: (() => void) | null = null;

export const setReconnectCallback = (cb: (() => void) | null) => {
  onReconnectCallback = cb;
};

export const connectSocket = (token: string): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  // Disconnect any existing disconnected socket before creating a fresh one
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_BASE_URL, {
    transports: ["websocket"],
    auth: { token },
    // Reconnection config: retry up to 5 times, with exponential back-off
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  socket.on("reconnect", () => {
    // After a successful reconnect, refetch messages for the active conversation
    onReconnectCallback?.();
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export interface ReceiveMessagePayload {
  conversationId: string;
  message: Message;
}

export type ConversationUpdatedPayload = import("@/types/models").Conversation;
