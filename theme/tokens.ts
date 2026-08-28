/**
 * Single import surface for design tokens. Components pull everything they
 * need from here (plus useTheme() for palette), so no file reaches for a raw
 * hex/number — this is what makes the "no hard-coded values" rule enforceable.
 */
export { Spacing, Radius } from '@/constants/spacing';
export { Typography, FontFamily } from '@/constants/typography';
export { IconSize } from '@/constants/icons';
export { BrandGradients, SelectionGlow } from '@/constants/gradients';
export { useTheme } from './ThemeContext';
export type { ThemeScheme } from './ThemeContext';
