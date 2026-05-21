import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Copy, Forward, Reply, Trash2, Plus } from "lucide-react-native";
import type { Message } from "@/types/models";

interface MessageContextMenuProps {
  message: Message | null;
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onReact: (messageId: string, reaction: string) => void;
  onReply: (message: Message) => void;
  onCopy: (message: Message) => void;
  onForward: (message: Message) => void;
  onDelete: (message: Message) => void;
  currentUserId?: string;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function MessageContextMenu({
  message,
  bottomSheetRef,
  onClose,
  onReact,
  onReply,
  onCopy,
  onForward,
  onDelete,
  currentUserId,
}: MessageContextMenuProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => [320], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  if (!message) {
    // We still render the BottomSheet so it can animate out, but its contents will be empty.
  }

  const isMine = message?.senderId?._id === currentUserId;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleSheetChanges}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {message && (
          <>
            <View style={styles.reactionRow}>
              {REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={({ pressed }) => [
                    styles.reactionBtn,
                    pressed && { backgroundColor: theme.colors.surfaceMuted },
                  ]}
                  onPress={() => {
                    onReact(message._id, emoji);
                    bottomSheetRef.current?.close();
                  }}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
              <Pressable
                style={({ pressed }) => [
                  styles.reactionBtn,
                  { backgroundColor: theme.colors.surfaceMuted },
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => {
                  bottomSheetRef.current?.close();
                }}
              >
                <Plus size={22} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.actionsList}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && { backgroundColor: theme.colors.surfaceMuted },
                ]}
                onPress={() => {
                  onReply(message);
                  bottomSheetRef.current?.close();
                }}
              >
                <Reply size={22} color={theme.colors.textPrimary} />
                <Text style={[styles.actionText, { color: theme.colors.textPrimary }]}>
                  Reply
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && { backgroundColor: theme.colors.surfaceMuted },
                ]}
                onPress={() => {
                  onCopy(message);
                  bottomSheetRef.current?.close();
                }}
              >
                <Copy size={22} color={theme.colors.textPrimary} />
                <Text style={[styles.actionText, { color: theme.colors.textPrimary }]}>
                  Copy
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && { backgroundColor: theme.colors.surfaceMuted },
                ]}
                onPress={() => {
                  onForward(message);
                  bottomSheetRef.current?.close();
                }}
              >
                <Forward size={22} color={theme.colors.textPrimary} />
                <Text style={[styles.actionText, { color: theme.colors.textPrimary }]}>
                  Forward
                </Text>
              </Pressable>

              {isMine && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed && { backgroundColor: theme.colors.surfaceMuted },
                  ]}
                  onPress={() => {
                    onDelete(message);
                    bottomSheetRef.current?.close();
                  }}
                >
                  <Trash2 size={22} color={theme.colors.error} />
                  <Text style={[styles.actionText, { color: theme.colors.error }]}>
                    Delete
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  reactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  reactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionEmoji: {
    fontSize: 24,
  },
  actionsList: {
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 16,
    marginLeft: 16,
  },
});
