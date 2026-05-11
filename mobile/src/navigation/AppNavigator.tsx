import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";

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
import { MemoryCollectionScreen } from "@/screens/memories/MemoryCollectionScreen";
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

// ── Animated Tab Icon ─────────────────────────────────────────────────────────
function AnimatedTabIcon({
  focused,
  Icon,
  primaryColor,
  tertiaryColor,
}: {
  focused: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ComponentType<any>;
  primaryColor: string;
  tertiaryColor: string;
}) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const pillScale = useSharedValue(0);
  const pillOpacity = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      // Bounce on activation and float up slightly
      scale.value = withSpring(1.2, { damping: 12, stiffness: 300, mass: 0.8 });
      translateY.value = withSpring(-4, { damping: 12, stiffness: 300 });
      // Pill fades in
      pillScale.value = withSpring(1, { damping: 15, stiffness: 280 });
      pillOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.quad),
      });
    } else {
      scale.value = withTiming(1, { duration: 160 });
      translateY.value = withTiming(0, { duration: 160 });
      pillScale.value = withTiming(0, { duration: 180 });
      pillOpacity.value = withTiming(0, { duration: 160 });
    }
  }, [focused, scale, translateY, pillScale, pillOpacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: pillScale.value }],
    opacity: pillOpacity.value,
  }));

  return (
    <View style={tabStyles.iconWrap}>
      {/* Active pill indicator */}
      <Animated.View
        style={[
          tabStyles.activePill,
          { backgroundColor: primaryColor + "18" },
          pillStyle,
        ]}
      />
      <Animated.View style={iconStyle}>
        <Icon
          color={focused ? primaryColor : tertiaryColor}
          size={22}
          strokeWidth={focused ? 2.5 : 1.8}
        />
      </Animated.View>
    </View>
  );
}

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
          fontSize: 9.5,
          marginTop: -2,
          marginBottom: Platform.OS === "ios" ? 0 : 2,
        },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 88 : 70,
          paddingTop: 7,
          paddingBottom: Platform.OS === "ios" ? 24 : 9,
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderLight,
          backgroundColor: theme.colors.surface,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.07,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarIcon: ({ focused }) => {
          let Icon: React.ComponentType<any>;
          switch (route.name) {
            case "HomeFeed":
              Icon = House;
              break;
            case "CaseDiscussion":
              Icon = ClipboardPlus;
              break;
            case "ChatList":
              Icon = MessageCircleMore;
              break;
            case "Jobs":
              Icon = Briefcase;
              break;
            default:
              Icon = UserRound;
          }
          return (
            <AnimatedTabIcon
              focused={focused}
              Icon={Icon}
              primaryColor={theme.colors.primary}
              tertiaryColor={theme.colors.textTertiary}
            />
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
    width: 44,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activePill: {
    position: "absolute",
    width: 44,
    height: 28,
    borderRadius: 14,
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
        name="MemoryCollection"
        component={MemoryCollectionScreen}
        options={{ title: "Memory" }}
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
