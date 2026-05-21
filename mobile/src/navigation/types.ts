import type { NavigatorScreenParams } from "@react-navigation/native";
import type { Post } from "@/types/models";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  HomeFeed: undefined;
  CaseDiscussion: undefined;
  Jobs: undefined;
  ChatList: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  AdminPanel: undefined;
  Settings: undefined;
  CreatePost: undefined;
  AddStory: undefined;
  StoryViewer: {
    userId: string;
    storyId?: string;
  };
  MemoryCollection: {
    collectionId: string;
    title?: string;
    userId?: string;
  };
  Discover: undefined;
  Followers: {
    userId: string;
    kind: "followers" | "following";
  };
  Following: {
    userId: string;
    kind: "followers" | "following";
  };
  UserProfile: {
    userId: string;
  };
  ChatScreen: {
    conversationId: string;
    title?: string;
  };
  NewChatScreen: undefined;
  CreateGroupScreen:
    | {
        groupId?: string;
        existingMemberIds?: string[];
        title?: string;
      }
    | undefined;
  GroupMembersScreen: {
    conversationId: string;
    title?: string;
  };
  CaseDiscussionThread: {
    conversationId: string;
    title?: string;
    caseAuthor?: string;
    caseSnippet?: string;
  };
  CaseDetail: {
    post: Post;
  };
  Notifications: undefined;
};
