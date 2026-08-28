/**
 * Icon sizing tokens. V2 standardises on ONE icon set (@expo/vector-icons)
 * for app-size reasons (see plan §12), wired via an <AppIcon> wrapper when
 * icons are first needed (onboarding/tabs). No raw icon imports here.
 */
export const IconSize = {
  tab: 24,
  header: 24,
  inline: 20,
  feature: 48,
  hero: 64,
} as const;
