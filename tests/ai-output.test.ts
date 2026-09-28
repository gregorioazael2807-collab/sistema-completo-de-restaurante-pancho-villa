import { describe, expect, it } from "vitest";
import { filterRecommendations, isAllergyQuestion, parseAiOutput } from "@/lib/ai-output";

describe("structured assistant output", () => {
  it("accepts only the expected structured response", () => {
    expect(parseAiOutput({ intent: "MENU_RECOMMENDATION", reply: "Try tacos.", recommendationSlugs: ["tacos"] }).success).toBe(true);
    expect(parseAiOutput({ intent: "MENU_RECOMMENDATION", reply: "Try tacos.", recommendationSlugs: ["tacos"], orderStatus: "PAID" }).success).toBe(false);
  });
  it("only returns current menu items and removes duplicate recommendations", () => {
    expect(filterRecommendations(["taco", "not-in-menu", "taco", "soda"], [{ slug: "taco" }, { slug: "soda" }])).toEqual([{ slug: "taco" }, { slug: "soda" }]);
  });
  it("routes allergy questions to the deterministic safety response", () => {
    expect(isAllergyQuestion("¿Es seguro para una persona celíaca?" )).toBe(true);
    expect(isAllergyQuestion("Recomiéndame tacos al pastor")).toBe(false);
  });
});
