import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  type Theme as NavigationTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Bell,
  Briefcase,
  ClipboardPlus,
  House,
  MessageCircleMore,
  UserRound,
} from "lucide-react-native";
import { useTheme } from "styled-components/native";

import { useAuthStore } from "@/store/authStore";
import { useSocketChat } from "@/hooks/useSocketChat";
import type {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from "@/navigation/types";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { SignupScreen } from "@/screens/auth/SignupScreen";
import { HomeFeedScreen } from "@/screens/feed/HomeFeedScreen";
import { CaseDiscussionScreen } from "@/screens/feed/CaseDiscussionScreen";
import { CreatePostScreen } from "@/screens/feed/CreatePostScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { AddStoryScreen } from "@/screens/stories/AddStoryScreen";
import { StoryViewerScreen } from "@/screens/stories/StoryViewerScreen";
import { JobsScreen } from "@/screens/jobs/JobsScreen";
import { ChatListScreen } from "@/screens/chat/ChatListScreen";
import { ChatScreen } from "@/screens/chat/ChatScreen";
import { CreateGroupScreen } from "@/screens/chat/CreateGroupScreen";
import { GroupMembersScreen } from "@/screens/chat/GroupMembersScreen";
import { NotificationsScreen } from "@/screens/notifications/NotificationsScreen";
import { SearchScreen } from "@/screens/discovery/SearchScreen";
import { CommentsScreen } from "@/screens/feed/CommentsScreen";
import { AdminPanelScreen } from "@/screens/admin/AdminPanelScreen";
import { CaseDiscussionThreadScreen } from "@/screens/feed/CaseDiscussionThreadScreen";
import { CaseDetailScreen } from "@/screens/feed/CaseDetailScreen";
import { SettingsScreen } from "@/screens/profile/SettingsScreen";
import { FollowersScreen } from "@/screens/profile/FollowersScreen";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabsNavigator() {
  const theme = useTheme();

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarLabelStyle: {
          fontFamily: "Manrope_700Bold",
          fontSize: 10,
          marginTop: -2,
          marginBottom: Platform.OS === "ios" ? 0 : 2,
        },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 90 : 72,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 26 : 10,
          borderTopWidth: 0,
          backgroundColor: theme.colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 16,
        },
        tabBarIcon: ({ focused }) => {
          const iconSize = 22;
          let Icon: React.ReactNode;
          switch (route.name) {
            case "HomeFeed":
              Icon = (
                <House
                  color={
                    focused ? theme.colors.primary : theme.colors.textTertiary
                  }
                  size={iconSize}
                  strokeWidth={focused ? 2.5 : 1.8}
                />
              );
              break;
            case "CaseDiscussion":
              Icon = (
                <ClipboardPlus
                  color={
                    focused ? theme.colors.primary : theme.colors.textTertiary
                  }
                  size={iconSize}
                  strokeWidth={focused ? 2.5 : 1.8}
                />
              );
              break;
            case "ChatList":
              Icon = (
                <MessageCircleMore
                  color={
                    focused ? theme.colors.primary : theme.colors.textTertiary
                  }
                  size={iconSize}
                  strokeWidth={focused ? 2.5 : 1.8}
                />
              );
              break;
            case "Jobs":
              Icon = (
                <Briefcase
                  color={
                    focused ? theme.colors.primary : theme.colors.textTertiary
                  }
                  size={iconSize}
                  strokeWidth={focused ? 2.5 : 1.8}
                />
              );
              break;
            default:
              Icon = (
                <UserRound
                  color={
                    focused ? theme.colors.primary : theme.colors.textTertiary
                  }
                  size={iconSize}
                  strokeWidth={focused ? 2.5 : 1.8}
                />
              );
          }
          return (
            <View
              style={[
                tabStyles.iconWrap,
                focused && { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              {Icon}
            </View>
          );
        },
      })}
    >
      <MainTab.Screen
        name="HomeFeed"
        component={HomeFeedScreen}
        options={{ title: "Home" }}
      />
      <MainTab.Screen
        name="CaseDiscussion"
        component={CaseDiscussionScreen}
        options={{ title: "Cases" }}
      />
      <MainTab.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: "Chats" }}
      />
      <MainTab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{ title: "Jobs" }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </MainTab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    width: 46,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

function MainStackNavigator() {
  const theme = useTheme();

  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTitleStyle: {
          fontFamily: "SpaceGrotesk_700Bold",
          color: theme.colors.textPrimary,
          fontSize: 18,
        },
        animation: "slide_from_right",
      }}
    >
      <RootStack.Screen
        name="MainTabs"
        component={MainTabsNavigator}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="AdminPanel"
        component={AdminPanelScreen}
        options={{ title: "Admin Dashboard" }}
      />
      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: "Create Post" }}
      />
      <RootStack.Screen
        name="AddStory"
        component={AddStoryScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="StoryViewer"
        component={StoryViewerScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Discover"
        component={SearchScreen}
        options={{ title: "Discover" }}
      />
      <RootStack.Screen
        name="Followers"
        component={FollowersScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Following"
        component={FollowersScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="UserProfile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
      <RootStack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{ title: "Discussion" }}
      />
      <RootStack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ title: "Conversation" }}
      />
      <RootStack.Screen
        name="CreateGroupScreen"
        component={CreateGroupScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="GroupMembersScreen"
        component={GroupMembersScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="CaseDiscussionThread"
        component={CaseDiscussionThreadScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="CaseDetail"
        component={CaseDetailScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: "Notifications",
          headerRight: () => <Bell size={18} color={theme.colors.primary} />,
        }}
      />
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  const token = useAuthStore((state) => state.token);
  const theme = useTheme();

  useSocketChat();

  const navigationTheme: NavigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      primary: theme.colors.primary,
      border: theme.colors.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      {token ? <MainStackNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
