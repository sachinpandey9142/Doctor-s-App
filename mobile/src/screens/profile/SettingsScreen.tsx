import React, { useLayoutEffect } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import {
  ChevronLeft,
  ChevronRight,
  MoonStar,
  Bell,
  Lock,
  User,
  LogOut,
  Info
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/navigation/types";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";

interface RowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, iconBg, title, subtitle, rightElement, onPress, danger }: RowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !rightElement}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.colors.borderLight },
        pressed && onPress ? { backgroundColor: theme.colors.background } : {}
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: danger ? "#EF4444" : theme.colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {rightElement ?? (onPress ? <ChevronRight size={16} color={theme.colors.textTertiary} strokeWidth={2} /> : null)}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>{title}</Text>
  );
}

export function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const setDarkMode = useThemeStore((state) => state.setDarkMode);
  const logout = useAuthStore((s) => s.logout);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleDarkMode = async (value: boolean) => {
    await setDarkMode(value);
  };

  const handleLogout = () => {
    Alert.alert(
      "Log out",
      "You will need to sign in again to continue.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log out", style: "destructive", onPress: () => { void logout(); } }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75 }]}
        >
          <ChevronLeft size={22} color={theme.colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Profile Settings */}
        <SectionHeader title="PROFILE" />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <SettingRow
            icon={<User size={16} color="#2563EB" strokeWidth={2} />}
            iconBg="#EFF6FF"
            title="Edit Profile"
            subtitle="Update your name, photo and specialization"
            onPress={() => navigation.navigate("Profile" as never)}
          />
          <SettingRow
            icon={<Info size={16} color="#7C3AED" strokeWidth={2} />}
            iconBg="#F5F3FF"
            title="About Me"
            subtitle="Hospital, experience, bio"
            onPress={() => navigation.navigate("Profile" as never)}
          />
        </View>

        {/* Privacy */}
        <SectionHeader title="PRIVACY" />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <SettingRow
            icon={<Lock size={16} color="#0891B2" strokeWidth={2} />}
            iconBg="#ECFEFF"
            title="Who can message me"
            subtitle="Everyone"
            onPress={() => {}}
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <SettingRow
            icon={<Bell size={16} color="#D97706" strokeWidth={2} />}
            iconBg="#FFFBEB"
            title="Push Notifications"
            subtitle="Likes, comments, follows, jobs"
            rightElement={
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryMid }}
                thumbColor={theme.colors.surface}
              />
            }
          />
        </View>

        {/* Appearance */}
        <SectionHeader title="APPEARANCE" />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <SettingRow
            icon={<MoonStar size={16} color="#1E3A8A" strokeWidth={2} />}
            iconBg="#EFF6FF"
            title="Dark Mode"
            subtitle="Apply a dark theme across the app"
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={(v) => { void handleDarkMode(v); }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryMid }}
                thumbColor={isDarkMode ? theme.colors.surface : "#F8FAFC"}
              />
            }
          />
        </View>

        {/* Logout */}
        <SectionHeader title="ACCOUNT" />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: "#FEE2E2" }]}>
          <SettingRow
            icon={<LogOut size={16} color="#EF4444" strokeWidth={2} />}
            iconBg="#FEF2F2"
            title="Log Out"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            danger
          />
        </View>

        <Text style={[styles.version, { color: theme.colors.textTertiary }]}>Doctor's App • v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40
  },
  sectionHeader: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  rowBody: {
    flex: 1,
    paddingRight: 8
  },
  rowTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15
  },
  rowSubtitle: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17
  },
  version: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    textAlign: "center",
    marginTop: 28
  }
});