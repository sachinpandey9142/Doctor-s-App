import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import {
  MessageCircleMore,
  UserCheck,
  UserPlus,
  ShieldCheck,
  UserCog,
} from "lucide-react-native";
import { useTheme } from "styled-components/native";

import { AnimatedButton } from "@/components/common/AnimatedButton";

interface ProfileActionButtonsProps {
  isCurrentUser: boolean;
  isAdmin: boolean;
  isFollowing: boolean;
  relationshipBusy: boolean;
  messageBusy: boolean;
  onFollowToggle: () => void;
  onMessage: () => void;
  onEditProfile: () => void;
  onOpenAdminPanel: () => void;
}

export const ProfileActionButtons = memo(function ProfileActionButtons({
  isCurrentUser,
  isAdmin,
  isFollowing,
  relationshipBusy,
  messageBusy,
  onFollowToggle,
  onMessage,
  onEditProfile,
  onOpenAdminPanel,
}: ProfileActionButtonsProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {!isCurrentUser ? (
        <>
          <AnimatedButton
            title={isFollowing ? "Following" : "Follow"}
            variant={isFollowing ? "secondary" : "primary"}
            loading={relationshipBusy}
            onPress={onFollowToggle}
            icon={
              isFollowing ? (
                <UserCheck size={15} color={theme.colors.primary} />
              ) : (
                <UserPlus size={15} color="#FFFFFF" />
              )
            }
            style={styles.primaryBtn}
          />
          <AnimatedButton
            title="Message"
            variant="secondary"
            loading={messageBusy}
            onPress={onMessage}
            icon={
              <MessageCircleMore size={15} color={theme.colors.primary} />
            }
            style={styles.secondaryBtn}
          />
        </>
      ) : (
        <>
          <AnimatedButton
            title="Edit Profile"
            variant="primary"
            onPress={onEditProfile}
            icon={<UserCog size={15} color="#FFFFFF" />}
            style={styles.primaryBtn}
          />
          {isAdmin && (
            <AnimatedButton
              title="Admin Panel"
              variant="secondary"
              onPress={onOpenAdminPanel}
              icon={<ShieldCheck size={15} color={theme.colors.primary} />}
              style={styles.secondaryBtn}
            />
          )}
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 46,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 46,
  },
});
