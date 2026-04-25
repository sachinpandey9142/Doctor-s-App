import "react-native-reanimated";

import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "styled-components/native";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Manrope_500Medium,
  Manrope_700Bold
} from "@expo-google-fonts/manrope";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_700Bold
} from "@expo-google-fonts/space-grotesk";

import AppNavigator from "./src/navigation/AppNavigator";
import { theme } from "./src/constants/theme";
import { useAuthStore } from "./src/store/authStore";
import { Toast } from "./src/components/common/Toast";

SplashScreen.preventAutoHideAsync().catch(() => null);

export default function App() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_700Bold
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (fontsLoaded && isHydrated) {
      SplashScreen.hideAsync().catch(() => null);
    }
  }, [fontsLoaded, isHydrated]);

  if (!fontsLoaded || !isHydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider theme={theme}>
          <StatusBar style="dark" />
          <AppNavigator />
          {/* Global toast overlay — rendered above everything, respects safe area insets */}
          <Toast />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
