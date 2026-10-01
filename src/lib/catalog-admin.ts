import { z } from "zod";
const name = z.string().trim().min(1).max(160);
const id = z.string().min(1).max(64);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const translations = z.array(z.object({ locale: z.enum(["es", "en", "de"]), name, description: z.string().trim().max(2000).default("") })).max(3).refine(rows => new Set(rows.map(row => row.locale)).size === rows.length, "Duplicate language");
export const photoPath = z.string().regex(/^(?:\/menu\/[a-z0-9-]+\.(?:jpg|png|webp)|\/api\/catalog\/photos\/[a-f0-9-]{36}\.webp)$/);
const base = { id: id.optional(), name, translations };
const money = z.number().finite().min(0).max(1000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Use at most two decimals");
export const catalogMutation = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("product"), ...base, slug, categoryId: id, description: z.string().trim().min(1).max(2000), ingredients: z.array(z.string().trim().min(1).max(100)).max(50), allergens: z.array(z.string().trim().min(1).max(100)).max(30), price: money, available: z.boolean(), featured: z.boolean(), sortOrder: z.number().int().min(0).max(10000), groupIds: z.array(id).max(10).refine(ids => new Set(ids).size === ids.length), image: z.object({ src: photoPath, alt: z.string().trim().min(1).max(300) }).nullable() }).refine(value => value.translations.every(row => row.description.length > 0), "Product translations need descriptions"),
  z.object({ kind: z.literal("category"), ...base, slug, active: z.boolean(), sortOrder: z.number().int().min(0).max(10000) }),
  z.object({ kind: z.literal("group"), ...base, active: z.boolean(), required: z.boolean(), minSelect: z.number().int().min(0).max(10), maxSelect: z.number().int().min(1).max(10) }).refine(value => value.minSelect <= value.maxSelect && (!value.required || value.minSelect >= 1), "Invalid selection limits"),
  z.object({ kind: z.literal("modifier"), ...base, groupId: id, priceDelta: money, available: z.boolean() }),
]);
export const catalogArchive = z.object({ kind: z.enum(["product", "category", "group", "modifier"]), id });
