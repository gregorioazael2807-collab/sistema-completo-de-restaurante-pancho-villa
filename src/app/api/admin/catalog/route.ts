import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/access";
import { db } from "@/lib/db";
import { catalogArchive, catalogMutation } from "@/lib/catalog-admin";

export async function GET() {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  try {
    const [products, categories, groups] = await Promise.all([
      db.product.findMany({ orderBy: { sortOrder: "asc" }, include: { translations: true, image: true, modifierGroups: true } }),
      db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { translations: true } }),
      db.modifierGroup.findMany({ orderBy: { name: "asc" }, include: { translations: true, modifiers: { include: { translations: true }, orderBy: { name: "asc" } } } }),
    ]);
    return Response.json({ products, categories, groups }, { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "CATALOG_UNAVAILABLE" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  const parsed = catalogMutation.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_CATALOG", issues: parsed.error.issues }, { status: 400 });
  const value = parsed.data;
  try {
    const result = await db.$transaction(async tx => {
      const translations = value.translations.map(({ locale, name }) => ({ locale, name }));
      switch (value.kind) {
        case "category": {
          const data = { name: value.name, slug: value.slug, active: value.active, sortOrder: value.sortOrder };
          return value.id ? tx.category.update({ where: { id: value.id }, data: { ...data, translations: { deleteMany: {}, create: translations } } }) : tx.category.create({ data: { ...data, translations: { create: translations } } });
        }
        case "group": {
          const data = { name: value.name, required: value.required, minSelect: value.minSelect, maxSelect: value.maxSelect, active: value.active };
          return value.id ? tx.modifierGroup.update({ where: { id: value.id }, data: { ...data, translations: { deleteMany: {}, create: translations } } }) : tx.modifierGroup.create({ data: { ...data, translations: { create: translations } } });
        }
        case "modifier": {
          const data = { name: value.name, priceDelta: value.priceDelta, available: value.available, groupId: value.groupId };
          return value.id ? tx.modifier.update({ where: { id: value.id }, data: { ...data, translations: { deleteMany: {}, create: translations } } }) : tx.modifier.create({ data: { ...data, translations: { create: translations } } });
        }
        case "product": {
          const data = { name: value.name, slug: value.slug, description: value.description, categoryId: value.categoryId, price: value.price, available: value.available, featured: value.featured, sortOrder: value.sortOrder, ingredients: value.ingredients, allergens: value.allergens };
          const productTranslations = value.translations;
          const existingImage = value.id && !value.image ? await tx.productImage.findUnique({ where: { productId: value.id }, select: { id: true } }) : null;
          const links = value.groupIds.map(groupId => ({ groupId }));
          return value.id ? tx.product.update({ where: { id: value.id }, data: { ...data, translations: { deleteMany: {}, create: productTranslations }, modifierGroups: { deleteMany: {}, create: links }, ...(value.image ? { image: { upsert: { create: value.image, update: { ...value.image, translations: { deleteMany: {} } } } } } : existingImage ? { image: { delete: true } } : {}) } }) : tx.product.create({ data: { ...data, translations: { create: productTranslations }, modifierGroups: { create: links }, ...(value.image ? { image: { create: value.image } } : {}) } });
        }
      }
    });
    return Response.json({ id: result.id }, { status: value.id ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "";
    return Response.json({ error: code === "P2002" ? "DUPLICATE_SLUG" : code === "P2003" ? "INVALID_REFERENCE" : code === "P2025" ? "NOT_FOUND" : "SAVE_FAILED" }, { status: code === "P2002" ? 409 : code === "P2003" ? 400 : code === "P2025" ? 404 : 503 });
  }
}

// Archive instead of deleting: historical order lines retain their references.
export async function DELETE(request: Request) {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  const parsed = catalogArchive.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_CATALOG" }, { status: 400 });
  const { kind, id } = parsed.data;
  try {
    if (kind === "product") await db.product.update({ where: { id }, data: { available: false, featured: false } });
    if (kind === "category") await db.category.update({ where: { id }, data: { active: false } });
    if (kind === "group") await db.modifierGroup.update({ where: { id }, data: { active: false } });
    if (kind === "modifier") await db.modifier.update({ where: { id }, data: { available: false } });
    return Response.json({ archived: true });
  } catch { return Response.json({ error: "ARCHIVE_FAILED" }, { status: 404 }); }
}
