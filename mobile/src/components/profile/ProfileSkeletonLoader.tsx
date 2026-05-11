import React from "react";
import { StyleSheet, View } from "react-native";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { useTheme } from "styled-components/native";

/**
 * ProfileSkeletonLoader
 *
 * Structured shimmer skeleton that mirrors the exact layout of the
 * profile screen while content is loading. Uses the existing
 * LoadingSkeleton shimmer component.
 */
export function ProfileSkeletonLoader() {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Banner */}
      <LoadingSkeleton height={110} borderRadius={0} />

      {/* Avatar + info row */}
      <View style={styles.heroRow}>
        {/* Avatar circle */}
        <LoadingSkeleton width={98} height={98} borderRadius={49} />

        {/* Info lines */}
        <View style={styles.infoLines}>
          <LoadingSkeleton height={18} width="70%" borderRadius={8} />
          <View style={{ height: 6 }} />
          <LoadingSkeleton height={12} width="45%" borderRadius={6} />
          <View style={{ height: 5 }} />
          <LoadingSkeleton height={11} width="60%" borderRadius={5} />
          <View style={{ height: 8 }} />
          <LoadingSkeleton height={10} width="35%" borderRadius={5} />
        </View>

        {/* Reputation widget placeholder */}
        <LoadingSkeleton width={100} height={96} borderRadius={16} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.statCell}>
            <LoadingSkeleton height={22} width={32} borderRadius={6} />
            <View style={{ height: 5 }} />
            <LoadingSkeleton height={10} width={48} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.buttonsRow}>
        <LoadingSkeleton height={46} width="47%" borderRadius={14} />
        <LoadingSkeleton height={46} width="47%" borderRadius={14} />
      </View>

      {/* Memories row */}
      <View style={styles.memoriesSection}>
        <View style={styles.memoriesHeader}>
          <LoadingSkeleton height={15} width={90} borderRadius={6} />
          <LoadingSkeleton height={12} width={48} borderRadius={5} />
        </View>
        <View style={styles.memoriesCards}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.memoryItem}>
              <LoadingSkeleton width={152} height={152} borderRadius={20} />
              <View style={{ height: 8 }} />
              <LoadingSkeleton height={12} width={88} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>

      {/* Tab bar placeholder */}
      <LoadingSkeleton height={48} borderRadius={0} />

      {/* Grid placeholder */}
      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <LoadingSkeleton
            key={i}
            width="32.5%"
            height={120}
            borderRadius={4}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  infoLines: {
    flex: 1,
    paddingTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    overflow: "hidden",
    height: 62,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    justifyContent: "space-between",
  },
  memoriesSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  memoriesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  memoriesCards: {
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
  },
  memoryItem: {
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    padding: 2,
  },
});
