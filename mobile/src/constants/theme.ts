export const theme = {
  colors: {
    // Core brand
    primary: "#2563EB",
    primaryLight: "#EFF6FF",
    primaryMid: "#BFDBFE",
    medicalBlue: "#3B82F6",

    // Accent
    teal: "#14B8A6",
    tealLight: "#CCFBF1",
    cyan: "#22D3EE",

    // Surfaces
    background: "#F1F5F9",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    cardBorder: "#E2E8F0",
    border: "#E2E8F0",
    borderLight: "#F1F5F9",

    // Text
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    textTertiary: "#94A3B8",
    textInverted: "#FFFFFF",

    // Semantic
    success: "#16A34A",
    successLight: "#DCFCE7",
    warning: "#D97706",
    warningLight: "#FEF3C7",
    error: "#DC2626",
    errorLight: "#FEE2E2",

    // Post type badge colors
    badgeCase: "#7C3AED",
    badgeCaseLight: "#EDE9FE",
    badgeImage: "#0891B2",
    badgeImageLight: "#CFFAFE",
    badgeVideo: "#DB2777",
    badgeVideoLight: "#FCE7F3",
    badgeText: "#16A34A",
    badgeTextLight: "#DCFCE7",

    // Dark
    darkBackground: "#0F172A"
  },

  gradients: {
    primary: ["#2563EB", "#06B6D4"] as const,
    primarySoft: ["#3B82F6", "#22D3EE"] as const,
    profile: ["#1D4ED8", "#0891B2"] as const,
    cardGlow: ["rgba(37,99,235,0.08)", "rgba(6,182,212,0.04)"] as const,
    sentBubble: ["#2563EB", "#1D4ED8"] as const
  },

  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 36
  },

  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 999
  },

  typography: {
    display: "SpaceGrotesk_700Bold",
    heading: "SpaceGrotesk_700Bold",
    body: "Manrope_500Medium",
    bodyBold: "Manrope_700Bold"
  },

  shadow: {
    // Used for cards — softer, more neutral
    card: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3
    },
    // Used for elevated cards, modals
    cardStrong: {
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.11,
      shadowRadius: 16,
      elevation: 6
    },
    // Used for FABs and CTAs
    floating: {
      shadowColor: "#2563EB",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 20,
      elevation: 10
    }
  }
};

export type AppTheme = typeof theme;
