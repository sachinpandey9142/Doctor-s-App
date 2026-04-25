import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Cross, ShieldCheck } from "lucide-react-native";

import { AnimatedButton } from "@/components/common/AnimatedButton";
import { FloatingInput } from "@/components/common/FloatingInput";
import { GlassCard } from "@/components/common/GlassCard";
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

  return (
    <LinearGradient colors={["#EFF6FF", "#F8FAFC", "#F0FDFA"]} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* ── Hero Section ─────────────────────────────────────────── */}
          <View style={styles.hero}>
            {/* Medical cross icon */}
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
              <Cross size={28} color={theme.colors.primary} strokeWidth={2.5} />
            </View>

            <Text style={[styles.brand, { color: theme.colors.primary }]}>Doctor's App</Text>
            <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
              Welcome back, Doctor
            </Text>
            <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
              Sign in to your verified medical profile and connect with your clinical network.
            </Text>

            {/* Trust badge */}
            <View style={[styles.trustBadge, { backgroundColor: theme.colors.successLight, borderColor: "#BBF7D0" }]}>
              <ShieldCheck size={14} color={theme.colors.success} />
              <Text style={[styles.trustText, { color: theme.colors.success }]}>
                HIPAA-aware · End-to-end encrypted
              </Text>
            </View>
          </View>

          {/* ── Form Card ────────────────────────────────────────────── */}
          <GlassCard style={styles.formCard}>
            <Text style={[styles.formTitle, { color: theme.colors.textPrimary }]}>Sign In</Text>

            <View style={styles.inputsWrap}>
              <FloatingInput
                label="Email address"
                value={email}
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={setEmail}
              />

              <FloatingInput
                label="Password"
                value={password}
                secureTextEntry
                onChangeText={setPassword}
                containerStyle={styles.inputGap}
              />
            </View>

            {error ? (
              <View style={[styles.errorWrap, { backgroundColor: theme.colors.errorLight, borderColor: "#FCA5A5" }]}>
                <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
              </View>
            ) : null}

            <AnimatedButton
              title="Sign In"
              loading={loading}
              onPress={handleLogin}
              style={styles.primaryButton}
            />

            <AnimatedButton
              title="Create New Account"
              variant="ghost"
              onPress={() => navigation.navigate("Signup")}
            />
          </GlassCard>

          <Text style={[styles.footer, { color: theme.colors.textTertiary }]}>
            For verified medical professionals only
          </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 32
  },
  // ── Hero
  hero: {
    marginBottom: 24,
    alignItems: "flex-start"
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  brand: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8
  },
  heroTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 32,
    lineHeight: 40
  },
  heroSub: {
    marginTop: 10,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24
  },
  trustBadge: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  trustText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 0.3
  },
  // ── Form
  formCard: {
    // GlassCard handles its own padding
  },
  formTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    marginBottom: 16
  },
  inputsWrap: {
    gap: 0
  },
  inputGap: {
    marginTop: 12
  },
  errorWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  errorText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13
  },
  primaryButton: {
    marginTop: 18,
    marginBottom: 10
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    letterSpacing: 0.3
  }
});
