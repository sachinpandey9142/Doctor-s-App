export type MedicalRole =
  | "admin"
  | "doctor"
  | "nurse"
  | "lab-technician"
  | "medical-student"
  | "hospital-staff"
  | "other";

export interface User {
  _id: string;
  name: string;
  email: string;
  bio?: string;
  role: MedicalRole;
  specialization: string;
  hospital: string;
  experience: number;
  isVerified: boolean;
  isBlocked: boolean;
  idDocument: string;
  reputationScore: number;
  trustLevel?: string;
  categoryReputation?: Record<string, number>;
  isOnline?: boolean;
  lastSeen?: string;
  currentStreak?: number;
  longestStreak?: number;
  badgeCount?: number;
  trustSuppressed?: boolean;
  profileImage: string;
  coverImage?: string;
  followers: string[];
  following: string[];
  createdAt: string;
}

export interface Post {
  _id: string;
  userId: User;
  content: string;
  mediaUrl: string;
  type: "text" | "image" | "video" | "case";
  likes: string[];
  commentCount: number;
  symptoms?: string;
  observations?: string;
  reportImages?: string[];
  isAnonymous?: boolean;
  createdAt: string;
}

export interface PollOption {
  _id: string;
  label: string;
  voteCount: number;
  pct: number;
}

export interface DiagnosisPoll {
  _id: string;
  postId: string;
  options: PollOption[];
  totalVotes: number;
  isClosed: boolean;
  closesAt?: string | null;
  votedOptionId: string | null;
  updatedAt: string;
}

export interface Story {
  _id: string;
  userId: User;
  mediaUrl: string;
  type: "image" | "video";
  caption?: string;
  visibility: "followers" | "public";
  viewers: string[];
  expiresAt: string;
  createdAt: string;
  isSeen?: boolean;
  viewerCount?: number;
}

export interface StoryGroup {
  user: User;
  stories: Story[];
  latestStoryAt: string;
  hasUnseen: boolean;
}

export interface MemoryCollection {
  _id: string;
  userId: string;
  title: string;
  coverImage: string;
  visibility: "followers" | "public" | "private";
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  latestItemAt?: string;
}

export interface MemoryItem {
  _id: string;
  collectionId: string;
  storyId?: string | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  postId: string;
  userId: User;
  text: string;
  createdAt: string;
  // Threaded conversation support
  parentCommentId?: string | null;
  replyCount?: number;
  // UI state (not from API)
  likes?: string[];
  reactions?: Record<string, string[]>;
  // Replies array for threaded rendering
  replies?: Comment[];
  // Expanded state for UI
  isExpanded?: boolean;
}

export interface Job {
  _id: string;
  title: string;
  hospital: string;
  location: string;
  salary: string;
  description: string;
  createdBy: User;
  applicants: string[];
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  admins?: User[];
  createdBy?: User;
  lastMessage: string;
  updatedAt: string;
  isGroup?: boolean;
  title?: string;
  image?: string;
  postId?: string;
  unreadCount?: number;
  unreadCounts?: Record<string, number>;
  mutedBy?: string[];
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User;
  text: string;
  mediaUrl: string;
  createdAt: string;
  readBy?: string[];
  reactions?: Record<string, string[]>;
  tempId?: string;
  status?: "pending" | "sent" | "failed";
}

export interface NotificationItem {
  _id: string;
  userId: string;
  type: "message" | "like" | "comment" | "job" | "follow";
  title: string;
  body: string;
  referenceId: string;
  triggerUserId?: User;
  isRead: boolean;
  createdAt: string;
}
