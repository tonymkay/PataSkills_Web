
// ── Skill card gradients (alternating, diagonal, matching the reference design) ──
export const SkillCardGradients = [
  // Card 0 — teal
  {
    colors: ['#0ABFBF', '#056B6B'] as const,
    start: { x: 0, y: 0 },
    end:   { x: 1, y: 1 },
    circleColor: '#07E8E8',
    btnColor:    '#0ED4D4',
  },
  // Card 1 — royal blue
  {
    colors: ['#2979FF', '#0D47A1'] as const,
    start: { x: 0, y: 0 },
    end:   { x: 1, y: 1 },
    circleColor: '#5C9EFF',
    btnColor:    '#4488FF',
  },
  // Card 2 — purple
  {
    colors: ['#8E24AA', '#4A0072'] as const,
    start: { x: 0, y: 0 },
    end:   { x: 1, y: 1 },
    circleColor: '#CE93D8',
    btnColor:    '#AB47BC',
  },
] as const;

export const BrandGradients = {

  primaryStreakH: {

    colors: ["#0CC8F2", "#3DCC6E"] as const,
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  primaryStreakD: {

    colors: ["#0CC8F2", "#3DCC6E"] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  primaryQFH: {
    colors: ["#F5C518", "#E07B00"] as const,
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },

  // V2 onboarding "discovery" brand gradient (green → teal). Used on the Pata
  // mascot badge, the primary gradient CTA, and as the base of the selection glow.
  discovery: {
    colors: ["#2BD964", "#07B7A9"] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;

// Subtle, low-saturation light-blue wash for surfaces that need a touch of life
// (e.g. the auth bottom sheet) without competing with the brand green. Vertical,
// top → bottom, theme-adaptive. Intentionally faint.
const SheetGradientDark = {
  colors: ["#243038", "#191F26"] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
const SheetGradientLight = {
  colors: ["#EAF3FB", "#F6F9FC"] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
export function getSheetGradient(isDark: boolean): CategoryGradient {
  return isDark ? SheetGradientDark : SheetGradientLight;
}

// Bottom fade behind pinned bottom cards (skill overview): the screen background
// at 100% at the bottom fading to 0% upward, so content scrolls "under" the card.
const BottomFadeDark = {
  colors: ["rgba(26,29,36,0)", "rgba(26,29,36,0.9)", "#1A1D24"] as const, // DARK_SURFACE
  locations: [0, 0.45, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
const BottomFadeLight = {
  colors: ["rgba(249,249,255,0)", "rgba(249,249,255,0.9)", "#F9F9FF"] as const, // LIGHT_SURFACE
  locations: [0, 0.45, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
export function getBottomFade(isDark: boolean) {
  return isDark ? BottomFadeDark : BottomFadeLight;
}

// Keys/shop screen header wash — a warm gold tint solid-ish at the very top,
// fading to fully transparent by ~55% down, so the (transparent) header and
// key.webp hero sit "inside" the glow rather than on a hard-edged block.
const KeysHeaderFadeDark = {
  colors: ["rgba(245,197,24,0.24)", "rgba(245,197,24,0.08)", "transparent"] as const,
  locations: [0, 0.5, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
const KeysHeaderFadeLight = {
  colors: ["rgba(245,197,24,0.30)", "rgba(245,197,24,0.10)", "transparent"] as const,
  locations: [0, 0.5, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
export function getKeysHeaderFade(isDark: boolean) {
  return isDark ? KeysHeaderFadeDark : KeysHeaderFadeLight;
}

// Subtle SOLID brand fill for a SELECTED plan card's inner — dark variant (muted
// dark teal → dark green) for dark mode, light variant (pale teal → pale green)
// for light mode. Theme text reads on both; pick via useTheme().isDark.
export const PlanSelectedFill = {
  colors: ["#0E2F2C", "#123320"] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;
export const PlanSelectedFillLight = {
  colors: ["#D7F3EE", "#E3F7E8"] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

// Faint brand fill (teal → green) for the highlighted Premium column. Low alpha
// so it reads as a subtle wash, not a strong block.
export const PremiumHighlight = {
  colors: ["rgba(7,183,169,0.18)", "rgba(43,217,100,0.18)"] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

// Soft green glow that pools at the bottom of the home screen (behind the card
// + tabs). Transparent at the top → faint brand green at the bottom.
export const HomeBottomGlow = {
  colors: ["transparent", "rgba(43,217,100,0.18)"] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;

// Teal twin of HomeBottomGlow — pools at the bottom of the SKILLS tab.
export const TealBottomGlow = {
  colors: ["transparent", "rgba(7,183,169,0.18)"] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;

// STRONG bottom fades (Tony, 2026-07-05): near-opaque at the tab area so
// scrolling content actually disappears under it, transparent quickly above so
// it doesn't stretch up the screen. Tinted teal (Skills tab) / green (skill
// overview); theme-aware pairs, picked via the getters.
const TealTabFadeDark = {
  colors: ["rgba(10,46,49,0)", "rgba(10,46,49,0.92)", "#0A2E31"] as const,
  locations: [0, 0.55, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
const TealTabFadeLight = {
  colors: ["rgba(215,243,238,0)", "rgba(215,243,238,0.94)", "#D7F3EE"] as const,
  locations: [0, 0.55, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
export function getTealTabFade(isDark: boolean) {
  return isDark ? TealTabFadeDark : TealTabFadeLight;
}

const GreenTabFadeDark = {
  colors: ["rgba(18,51,32,0)", "rgba(18,51,32,0.92)", "#123320"] as const,
  locations: [0, 0.55, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
const GreenTabFadeLight = {
  colors: ["rgba(227,247,232,0)", "rgba(227,247,232,0.94)", "#E3F7E8"] as const,
  locations: [0, 0.55, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
export function getGreenTabFade(isDark: boolean) {
  return isDark ? GreenTabFadeDark : GreenTabFadeLight;
}

// Scrim behind the tabs on scrolling pages — content fades out into a muted dark
// teal toward the bottom (transparent at the top), so it doesn't hard-cut under
// the floating tab bar.
export const TabScrim = {
  // Short fade: transparent → solid dark teal by 40%, solid the rest. Kept low
  // so it covers the tab area without spreading too far up the screen.
  colors: ["transparent", "rgba(10,46,49,1)"] as const,
  locations: [0, 0.4] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;

// The green "spotlight" sweep behind a SELECTED card/row (see SelectionCard,
// OptionRow). Diagonal so it reads as light raking across the surface. The
// trailing stop is transparent so the glow fades into the card's own surface.
export const SelectionGlow = {
  colors: ["#2BD964", "rgba(7,183,169,0.35)", "transparent"] as const,
  locations: [0, 0.55, 1] as const,
  start: { x: 0.1, y: 1 },
  end: { x: 0.9, y: 0 },
} as const;

// Light-mode selection glow — a faint teal wash (the saturated green above reads
// as neon on a light card). Same rake; low alpha so it tints rather than fills.
export const SelectionGlowLight = {
  colors: ["rgba(7,183,169,0.20)", "rgba(7,183,169,0.07)", "transparent"] as const,
  locations: [0, 0.55, 1] as const,
  start: { x: 0.1, y: 1 },
  end: { x: 0.9, y: 0 },
} as const;

export type BrandGradientKey = keyof typeof BrandGradients;

export interface CategoryGradient {
  colors: readonly [string, string, ...string[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export const LightGradients = {
  modelTown: {
    colors: ["#FFE0CC", "#FFF3E8"], // Orange gradient (strong to light)
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  questions: {
    colors: ["#CCEFFF", "#E6F9FF"], // Blue gradient (strong to light)
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  signs: {
    colors: ["#D4FFB8", "#EDFFD6"], // Green gradient (strong to light)
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
} as const;

export const DarkGradients = {
  modelTown: {
    colors: ["#3A2F1F", "#2A1F0F"], // Dark orange gradient (strong to light)
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  questions: {
    colors: ["#2A4E58", "#1A2E38"], // Dark blue gradient (strong to light)
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  signs: {
    colors: ["#2A4F1F", "#1A2F0F"], // Dark green gradient (strong to light)
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
} as const;

export type CategoryKey = keyof typeof LightGradients;

export function getCategoryGradient(
  category: CategoryKey,
  isDark: boolean,
): CategoryGradient {
  return isDark ? DarkGradients[category] : LightGradients[category];
}

// ── Skills-tab category cards (driving/school/finance/...) ── alternating,
// theme-aware, and DELIBERATELY faint — this is a wash for card character,
// not a bold fill like SkillCardGradients. Diagonal, low-alpha brand-adjacent
// hues so the border/icon/text (all theme colours) still read clearly on top.
// Cycle through by index (`CategoryCardGradients[index % length]`); dark/light
// pick via useTheme().isDark, same pattern as getSheetGradient.
const CategoryCardGradientsDark: CategoryGradient[] = [
  { colors: ['rgba(7,183,169,0.16)', 'rgba(7,183,169,0)'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },   // teal
  { colors: ['rgba(41,121,255,0.16)', 'rgba(41,121,255,0)'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },  // blue
  { colors: ['rgba(142,36,170,0.16)', 'rgba(142,36,170,0)'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },  // purple
  { colors: ['rgba(224,123,0,0.16)', 'rgba(224,123,0,0)'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },    // amber
];
const CategoryCardGradientsLight: CategoryGradient[] = [
  { colors: ['rgba(7,183,169,0.10)', 'rgba(7,183,169,0)'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  { colors: ['rgba(41,121,255,0.10)', 'rgba(41,121,255,0)'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  { colors: ['rgba(142,36,170,0.10)', 'rgba(142,36,170,0)'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  { colors: ['rgba(224,123,0,0.10)', 'rgba(224,123,0,0)'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
];
export function getCategoryCardGradient(index: number, isDark: boolean): CategoryGradient {
  const set = isDark ? CategoryCardGradientsDark : CategoryCardGradientsLight;
  return set[index % set.length];
}

export const LightIconColors = {
  modelTown: "#FF6B35", // Orange
  questions: "#00677E", // Blue
  signs: "#3D6A00", // Green
} as const;

export const DarkIconColors = {
  modelTown: "#FF9A66", // Light orange
  questions: "#44D6FF", // Light blue
  signs: "#85DD00", // Light green
} as const;

export const LightTextColors = {
  modelTown: "#8B4513", // Dark brown for orange gradient
  questions: "#1A4D66", // Dark blue for blue gradient
  signs: "#2D4A00", // Dark green for green gradient
} as const;

export const DarkTextColors = {
  modelTown: "#FFD4B3", // Light peach for dark orange gradient
  questions: "#B3E6FF", // Light blue for dark blue gradient
  signs: "#C8E6A0", // Light green for dark green gradient
} as const;

export function getCategoryIconColor(
  category: CategoryKey,
  isDark: boolean,
): string {
  return isDark ? DarkIconColors[category] : LightIconColors[category];
}

export function getCategoryTextColor(
  category: CategoryKey,
  isDark: boolean,
): string {
  return isDark ? DarkTextColors[category] : LightTextColors[category];
}
