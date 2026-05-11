import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Cross, Lock, Mail, ShieldCheck } from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

import { AnimatedButton } from "@/components/common/AnimatedButton";
import { FloatingInput } from "@/components/common/FloatingInput";
import { loginRequest } from "@/services/api/authApi";
import { useAuthStore } from "@/store/authStore";
import { hapticSuccess, hapticWarning } from "@/utils/haptics";
import type { AuthStackParamList } from "@/navigation/types";

export function LoginScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, "Login">>();
  const setSession = useAuthStore((state) => state.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Detect dark mode via background color token
  const isDark = theme.colors.background !== "#F8FAFC";

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password");
      hapticWarning();
      return;
    }
    try {
      setLoading(true);
      setError("");
      const result = await loginRequest({ email, password });
      await setSession(result);
      hapticSuccess();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "Unable to sign in. Please try again.");
      hapticWarning();
    } finally {
      setLoading(false);
    }
  };

  // ── Theme-derived design tokens ──────────────────────────────────────────────
  const bgColors: [string, string, string] = isDark
    ? ["#0B1120", "#0F172A", "#111827"]
    : ["#EFF6FF", "#F8FAFC", "#F0FDFA"];

  const cardBg = isDark ? "#111827" : theme.colors.surface;
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : theme.colors.cardBorder;
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : theme.colors.surface;
  const inputBorder = isDark ? "rgba(255,255,255,0.10)" : theme.colors.border;
  const iconWrapBg = isDark
    ? "rgba(59,130,246,0.16)"
    : theme.colors.primaryLight;
  const trustBg = isDark ? "rgba(34,197,94,0.10)" : theme.colors.successLight;
  const trustBorder = isDark ? "rgba(34,197,94,0.25)" : "#BBF7D0";

  return (
    <LinearGradient colors={bgColors} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Hero ─────────────────────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(0).duration(480).springify()}
            style={styles.hero}
          >
            {/* Medical cross icon */}
            <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
              <Cross size={28} color={theme.colors.primary} strokeWidth={2.5} />
            </View>

            <Text style={[styles.brand, { color: theme.colors.primary }]}>
              Doctor's App
            </Text>
            <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
              Welcome back,{"\n"}Doctor
            </Text>
            <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
              Sign in to your verified medical profile and connect with your
              clinical network.
            </Text>

            {/* Trust badge */}
            <View
              style={[
                styles.trustBadge,
                { backgroundColor: trustBg, borderColor: trustBorder },
              ]}
            >
              <ShieldCheck size={13} color={theme.colors.success} />
              <Text style={[styles.trustText, { color: theme.colors.success }]}>
                HIPAA-aware · End-to-end encrypted
              </Text>
            </View>
          </Animated.View>

          {/* ── Form Card ──────────────────────────────────────────────── */}
          <Animated.View
            entering={FadeInUp.delay(120).duration(480).springify()}
            style={[
              styles.formCard,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                // Dark mode uses blue-tinted glow; light mode uses neutral shadow
                shadowColor: isDark ? "#2563EB" : "#0F172A",
                shadowOpacity: isDark ? 0.18 : 0.08,
                shadowRadius: isDark ? 32 : 16,
                elevation: isDark ? 10 : 4,
              },
            ]}
          >
            {/* Top accent gradient line */}
            <LinearGradient
              colors={["#2563EB", "#06B6D4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentLine}
            />

            <View style={styles.formInner}>
              <Text style={[styles.formTitle, { color: theme.colors.textPrimary }]}>
                Sign In
              </Text>

              {/* ── Inputs ── */}
              <View style={styles.inputsWrap}>
                <View
                  style={[
                    styles.inputFrame,
                    { backgroundColor: inputBg, borderColor: inputBorder },
                  ]}
                >
                  <FloatingInput
                    label="Email address"
                    value={email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={setEmail}
                    leftIcon={
                      <Mail size={18} color={theme.colors.textTertiary} />
                    }
                  />
                </View>

                <View
                  style={[
                    styles.inputFrame,
                    styles.inputFrameGap,
                    { backgroundColor: inputBg, borderColor: inputBorder },
                  ]}
                >
                  <FloatingInput
                    label="Password"
                    value={password}
                    secureTextEntry
                    onChangeText={setPassword}
                    leftIcon={
                      <Lock size={18} color={theme.colors.textTertiary} />
                    }
                  />
                </View>
              </View>

              {error ? (
                <Animated.View
                  entering={FadeInDown.duration(240)}
                  style={[
                    styles.errorWrap,
                    {
                      backgroundColor: isDark
                        ? "rgba(239,68,68,0.10)"
                        : theme.colors.errorLight,
                      borderColor: isDark ? "rgba(248,113,113,0.3)" : "#FCA5A5",
                    },
                  ]}
                >
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {error}
                  </Text>
                </Animated.View>
              ) : null}

              {/* ── Actions ── */}
              <AnimatedButton
                title="Sign In"
                loading={loading}
                onPress={handleLogin}
                style={styles.primaryButton}
              />

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: cardBorder }]} />
                <Text style={[styles.dividerText, { color: theme.colors.textTertiary }]}>
                  or
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: cardBorder }]} />
              </View>

              <AnimatedButton
                title="Create New Account"
                variant="ghost"
                onPress={() => navigation.navigate("Signup")}
              />
            </View>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(220).duration(400)}
            style={[styles.footer, { color: theme.colors.textTertiary }]}
          >
            For verified medical professionals only
          </Animated.Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 40,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    marginBottom: 28,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  brand: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  heroTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  heroSub: {
    marginTop: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 320,
  },
  trustBadge: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  trustText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // ── Form Card ─────────────────────────────────────────────────────────────
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
  },
  accentLine: {
    height: 2.5,
    width: "100%",
  },
  formInner: {
    padding: 22,
  },
  formTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 20,
  },

  // ── Inputs ────────────────────────────────────────────────────────────────
  inputsWrap: { gap: 0 },
  inputFrame: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  inputFrameGap: { marginTop: 12 },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorWrap: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  errorText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  primaryButton: {
    marginTop: 20,
    marginBottom: 6,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    marginTop: 22,
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
