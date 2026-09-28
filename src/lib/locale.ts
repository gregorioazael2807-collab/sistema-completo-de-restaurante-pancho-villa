export const supportedLocales = ["es", "en", "de"] as const;

export type Locale = (typeof supportedLocales)[number];

export function normalizeLocalePreference(value: unknown): Locale {
  if (
    typeof value === "string" &&
    supportedLocales.some((locale) => locale === value)
  ) {
    return value as Locale;
  }

  return "es";
}
