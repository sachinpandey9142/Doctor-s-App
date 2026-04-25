import * as Haptics from "expo-haptics";

export const hapticTap = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
};

export const hapticSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
};

export const hapticWarning = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
};
