import React from "react";
import { Text } from "react-native";
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
  Search,
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
import { FollowersScreen } from "@/screens/profile/FollowersScreen";
import { CreateGroupScreen } from "@/screens/chat/CreateGroupScreen";
import { GroupMembersScreen } from "@/screens/chat/GroupMembersScreen";
import { JobsScreen } from "@/screens/jobs/JobsScreen";
import { ChatListScreen } from "@/screens/chat/ChatListScreen";
import { ChatScreen } from "@/screens/chat/ChatScreen";
import { NotificationsScreen } from "@/screens/notifications/NotificationsScreen";
import { SearchScreen } from "@/screens/discovery/SearchScreen";
import { CommentsScreen } from "@/screens/feed/CommentsScreen";

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
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          height: 72,
          paddingTop: 10,
          paddingBottom: 10,
          borderTopWidth: 0,
          backgroundColor: "rgba(255,255,255,0.95)",
        },
        tabBarLabel: ({ color, focused }) => (
          <Text
            style={{
              color,
              fontFamily: focused ? "Manrope_700Bold" : "Manrope_500Medium",
              fontSize: 11,
              marginTop: 4,
            }}
          >
            {route.name.replace("Feed", "")}
          </Text>
        ),
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case "HomeFeed":
              return <House color={color} size={size} />;
            case "CaseDiscussion":
              return <ClipboardPlus color={color} size={size} />;
            case "Jobs":
              return <Briefcase color={color} size={size} />;
            case "ChatList":
              return <MessageCircleMore color={color} size={size} />;
            default:
              return <UserRound color={color} size={size} />;
          }
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
      <MainTab.Screen name="Jobs" component={JobsScreen} />
      <MainTab.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: "Chats" }}
      />
      <MainTab.Screen name="Profile" component={ProfileScreen} />
    </MainTab.Navigator>
  );
}

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
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: "Create Post" }}
      />
      <RootStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ title: "New Group" }}
      />
      <RootStack.Screen
        name="Discover"
        component={SearchScreen}
        options={{
          title: "Discover",
          headerRight: () => <Search size={18} color={theme.colors.primary} />,
        }}
      />
      <RootStack.Screen
        name="UserProfile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
      <RootStack.Screen
        name="Followers"
        component={FollowersScreen}
        options={{ title: "Followers" }}
      />
      <RootStack.Screen
        name="GroupMembers"
        component={GroupMembersScreen}
        options={{ title: "Group Members" }}
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
