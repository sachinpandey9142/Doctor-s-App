import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ImageIcon, MapPin, User, FileText, AlignLeft, IndianRupee, Calendar, Sparkles } from "lucide-react-native";

interface AttachmentBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onSelectOption: (option: string) => void;
}

export function AttachmentBottomSheet({
  bottomSheetRef,
  onClose,
  onSelectOption,
}: AttachmentBottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Adjusted height for a grid of 5 items
  const snapPoints = useMemo(() => [260], []);

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

  const ATTACHMENT_OPTIONS = [
    { id: "gallery", label: "Gallery", icon: ImageIcon, color: "#3B82F6" },
    { id: "location", label: "Location", icon: MapPin, color: "#10B981" },
    { id: "contact", label: "Contact", icon: User, color: "#0EA5E9" },
    { id: "document", label: "Document", icon: FileText, color: "#8B5CF6" },
    { id: "poll", label: "Poll", icon: AlignLeft, color: "#F59E0B" },
  ];

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
        <View style={styles.grid}>
          {ATTACHMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <View key={option.id} style={styles.gridItem}>
                <Pressable
                  onPress={() => {
                    onSelectOption(option.id);
                    bottomSheetRef.current?.close();
                  }}
                  style={({ pressed }) => [
                    styles.iconWrapper,
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <Icon size={26} color={option.color} />
                </Pressable>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                  {option.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  gridItem: {
    width: "25%",
    alignItems: "center",
    marginBottom: 24,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
});
