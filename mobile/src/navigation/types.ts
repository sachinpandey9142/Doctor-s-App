import type { NavigatorScreenParams } from "@react-navigation/native";

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
  CreatePost: undefined;
  Discover: undefined;
  CreateGroup: undefined;
  UserProfile: {
    userId: string;
  };
  Followers: {
    userId: string;
    title?: string;
  };
  GroupMembers: {
    conversationId: string;
  };
  Comments: {
    postId: string;
    title?: string;
  };
  ChatScreen: {
    conversationId: string;
    title?: string;
    avatarUri?: string;
    isGroup?: boolean;
    groupName?: string;
    groupImage?: string;
  };
  Notifications: undefined;
};
