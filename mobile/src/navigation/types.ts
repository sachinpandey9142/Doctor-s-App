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
