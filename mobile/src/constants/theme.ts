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

export const lightTheme = {
  mode: "light",
  isDark: false,
  colors: {
    primary: "#2563EB",
    primaryLight: "#EFF6FF",
    primaryMid: "#BFDBFE",
    medicalBlue: "#3B82F6",
    accent: "#0EA5E9",
    accentSoft: "#E0F2FE",
    teal: "#14B8A6",
    tealLight: "#CCFBF1",
    cyan: "#22D3EE",

    background: "#F7FAFC",
    backgroundAlt: "#EEF4F8",
    surface: "#FFFFFF",
    surfaceMuted: "#F8FAFC",
    surfaceElevated: "#FFFFFF",
    card: "#FFFFFF",
    cardBorder: "#E2E8F0",
    border: "#DDE7F0",
    borderLight: "#EDF2F7",
    divider: "#E6EDF5",

    textPrimary: "#0F172A",
    textSecondary: "#526174",
    textTertiary: "#8491A3",
    textMuted: "#9AA7B6",
    textInverted: "#FFFFFF",
    icon: "#536579",
    iconMuted: "#94A3B8",

    inputBackground: "#FFFFFF",
    inputFocused: "#F8FBFF",
    placeholder: "#94A3B8",
    tabBar: "rgba(255,255,255,0.96)",
    tabBarBorder: "rgba(203,213,225,0.78)",
    header: "rgba(255,255,255,0.94)",
    headerBorder: "rgba(203,213,225,0.72)",
    composer: "rgba(255,255,255,0.95)",
    composerInput: "#F1F5F9",
    composerIcon: "#64748B",
    overlay: "rgba(15,23,42,0.36)",
    overlaySoft: "rgba(37,99,235,0.06)",
    backdrop: "rgba(15,23,42,0.24)",
    glow: "rgba(14,165,233,0.08)",
    glowSecondary: "rgba(20,184,166,0.05)",

    messageIncoming: "#FFFFFF",
    messageIncomingBorder: "#E2E8F0",
    messageIncomingText: "#102033",
    messageIncomingMeta: "#7C8A9B",
    messageOutgoing: "#2563EB",
    messageOutgoingText: "#FFFFFF",
    messageOutgoingMeta: "rgba(239,246,255,0.78)",
    reactionBackground: "#FFFFFF",
    reactionBorder: "#E2E8F0",

    success: "#16A34A",
    successLight: "#DCFCE7",
    warning: "#D97706",
    warningLight: "#FEF3C7",
    error: "#DC2626",
    errorLight: "#FEE2E2",

    badgeCase: "#7C3AED",
    badgeCaseLight: "#EDE9FE",
    badgeImage: "#0891B2",
    badgeImageLight: "#CFFAFE",
    badgeVideo: "#DB2777",
    badgeVideoLight: "#FCE7F3",
    badgeText: "#16A34A",
    badgeTextLight: "#DCFCE7",

    darkBackground: "#0F172A"
  },
  gradients: {
    primary: ["#2563EB", "#06B6D4"] as const,
    primarySoft: ["#DBEAFE", "#ECFEFF"] as const,
    profile: ["#2563EB", "#0EA5E9"] as const,
    cardGlow: ["rgba(37,99,235,0.06)", "rgba(20,184,166,0.03)"] as const,
    sentBubble: ["#2563EB", "#0891B2"] as const,
    appBackground: ["#F7FAFC", "#EDF7FF", "#F8FAFC"] as const,
    chatBackground: ["#F8FBFF", "#EEF7FF", "#F7FAFC"] as const,
    inactiveControl: ["#E2E8F0", "#E2E8F0"] as const,
    emptyIcon: ["rgba(219,234,254,0.95)", "rgba(224,242,254,0.85)"] as const
  },
  spacing: baseSpacing,
  radius: baseRadius,
  typography: baseTypography,
  shadow: {
    card: {
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3
    },
    cardStrong: {
      shadowColor: "#475569",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 7
    },
    floating: {
      shadowColor: "#2563EB",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 22,
      elevation: 8
    }
  }
} as const;

export const darkTheme = {
  mode: "dark",
  isDark: true,
  colors: {
    primary: "#60A5FA",
    primaryLight: "#1E3A5F",
    primaryMid: "#2563EB",
    medicalBlue: "#60A5FA",
    accent: "#38BDF8",
    accentSoft: "#0B2A44",
    teal: "#2DD4BF",
    tealLight: "#0F3D38",
    cyan: "#22D3EE",

    background: "#0B1120",
    backgroundAlt: "#111827",
    surface: "#111827",
    surfaceMuted: "#0F172A",
    surfaceElevated: "#1E293B",
    card: "#111827",
    cardBorder: "rgba(96,165,250,0.14)",
    border: "#243244",
    borderLight: "#1A2640",
    divider: "rgba(148,178,235,0.12)",

    textPrimary: "#F1F5F9",
    textSecondary: "#A5B4CC",
    textTertiary: "#718096",
    textMuted: "#64748B",
    textInverted: "#06101F",
    icon: "#DDE8FF",
    iconMuted: "rgba(174,190,219,0.84)",

    inputBackground: "rgba(6,14,28,0.78)",
    inputFocused: "rgba(16,31,61,0.86)",
    placeholder: "rgba(148,163,184,0.68)",
    tabBar: "rgba(15,27,52,0.94)",
    tabBarBorder: "rgba(96,165,250,0.12)",
    header: "rgba(8,17,34,0.78)",
    headerBorder: "rgba(96,165,250,0.14)",
    composer: "rgba(15,27,52,0.82)",
    composerInput: "rgba(6,14,28,0.78)",
    composerIcon: "rgba(221,232,255,0.86)",
    overlay: "rgba(0,0,0,0.48)",
    overlaySoft: "rgba(37,99,235,0.22)",
    backdrop: "rgba(2,6,23,0.62)",
    glow: "rgba(37,99,235,0.12)",
    glowSecondary: "rgba(34,211,238,0.06)",

    messageIncoming: "rgba(24,36,62,0.96)",
    messageIncomingBorder: "rgba(148,178,235,0.12)",
    messageIncomingText: "#EAF2FF",
    messageIncomingMeta: "rgba(148,163,184,0.58)",
    messageOutgoing: "#2563EB",
    messageOutgoingText: "#FFFFFF",
    messageOutgoingMeta: "rgba(219,234,254,0.62)",
    reactionBackground: "#111827",
    reactionBorder: "rgba(148,178,235,0.18)",

    success: "#4ADE80",
    successLight: "#052E16",
    warning: "#FBBF24",
    warningLight: "#451A03",
    error: "#F87171",
    errorLight: "#450A0A",

    badgeCase: "#C4B5FD",
    badgeCaseLight: "#1E1042",
    badgeImage: "#7DD3FC",
    badgeImageLight: "#0C2A40",
    badgeVideo: "#F9A8D4",
    badgeVideoLight: "#2D0B1E",
    badgeText: "#86EFAC",
    badgeTextLight: "#052E16",

    darkBackground: "#0B1120"
  },
  gradients: {
    primary: ["#3B82F6", "#22D3EE"] as const,
    primarySoft: ["#1E3A5F", "#0F3D56"] as const,
    profile: ["#1D4ED8", "#0891B2"] as const,
    cardGlow: ["rgba(37,99,235,0.12)", "rgba(6,182,212,0.05)"] as const,
    sentBubble: ["#2563EB", "#0891D8"] as const,
    appBackground: ["#081121", "#0B1530", "#09111F"] as const,
    chatBackground: ["#07101E", "#0B1530", "#081120"] as const,
    inactiveControl: ["rgba(51,65,85,0.92)", "rgba(51,65,85,0.92)"] as const,
    emptyIcon: ["rgba(37,99,235,0.22)", "rgba(34,211,238,0.08)"] as const
  },
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
} as const;

export const theme = lightTheme;

type ColorTokens = {
  [Key in keyof typeof lightTheme.colors]: string;
};

type GradientTokens = {
  [Key in keyof typeof lightTheme.gradients]: readonly [string, string, ...string[]];
};

type ShadowTokens = {
  [Key in keyof typeof lightTheme.shadow]: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

export type AppTheme = Omit<typeof lightTheme, "mode" | "isDark" | "colors" | "gradients" | "shadow"> & {
  mode: "light" | "dark";
  isDark: boolean;
  colors: ColorTokens;
  gradients: GradientTokens;
  shadow: ShadowTokens;
};
