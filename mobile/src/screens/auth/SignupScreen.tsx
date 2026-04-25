import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { UserPlus } from "lucide-react-native";

import { AnimatedButton } from "@/components/common/AnimatedButton";
import { FloatingInput } from "@/components/common/FloatingInput";
import { GlassCard } from "@/components/common/GlassCard";
import { registerRequest } from "@/services/api/authApi";
import { useAuthStore } from "@/store/authStore";
import { hapticSuccess, hapticWarning } from "@/utils/haptics";
import type { AuthStackParamList } from "@/navigation/types";
import type { MedicalRole } from "@/types/models";

const roles: MedicalRole[] = [
  "doctor",
  "nurse",
  "lab-technician",
  "medical-student",
  "hospital-staff",
  "other"
];

export function SignupScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, "Signup">>();
  const setSession = useAuthStore((state) => state.setSession);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [hospital, setHospital] = useState("");
  const [role, setRole] = useState<MedicalRole>("doctor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roleLabelMap = useMemo(
    () =>
      new Map<MedicalRole, string>([
        ["doctor", "Doctor"],
        ["nurse", "Nurse"],
        ["lab-technician", "Lab Tech"],
        ["medical-student", "Student"],
        ["hospital-staff", "Hospital Staff"],
        ["other", "Other"]
      ]),
    []
  );

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError("Name, email, and password are required");
      hapticWarning();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await registerRequest({ name, email, password, role, specialization, hospital });
      await setSession(result);
      hapticSuccess();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "Could not create your account");
      hapticWarning();
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#EEF2FF", "#F8FAFC", "#F0FDFA"]} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* ── Hero ─────────────────────────────────────────────────── */}
          <View style={styles.hero}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.tealLight }]}>
              <UserPlus size={28} color={theme.colors.teal} strokeWidth={2.5} />
            </View>
            <Text style={[styles.brand, { color: theme.colors.teal }]}>Doctor's App</Text>
            <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
              Create your verified profile
            </Text>
            <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
              Join thousands of verified medical professionals sharing clinical knowledge.
            </Text>
          </View>

          {/* ── Form Card ────────────────────────────────────────────── */}
          <GlassCard>
            <Text style={[styles.formTitle, { color: theme.colors.textPrimary }]}>Basic Details</Text>

            <FloatingInput label="Full Name" value={name} onChangeText={setName} />
            <FloatingInput
              label="Email address"
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
              containerStyle={styles.inputGap}
            />
            <FloatingInput
              label="Password"
              value={password}
              secureTextEntry
              onChangeText={setPassword}
              containerStyle={styles.inputGap}
            />
            <FloatingInput
              label="Specialization"
              value={specialization}
              onChangeText={setSpecialization}
              containerStyle={styles.inputGap}
            />
            <FloatingInput
              label="Hospital / Institution"
              value={hospital}
              onChangeText={setHospital}
              containerStyle={styles.inputGap}
            />

            {/* Role selector */}
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              I am a…
            </Text>
            <View style={styles.rolesWrap}>
              {roles.map((roleItem) => {
                const active = roleItem === role;

                return (
                  <Pressable
                    key={roleItem}
                    onPress={() => setRole(roleItem)}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.primaryLight,
                        borderColor: active ? theme.colors.primary : theme.colors.primaryMid
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        { color: active ? "#FFFFFF" : theme.colors.primary }
                      ]}
                    >
                      {roleLabelMap.get(roleItem)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <View style={[styles.errorWrap, { backgroundColor: theme.colors.errorLight, borderColor: "#FCA5A5" }]}>
                <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
              </View>
            ) : null}

            <AnimatedButton
              title="Create Account"
              loading={loading}
              onPress={handleSignup}
              style={styles.primaryButton}
            />
            <AnimatedButton
              title="Back to Sign In"
              variant="ghost"
              onPress={() => navigation.navigate("Login")}
            />
          </GlassCard>

          <Text style={[styles.footer, { color: theme.colors.textTertiary }]}>
            By signing up you agree to our Terms of Service
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
    paddingHorizontal: 20,
    paddingVertical: 32
  },
  // ── Hero
  hero: {
    marginBottom: 20
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
    fontSize: 28,
    lineHeight: 36
  },
  heroSub: {
    marginTop: 8,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22
  },
  // ── Form
  formTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    marginBottom: 14
  },
  inputGap: {
    marginTop: 12
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    fontFamily: "Manrope_700Bold",
    fontSize: 13
  },
  rolesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  roleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  roleChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 0.2
  },
  errorWrap: {
    marginTop: 14,
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
    letterSpacing: 0.2
  }
});
