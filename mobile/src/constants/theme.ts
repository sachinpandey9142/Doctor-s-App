const baseGradients = {
  primary: ["#2563EB", "#06B6D4"] as const,
  primarySoft: ["#3B82F6", "#22D3EE"] as const,
  profile: ["#1D4ED8", "#0891B2"] as const,
  cardGlow: ["rgba(37,99,235,0.08)", "rgba(6,182,212,0.04)"] as const,
  sentBubble: ["#2563EB", "#1D4ED8"] as const
};

const baseSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36
};

const baseRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 20,
  xl: 24,
  pill: 999
};

const baseTypography = {
  display: "SpaceGrotesk_700Bold",
  heading: "SpaceGrotesk_700Bold",
  body: "Manrope_500Medium",
  bodyBold: "Manrope_700Bold"
};

const baseShadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  cardStrong: {
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 6
  },
  floating: {
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8
  }
};

export const lightTheme = {
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
    background: "#F8FAFC",
    backgroundAlt: "#F1F5F9",
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
  gradients: baseGradients,
  spacing: baseSpacing,
  radius: baseRadius,
  typography: baseTypography,
  shadow: baseShadow
};

export const darkTheme = {
  colors: {
    primary: "#60A5FA",
    primaryLight: "#172554",
    primaryMid: "#1D4ED8",
    medicalBlue: "#60A5FA",

    teal: "#2DD4BF",
    tealLight: "#0F766E",
    cyan: "#22D3EE",

    background: "#0B1120",
    backgroundAlt: "#111827",
    surface: "#111827",
    surfaceElevated: "#1F2937",
    cardBorder: "#243244",
    border: "#243244",
    borderLight: "#1F2A3D",

    textPrimary: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textTertiary: "#94A3B8",
    textInverted: "#0B1120",

    success: "#22C55E",
    successLight: "#14532D",
    warning: "#F59E0B",
    warningLight: "#78350F",
    error: "#F87171",
    errorLight: "#7F1D1D",

    badgeCase: "#A78BFA",
    badgeCaseLight: "#312E81",
    badgeImage: "#38BDF8",
    badgeImageLight: "#164E63",
    badgeVideo: "#F472B6",
    badgeVideoLight: "#831843",
    badgeText: "#4ADE80",
    badgeTextLight: "#14532D",

    darkBackground: "#0B1120"
  },
  gradients: baseGradients,
  spacing: baseSpacing,
  radius: baseRadius,
  typography: baseTypography,
  shadow: {
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 6
    },
    cardStrong: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.42,
      shadowRadius: 22,
      elevation: 10
    },
    floating: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
      elevation: 12
    }
  }
};

export const theme = lightTheme;

export type AppTheme = typeof lightTheme;
