import type { Conversation, ResolvedPeerIdentity, User } from "@/types/models";

/**
 * Centralized identity resolution logic for conversations.
 * Ensures the current user is correctly excluded and derives a consistent,
 * reliable ResolvedPeerIdentity object for direct messaging screens.
 */
export function resolveConversationPeer(
  conversation: Partial<Conversation> | null | undefined,
  currentUserId?: string | null,
): ResolvedPeerIdentity | undefined {
  if (!conversation || conversation.isGroup) {
    return undefined;
  }

  const participants = conversation.participants || [];
  if (participants.length === 0) {
    return undefined;
  }

  const cleanUserId = currentUserId ? String(currentUserId).trim() : "";

  // 1. Find the first participant that is NOT the current user
  let peerUser = participants.find(
    (p) => p && p._id && cleanUserId ? String(p._id) !== cleanUserId : false,
  );

  // 2. If cleanUserId is missing or no peer found, fallback to finding any participant that is not the first one if possible
  if (!peerUser && participants.length > 1) {
    peerUser = participants.find(
      (p) => p && p._id && cleanUserId ? String(p._id) !== cleanUserId : true,
    );
  }

  // 3. Fallback: if participants array only contains current user (e.g. notes to self), use current user
  if (!peerUser && participants.length > 0) {
    peerUser = participants[0];
  }

  if (!peerUser) {
    return undefined;
  }

  const displayName = peerUser.name || "";
  const username = peerUser.email
    ? peerUser.email.split("@")[0]
    : displayName.toLowerCase().replace(/\s+/g, "") || "user";

  return {
    id: peerUser._id,
    displayName,
    username,
    profileImage: peerUser.profileImage || "",
    isOnline: Boolean(peerUser.isOnline),
    lastSeen: peerUser.lastSeen,
    isVerified: Boolean(peerUser.isVerified),
    role: peerUser.role || "other",
    specialization: peerUser.specialization || "",
  };
}

/**
 * Attaches a resolved peer identity to a single conversation object.
 */
export function attachPeerToConversation(
  conversation: Conversation,
  currentUserId?: string | null,
): Conversation {
  if (!conversation) return conversation;
  const peer = resolveConversationPeer(conversation, currentUserId);
  return {
    ...conversation,
    peer,
  };
}

/**
 * Attaches resolved peer identities to an array of conversation objects.
 */
export function attachPeerToConversations(
  conversations: Conversation[],
  currentUserId?: string | null,
): Conversation[] {
  if (!conversations || !Array.isArray(conversations)) return [];
  return conversations.map((conv) =>
    attachPeerToConversation(conv, currentUserId),
  );
}
