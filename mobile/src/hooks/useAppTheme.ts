import { useTheme } from "styled-components/native";

import { useThemeStore } from "@/store/themeStore";

export function useAppTheme() {
  const theme = useTheme();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const setDarkMode = useThemeStore((state) => state.setDarkMode);
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);

  return {
    theme,
    colors: theme.colors,
    gradients: theme.gradients,
    isDarkMode,
    setDarkMode,
    toggleDarkMode
  };
}
