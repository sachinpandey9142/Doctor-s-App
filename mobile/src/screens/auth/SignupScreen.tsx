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
import { Building2, CheckCircle, ImagePlus, Lock, Mail, Stethoscope, User, UserPlus } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { uploadImageRequest } from "@/services/api/uploadApi";

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
  const [idDocumentUri, setIdDocumentUri] = useState("");
  const [uploadedIdUrl, setUploadedIdUrl] = useState("");
  const [uploadingId, setUploadingId] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pickIdDocument = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      hapticWarning();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true
    });

    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;
      setIdDocumentUri(uri);
      setUploadedIdUrl("");
      setUploadingId(true);
      
      try {
        const cloudUrl = await uploadImageRequest(uri);
        setUploadedIdUrl(cloudUrl);
        hapticSuccess();
      } catch {
        setIdDocumentUri("");
        setUploadedIdUrl("");
        hapticWarning();
        setError("Failed to upload ID document. Please try again.");
      } finally {
        setUploadingId(false);
      }
    }
  };

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

    if (idDocumentUri && !uploadedIdUrl && !uploadingId) {
      setError("ID document upload failed or incomplete");
      hapticWarning();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await registerRequest({ 
        name, email, password, role, specialization, hospital, idDocument: uploadedIdUrl 
      });
      await setSession(result);
      hapticSuccess();
    } catch (requestError: any) {
      const apiError = requestError?.response?.data;
      const detail = apiError?.errors?.[0]?.message;
      setError(detail || apiError?.message || "Could not create your account");
      hapticWarning();
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme.colors.background !== "#F8FAFC";
  const bgColors: [string, string, string] = isDark
    ? ["#0B1120", "#0F172A", "#111827"]
    : ["#EEF2FF", "#F8FAFC", "#F0FDFA"];

  return (
    <LinearGradient colors={bgColors} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* ── Hero ─────────────────────────────────────────────────── */}
          <View style={styles.hero}>
            <View style={[styles.iconWrap, { backgroundColor: isDark ? "rgba(20,184,166,0.16)" : theme.colors.tealLight }]}>
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

            <FloatingInput 
              label="Full Name" 
              value={name} 
              onChangeText={setName} 
              leftIcon={<User size={20} color={theme.colors.textSecondary} />}
            />
            <FloatingInput
              label="Email address"
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
              containerStyle={styles.inputGap}
              leftIcon={<Mail size={20} color={theme.colors.textSecondary} />}
            />
            <FloatingInput
              label="Password"
              value={password}
              secureTextEntry
              onChangeText={setPassword}
              containerStyle={styles.inputGap}
              leftIcon={<Lock size={20} color={theme.colors.textSecondary} />}
            />
            <FloatingInput
              label="Specialization"
              value={specialization}
              onChangeText={setSpecialization}
              containerStyle={styles.inputGap}
              leftIcon={<Stethoscope size={20} color={theme.colors.textSecondary} />}
            />
            <FloatingInput
              label="Hospital / Institution"
              value={hospital}
              onChangeText={setHospital}
              containerStyle={styles.inputGap}
              leftIcon={<Building2 size={20} color={theme.colors.textSecondary} />}
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

            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              Verification (Optional)
            </Text>
            <Text style={[styles.helperText, { color: theme.colors.textTertiary, marginBottom: 12 }]}>
              Upload your medical ID or license to get verified. You have 24 hours to verify your account to post.
            </Text>
            
            <Pressable
              style={[styles.mediaPicker, { borderColor: uploadedIdUrl ? theme.colors.success : theme.colors.border }]}
              onPress={uploadingId ? undefined : pickIdDocument}
              disabled={uploadingId}
            >
              {uploadingId ? (
                <Text style={[styles.mediaText, { color: theme.colors.primary }]}>Uploading...</Text>
              ) : uploadedIdUrl ? (
                <>
                  <CheckCircle size={18} color={theme.colors.success} />
                  <Text style={[styles.mediaText, { color: theme.colors.textSecondary }]}>ID Uploaded ✓</Text>
                </>
              ) : (
                <>
                  <ImagePlus size={18} color={theme.colors.primary} />
                  <Text style={[styles.mediaText, { color: theme.colors.textSecondary }]}>Upload Medical ID</Text>
                </>
              )}
            </Pressable>

            {error ? (
              <View style={[styles.errorWrap, { backgroundColor: isDark ? "rgba(239,68,68,0.10)" : theme.colors.errorLight, borderColor: isDark ? "rgba(248,113,113,0.3)" : "#FCA5A5" }]}>
                <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
              </View>
            ) : null}

            <AnimatedButton
              title="Create Account"
              loading={loading || uploadingId}
              disabled={loading || uploadingId || (!!idDocumentUri && !uploadedIdUrl)}
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
  },
  helperText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18
  },
  mediaPicker: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  mediaText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13
  }
});
