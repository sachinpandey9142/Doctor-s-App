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
  UserProfile: {
    userId: string;
  };
  Comments: {
    postId: string;
    title?: string;
  };
  ChatScreen: {
    conversationId: string;
    title?: string;
  };
  Notifications: undefined;
};
