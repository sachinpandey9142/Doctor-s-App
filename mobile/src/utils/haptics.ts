import * as Haptics from "expo-haptics";

/** Light tap — general UI interactions (search, filters, navigation) */
export const hapticTap = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
};

/** Medium impact — follow, apply, send button presses */
export const hapticMedium = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
};

/** Heavy impact — destructive or highly significant actions */
export const hapticHeavy = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => null);
};

/** Like / heart — selection feedback (distinct from impact) */
export const hapticLike = () => {
  Haptics.selectionAsync().catch(() => null);
};

/** Success — post sent, applied, account created */
export const hapticSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
};

/** Warning — validation errors, empty fields */
export const hapticWarning = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
};

/** Error — network failure, rejected action */
export const hapticError = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => null);
};
