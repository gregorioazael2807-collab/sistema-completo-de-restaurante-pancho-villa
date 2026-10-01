import { availability } from "@/lib/kitchen-recipes";
import { db } from "@/lib/db";
import { normalizeLocalePreference } from "@/lib/locale";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = normalizeLocalePreference(searchParams.get("locale"));

  try {
    const categories = await db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: {
        translations: { where: { locale }, select: { name: true } },
        products: {
          where: { available: true },
          orderBy: { sortOrder: "asc" },
          include: {
            image: {
              include: {
                translations: { where: { locale }, select: { alt: true } },
              },
            },
            translations: {
              where: { locale },
              select: { name: true, description: true },
            },
            modifierGroups: {
              where: { group: { active: true } },
              include: {
                group: {
                  include: {
                    translations: { where: { locale }, select: { name: true } },
                    modifiers: {
                      where: { available: true },
                      include: {
                        translations: {
                          where: { locale },
                          select: { name: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const unavailable = await db.$transaction((tx) =>
      availability(
        tx,
        categories.flatMap((c) => c.products.map((p) => p.id)),
        categories.flatMap((c) =>
          c.products.flatMap((p) =>
            p.modifierGroups.flatMap((g) => g.group.modifiers.map((m) => m.id)),
          ),
        ),
      ),
    );
    return Response.json(
      {
        locale,
        categories: categories.map((category) => ({
          slug: category.slug,
          name: category.translations[0]?.name ?? category.name,
          products: category.products
            .filter((p) => !unavailable.has(p.id))
            .map((product) => ({
              id: product.id,
              slug: product.slug,
              name: product.translations[0]?.name ?? product.name,
              description:
                product.translations[0]?.description ?? product.description,
              ingredients: product.ingredients,
              allergens: product.allergens,
              price: product.price.toNumber(),
              currency: product.currency,
              featured: product.featured,
              modifierGroups: product.modifierGroups.map(({ group }) => ({
                id: group.id,
                name: group.translations[0]?.name ?? group.name,
                required: group.required,
                minSelect: group.minSelect,
                maxSelect: group.maxSelect,
                modifiers: group.modifiers
                  .filter((m) => !unavailable.has(m.id))
                  .map((modifier) => ({
                    id: modifier.id,
                    name: modifier.translations[0]?.name ?? modifier.name,
                    priceDelta: modifier.priceDelta.toNumber(),
                  })),
              })),
              image: product.image
                ? {
                    src: product.image.src,
                    alt:
                      product.image.translations[0]?.alt ?? product.image.alt,
                  }
                : null,
            })),
        })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("Public catalog query failed", error);
    return Response.json(
      { error: "CATALOG_UNAVAILABLE" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
