import { describe, expect, it } from "vitest";
import { normalizeLocalePreference } from "@/lib/locale";

describe("normalizeLocalePreference", () => {
  it.each(["es", "en", "de"] as const)(
    "accepts the supported locale %s",
    (locale) => {
      expect(normalizeLocalePreference(locale)).toBe(locale);
    },
  );

  it.each([null, undefined, "fr", "ES", 3])(
    "uses Spanish for unsupported values",
    (value) => {
      expect(normalizeLocalePreference(value)).toBe("es");
    },
  );
});
