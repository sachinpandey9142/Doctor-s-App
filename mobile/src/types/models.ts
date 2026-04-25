export type MedicalRole =
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
  role: MedicalRole;
  specialization: string;
  hospital: string;
  experience: number;
  isVerified: boolean;
  reputationScore: number;
  profileImage: string;
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

export interface Comment {
  _id: string;
  postId: string;
  userId: User;
  text: string;
  createdAt: string;
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
  lastMessage: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User;
  text: string;
  mediaUrl: string;
  createdAt: string;
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
