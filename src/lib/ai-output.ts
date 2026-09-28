import { z } from "zod";

export const aiOutputSchema = z.object({
  intent: z.enum(["MENU_RECOMMENDATION", "ORDER_STATUS", "GENERAL", "ALLERGY_QUESTION"]),
  reply: z.string().trim().min(1).max(1200),
  recommendationSlugs: z.array(z.string().max(100)).max(5).default([]),
}).strict();

export function parseAiOutput(value: unknown) {
  return aiOutputSchema.safeParse(value);
}

export function isAllergyQuestion(input: string) {
  return /alerg|allerg|intoleran|cel[ií]ac|gluten|contaminaci[oó]n cruzada/i.test(input);
}

export function filterRecommendations<T extends { slug: string }>(
  requested: string[],
  available: T[],
  limit = 3,
) {
  const productsBySlug = new Map(available.map((product) => [product.slug, product]));
  return [...new Set(requested)]
    .flatMap((slug) => {
      const product = productsBySlug.get(slug);
      return product ? [product] : [];
    })
    .slice(0, limit);
}
