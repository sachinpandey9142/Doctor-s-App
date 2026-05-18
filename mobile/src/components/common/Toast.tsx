import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Layout,
  SlideInUp,
  SlideOutUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react-native";
import { useTheme } from "styled-components/native";

import { useToastStore, type ToastMessage, type ToastType } from "@/store/toastStore";

/* ─── Colour tokens per type (theme-aware) ─────────────────────────── */
function getToken(
  type: ToastType,
  theme: ReturnType<typeof useTheme>,
): { bg: string; border: string; icon: string } {
  const tokens: Record<ToastType, { bg: string; border: string; icon: string }> = {
    error: { bg: theme.colors.errorLight, border: theme.colors.error, icon: theme.colors.error },
    success: { bg: theme.colors.successLight, border: theme.colors.success, icon: theme.colors.success },
    info: { bg: theme.colors.primaryLight, border: theme.colors.primary, icon: theme.colors.primary },
  };
  return tokens[type];
}

function ToastIcon({ type, color }: { type: ToastType; color: string }) {
  const size = 18;
  switch (type) {
    case "error":   return <AlertCircle size={size} color={color} />;
    case "success": return <CheckCircle size={size} color={color} />;
    default:        return <Info size={size} color={color} />;
  }
}

function SingleToast({ toast }: { toast: ToastMessage }) {
  const dismiss = useToastStore((s) => s.dismissToast);
  const theme = useTheme();
  const t = getToken(toast.type, theme);

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(18).stiffness(200)}
      exiting={SlideOutUp.duration(200)}
      layout={Layout.springify()}
      style={[
        styles.toast,
        {
          backgroundColor: t.bg,
          borderColor: t.border,
          shadowColor: theme.shadow.card.shadowColor,
        },
      ]}
    >
      <ToastIcon type={toast.type} color={t.icon} />

      <Text
        style={[styles.message, { color: theme.colors.textPrimary }]}
        numberOfLines={3}
      >
        {toast.message}
      </Text>

      <Pressable
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => dismiss(toast.id)}
        style={styles.closeButton}
      >
        <X size={14} color={theme.colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Render this once at the root of the app (inside SafeAreaProvider).
 * It reads from toastStore and renders animated toasts at the top of the screen.
 */
export function Toast() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.container, { top: insets.top + 8, paddingHorizontal: 16 }]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <SingleToast key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  message: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
  },
});
