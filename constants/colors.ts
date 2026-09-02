
const ACCENT_BLUE = "#0CC8F2" as const;
const ACCENT_LIME = "#93F205" as const;
const ACCENT_RED = "#F2274C" as const;
const ACCENT_ORANGE = "#F27127" as const;
const PURE_WHITE = "#FFFFFF" as const;
const PURE_BLACK = "#000000" as const;

const sharedAccents = {
  actionBlue: ACCENT_BLUE,
  successLime: ACCENT_LIME,
  dangerRed: ACCENT_RED,
  warningOrange: ACCENT_ORANGE,
  white: PURE_WHITE,
  black: PURE_BLACK,
  /** Brand teal (both themes) — pinned accents, light-mode primary pills. */
  tealAccent: "#07B7A9",
} as const;

const LIGHT_PRIMARY = "#00677E" as const;
const LIGHT_PRIMARY_CONTAINER = "#0CC8F2" as const;
const LIGHT_SURFACE = "#F9F9FF" as const;
const LIGHT_ON_SURFACE = "#161C28" as const;
const LIGHT_ON_SURFACE_VARIANT = "#3C494E" as const;

const LIGHT_SECONDARY = "#3D6A00" as const;
const LIGHT_SECONDARY_CONTAINER = "#99F816" as const;

const LIGHT_TERTIARY = "#BE0033" as const;
const LIGHT_TERTIARY_CONTAINER = "#FF9DA1" as const;

const LIGHT_ERROR = "#BA1A1A" as const;
const LIGHT_ERROR_CONTAINER = "#FFDAD6" as const;

const LIGHT_SURFACE_DIM = "#D4DAEB" as const;
const LIGHT_SURFACE_BRIGHT = "#F9F9FF" as const;
const LIGHT_SURFACE_CONTAINER_LOWEST = "#FFFFFF" as const;
const LIGHT_SURFACE_CONTAINER_LOW = "#F1F3FF" as const;
const LIGHT_SURFACE_CONTAINER = "#E8EEFF" as const;
const LIGHT_SURFACE_CONTAINER_HIGH = "#E2E8F9" as const;
const LIGHT_SURFACE_CONTAINER_HIGHEST = "#DDE2F3" as const;

const LIGHT_OUTLINE = "#6C797E" as const;
const LIGHT_OUTLINE_VARIANT = "#BBC9CF" as const;

const LIGHT_GREY_50 = "#F7F8FA" as const;
const LIGHT_GREY_100 = "#E8EAED" as const;
const LIGHT_GREY_200 = "#D1D5DB" as const;
const LIGHT_GREY_400 = "#9CA3AF" as const;
const LIGHT_GREY_600 = "#6B7280" as const;
const LIGHT_GREY_800 = "#374151" as const;

export const LightColors = {
  ...sharedAccents,

  primary: LIGHT_PRIMARY,
  onPrimary: PURE_WHITE,
  primaryContainer: LIGHT_PRIMARY_CONTAINER,
  onPrimaryContainer: "#005062",
  inversePrimary: "#44D6FF",

  secondary: LIGHT_SECONDARY,
  onSecondary: PURE_WHITE,
  secondaryContainer: LIGHT_SECONDARY_CONTAINER,
  onSecondaryContainer: "#406E00",

  tertiary: LIGHT_TERTIARY,
  onTertiary: PURE_WHITE,
  tertiaryContainer: LIGHT_TERTIARY_CONTAINER,
  onTertiaryContainer: "#960026",

  error: LIGHT_ERROR,
  onError: PURE_WHITE,
  errorContainer: LIGHT_ERROR_CONTAINER,
  onErrorContainer: "#93000A",

  surface: LIGHT_SURFACE,
  surfaceDim: LIGHT_SURFACE_DIM,
  surfaceBright: LIGHT_SURFACE_BRIGHT,
  surfaceContainerLowest: LIGHT_SURFACE_CONTAINER_LOWEST,
  surfaceContainerLow: LIGHT_SURFACE_CONTAINER_LOW,
  surfaceContainer: LIGHT_SURFACE_CONTAINER,
  surfaceContainerHigh: LIGHT_SURFACE_CONTAINER_HIGH,
  surfaceContainerHighest: LIGHT_SURFACE_CONTAINER_HIGHEST,
  onSurface: LIGHT_ON_SURFACE,
  onSurfaceVariant: LIGHT_ON_SURFACE_VARIANT,
  inverseSurface: "#2A303D",
  inverseOnSurface: "#ECF0FF",
  surfaceVariant: LIGHT_SURFACE_CONTAINER_HIGHEST,
  surfaceTint: LIGHT_PRIMARY,

  outline: LIGHT_OUTLINE,
  outlineVariant: LIGHT_OUTLINE_VARIANT,

  primaryFixed: "#B5EBFF",
  primaryFixedDim: "#44D6FF",
  onPrimaryFixed: "#001F28",
  onPrimaryFixedVariant: "#004E60",

  secondaryFixed: "#9BFB1C",
  secondaryFixedDim: "#85DD00",
  onSecondaryFixed: "#0F2000",
  onSecondaryFixedVariant: "#2D5000",

  tertiaryFixed: "#FFDADA",
  tertiaryFixedDim: "#FFB3B5",
  onTertiaryFixed: "#40000B",
  onTertiaryFixedVariant: "#920025",

  background: LIGHT_SURFACE,
  onBackground: LIGHT_ON_SURFACE,

  grey50: LIGHT_GREY_50,
  grey100: LIGHT_GREY_100,
  grey200: LIGHT_GREY_200,
  grey400: LIGHT_GREY_400,
  grey600: LIGHT_GREY_600,
  grey800: LIGHT_GREY_800,

  correctBg: "#E8FFD6",
  correctBorder: "#85DD00",
  correctDark: "#2D8C00",
  correctDarker: "#1A6600",
  wrongBg: "#FFEAEA",
  wrongBorder: "#FFB3B5",

  categoryOrangeBg: "#FFF3E8",
  categoryBlueBg: "#E6F9FF",
  categoryGreenBg: "#EDFFD6",

  disabledText: "#9CA3AF",

  // Selectable surfaces (onboarding cards, option rows, category tabs). Theme-
  // aware so they don't render dark on light. Active = brand teal on light.
  selectionRestBg: LIGHT_SURFACE_CONTAINER_LOW,
  selectionRestBorder: LIGHT_OUTLINE_VARIANT,
  selectionRestText: LIGHT_ON_SURFACE,
  selectionActiveBorder: "#07B7A9",
  selectionActiveTint: "rgba(7,183,169,0.12)",
  selectionActiveText: "#00514A",

  /** Frosted "glass" card surface (macOS-Finder-ish) — mostly opaque so its
   *  own content stays readable; just a hint of the gradient behind. */
  glassSurface: "rgba(255,255,255,0.93)",
} as const;

const DARK_BASE = "#1A1D24" as const;
const DARK_PRIMARY = "#44D6FF" as const; 
const DARK_ON_PRIMARY = "#001F28" as const;
const DARK_PRIMARY_CONTAINER = "#004E60" as const;
const DARK_ON_PRIMARY_CONTAINER = "#B5EBFF" as const;

const DARK_SURFACE = DARK_BASE;
const DARK_SURFACE_DIM = "#14171C" as const;
const DARK_SURFACE_BRIGHT = "#2A303D" as const;
const DARK_SURFACE_CONTAINER_LOWEST = "#22262E" as const;
const DARK_SURFACE_CONTAINER_LOW = "#2A2E38" as const;
const DARK_SURFACE_CONTAINER = "#323642" as const;
const DARK_SURFACE_CONTAINER_HIGH = "#3A3E4C" as const;
const DARK_SURFACE_CONTAINER_HIGHEST = "#424656" as const;

const DARK_ON_SURFACE = "#F9F9FF" as const; 
const DARK_ON_SURFACE_VARIANT = "#B8C4D4" as const; 
const DARK_OUTLINE = "#6C797E" as const; 
const DARK_OUTLINE_VARIANT = "#3C494E" as const; 

const DARK_SECONDARY = "#85DD00" as const;
const DARK_ON_SECONDARY = "#0F2000" as const;
const DARK_SECONDARY_CONTAINER = "#2D5000" as const;
const DARK_ON_SECONDARY_CONTAINER = "#9BFB1C" as const;

const DARK_TERTIARY = "#FFB3B5" as const;
const DARK_ON_TERTIARY = "#40000B" as const;
const DARK_TERTIARY_CONTAINER = "#920025" as const;
const DARK_ON_TERTIARY_CONTAINER = "#FFDADA" as const;

const DARK_ERROR = "#FFB4AB" as const;
const DARK_ON_ERROR = "#690005" as const;
const DARK_ERROR_CONTAINER = "#93000A" as const;
const DARK_ON_ERROR_CONTAINER = "#FFDAD6" as const;

const DARK_GREY_50 = "#1A1D24" as const;
const DARK_GREY_100 = "#22262E" as const;
const DARK_GREY_200 = "#2A2E38" as const;
const DARK_GREY_400 = "#3A3E4C" as const;
const DARK_GREY_600 = "#6C797E" as const;
const DARK_GREY_800 = "#B8C4D4" as const;

export type AppColors = Record<keyof typeof LightColors, string>;

export const DarkColors: AppColors = {
  ...sharedAccents,

  primary: DARK_PRIMARY,
  onPrimary: DARK_ON_PRIMARY,
  primaryContainer: DARK_PRIMARY_CONTAINER,
  onPrimaryContainer: DARK_ON_PRIMARY_CONTAINER,
  inversePrimary: LIGHT_PRIMARY,

  secondary: DARK_SECONDARY,
  onSecondary: DARK_ON_SECONDARY,
  secondaryContainer: DARK_SECONDARY_CONTAINER,
  onSecondaryContainer: DARK_ON_SECONDARY_CONTAINER,

  tertiary: DARK_TERTIARY,
  onTertiary: DARK_ON_TERTIARY,
  tertiaryContainer: DARK_TERTIARY_CONTAINER,
  onTertiaryContainer: DARK_ON_TERTIARY_CONTAINER,

  error: DARK_ERROR,
  onError: DARK_ON_ERROR,
  errorContainer: DARK_ERROR_CONTAINER,
  onErrorContainer: DARK_ON_ERROR_CONTAINER,

  surface: DARK_SURFACE,
  surfaceDim: DARK_SURFACE_DIM,
  surfaceBright: DARK_SURFACE_BRIGHT,
  surfaceContainerLowest: DARK_SURFACE_CONTAINER_LOWEST,
  surfaceContainerLow: DARK_SURFACE_CONTAINER_LOW,
  surfaceContainer: DARK_SURFACE_CONTAINER,
  surfaceContainerHigh: DARK_SURFACE_CONTAINER_HIGH,
  surfaceContainerHighest: DARK_SURFACE_CONTAINER_HIGHEST,
  onSurface: DARK_ON_SURFACE,
  onSurfaceVariant: DARK_ON_SURFACE_VARIANT,
  inverseSurface: DARK_ON_SURFACE,
  inverseOnSurface: DARK_SURFACE,
  surfaceVariant: DARK_SURFACE_CONTAINER_HIGH,
  surfaceTint: DARK_PRIMARY,

  outline: DARK_OUTLINE,
  outlineVariant: DARK_OUTLINE_VARIANT,

  primaryFixed: "#B5EBFF",
  primaryFixedDim: "#44D6FF",
  onPrimaryFixed: "#001F28",
  onPrimaryFixedVariant: "#004E60",

  secondaryFixed: "#9BFB1C",
  secondaryFixedDim: "#85DD00",
  onSecondaryFixed: "#0F2000",
  onSecondaryFixedVariant: "#2D5000",

  tertiaryFixed: "#FFDADA",
  tertiaryFixedDim: "#FFB3B5",
  onTertiaryFixed: "#40000B",
  onTertiaryFixedVariant: "#920025",

  background: DARK_SURFACE,
  onBackground: DARK_ON_SURFACE,

  grey50: DARK_GREY_50,
  grey100: DARK_GREY_100,
  grey200: DARK_GREY_200,
  grey400: DARK_GREY_400,
  grey600: DARK_GREY_600,
  grey800: DARK_GREY_800,

  correctBg: "#0D1F00" as const, // very dark green
  correctBorder: "#3A6600" as const,
  correctDark: "#8FE000" as const, // lime text on correctBg
  correctDarker: "#AAFA30" as const,

  wrongBg: "#220708" as const, // very dark red
  wrongBorder: "#5C0015" as const,

  categoryOrangeBg: "#1F0F00" as const,
  categoryBlueBg: "#000F1A" as const,
  categoryGreenBg: "#0A1600" as const,

  disabledText: "#555B66" as const,

  // Selectable surfaces — dark-mode values (active = brand green, as before).
  selectionRestBg: "#1F2229" as const,
  selectionRestBorder: "rgba(255,255,255,0.08)" as const,
  selectionRestText: DARK_ON_SURFACE_VARIANT,
  selectionActiveBorder: "#2BD964" as const,
  selectionActiveTint: "rgba(43,217,100,0.10)" as const,
  selectionActiveText: PURE_WHITE,

  /** Frosted "glass" card surface (macOS-Finder-ish) — mostly opaque so its
   *  own content stays readable; just a hint of the gradient behind. */
  glassSurface: "rgba(34,38,46,0.93)" as const,
} as const;

export const StaticColors = {

  /**
   * GLASS CARD EFFECT — use these tokens on every semi-transparent card.
   *
   * How it works:
   * The card is split into two Views. The outer View holds only the border
   * (no background). The inner View holds only the background fill (no border).
   * This is necessary because Android draws borders INSIDE the view bounds,
   * so a single View with both borderWidth and backgroundColor on a rounded
   * container renders two distinct visible rectangles — the border ring and
   * the fill — creating the "rectangle inside a rectangle" artifact. Splitting
   * them into separate Views means each layer renders as one clean shape.
   *
   * The tint colour is black in dark mode and white in light mode, at enough
   * opacity to feel solid but still let the background bleed through.
   * Active/unread items use a higher opacity than passive/read ones to create
   * a clear visual hierarchy without changing the colour at all.
   * Text is always near-black (#111111) in light mode and white (#ffffff) in
   * dark mode — never derived from theme surface colours, which are too grey
   * and wash out on a tinted card.
   *
   * Usage:
   *   // Outer (border only):
   *   <View style={{ borderRadius, borderWidth: 1, borderColor: GlassColors.dark.borderActive }}>
   *   // Inner (fill only):
   *   <View style={{ borderRadius: radius - 1, backgroundColor: GlassColors.dark.bgActive }}>
   */
  glass: {
    dark: {
      bgActive:     'rgba(15,17,22,0.72)',
      bgPassive:    'rgba(15,17,22,0.55)',
      borderActive: 'rgba(255,255,255,0.18)',
      borderPassive:'rgba(255,255,255,0.10)',
      text:         '#ffffff',
    },
    light: {
      bgActive:    'rgba(255,255,255,0.65)',
      bgPassive:   'rgba(255,255,255,0.50)',
      borderActive: 'rgba(0,0,0,0.12)',
      borderPassive:'rgba(0,0,0,0.06)',
      text:         '#111111',
    },
  },

  imageCardText: "#1A1A1A" as const,
  imageCardTextDark: "#1A1A2E" as const,

  resultViewBtn: "#A8E6F0" as const,
  resultViewBtnText: "#1A1A1A" as const,

  levelGoldBtn: "#F5C518" as const,
  levelGoldBtnText: "#1A1A00" as const,
  levelGoldLockRing: "#F5C518" as const,
  levelGoldLockIcon: "#4A2800" as const,

  scorecardGold: "#C9A43E" as const,
  scorecardGoldBorder: "#C9A43E" as const,

  practiceBtnBg: "#BFFF00" as const,
  practiceBtnText: "#1A1A1A" as const,

  scoreCoralbtn: "#C85559" as const,
  scoreCoralSubtitle: "#C85000" as const,

  achievementAmber: "#F59E0B" as const,
  achievementAmberBg: "rgba(245,158,11,0.15)" as const,
  successLime: ACCENT_LIME,

  /** Brand teal (both themes) — pinned accent, matches sharedAccents.tealAccent. */
  tealAccent: "#07B7A9" as const,

  // Streak-run accent art (skill check / review / lesson complete / out-of-keys).
  runPurple: "#A855F7" as const,
  runPurpleDim: "#C084FC" as const,

  toastSuccessBg: "#22C55E" as const,
  toastSuccessText: "#FFFFFF" as const,

  wrongChipBg: "#F77BA0" as const,
  wrongChipLetterBg: "#B01030" as const,

  timerGreen: "#2D8C00" as const,
  timerOrange: "#F27127" as const,
  timerRed: "#F2274C" as const,
  timerTrackBg: "rgba(255,255,255,0.15)" as const,

  /** Skipped/"frozen" streak day in calendar previews (icy blue). */
  frozenStreak: "#5BC8F5" as const,

  backdropColor: "rgba(0,0,0,0.35)" as const,

  mapGrass: "#8BC34A" as const,
  mapRoadPrimary: "#424242" as const,
  mapRoadSecondary: "#616161" as const,
  mapBuilding: "#795548" as const,
  mapMinimapBg: "rgba(0,0,0,0.8)" as const,

  shadowColor: "#000000" as const,

  confettiRed: "#F2274C" as const,
  confettiCyan: "#0CC8F2" as const,
  confettiLime: "#93F205" as const,
  confettiOrange: "#F27127" as const,
  confettiGold: "#FFD700" as const,
  confettiPink: "#FF69B4" as const,
  confettiAzure: "#00E5FF" as const,

  signFallbackBadgeBg: "rgba(242,113,39,0.85)" as const,
  timerPillBg: "rgba(0,0,0,0.15)" as const,
  signPromptBarBg: "rgba(255,255,255,0.7)" as const,

  joinButtonBg: "#0CC8F2" as const,
  joinButtonText: "#003643" as const,

  backdropColorDark: "rgba(0, 0, 0, 0.8)" as const,
  arrowCircleBg: "rgba(255, 255, 255, 0.2)" as const,

  mapGrassGreen: "#8BC34A" as const,
  mapRoadMain: "#424242" as const,
  mapJunctionBg: "#FFD700" as const,
  mapJunctionBorder: "#FFA500" as const,
  mapBuildingBg: "#795548" as const,
  mapRouteGreen: "#4CAF50" as const,
  mapRouteRed: "#F44336" as const,
  mapCarWindow: "#333333" as const,

  /**
   * SELECTION tokens (V2). A selectable surface (SelectionCard / OptionRow)
   * is neutral gray at rest and gains a green border + glow when selected.
   * The glow gradient itself lives in gradients.ts (SelectionGlow).
   */
  /** Bright avatar circle colours (leaderboard + profile). */
  avatarPalette: ["#E84FD0", "#A855F7", "#2BD964", "#0CC8F2", "#F27127", "#F2274C"] as const,

  selection: {
    restBg: "#1F2229" as const,
    restBorder: "rgba(255,255,255,0.08)" as const,
    restText: "#B8C4D4" as const,
    activeBorder: "#2BD964" as const,
    activeText: "#FFFFFF" as const,
    activeTint: "rgba(43,217,100,0.10)" as const,
    youRing: "#B23BFF" as const,
  },

  /** Dark text for content sitting on the bright BrandGradients.discovery fill
   *  (category tiles, join-challenge CTA) — same near-black-green on both themes
   *  since the gradient itself doesn't change. */
  discoveryText: "#06231F" as const,

  /** Gold trophy icon (readiness-plan scorecard). */
  trophyGold: "#F5B301" as const,

  /** Pre-theme splash/update-check screen (app/_layout.tsx) — must match
   *  app.json's expo-splash-screen.backgroundColor exactly so the native
   *  splash hands off to this JS view with no visible flash. Fixed on
   *  purpose: not theme-aware, since it renders before ThemeProvider mounts. */
  splashBg: "#161616" as const,
  /** Splash-screen icon/dots colour — fixed white, same reason as splashBg. */
  splashFg: PURE_WHITE,
} as const;
