import { z } from "zod";
import { requireRole } from "@/lib/access";
import { db } from "@/lib/db";

export async function GET() {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  try {
    const products = await db.product.findMany({ orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }], select: { id: true, slug: true, name: true, price: true, currency: true, available: true, featured: true, category: { select: { name: true, translations: { select: { locale: true, name: true } } } }, translations: { select: { locale: true, name: true } }, image: { select: { src: true, alt: true } } } });
    return Response.json({ products: products.map((product) => ({ ...product, price: product.price.toNumber() })) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[admin:products]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "PRODUCTS_UNAVAILABLE" }, { status: 503 });
  }
}

const updateSchema = z.object({ price: z.number().finite().min(0).max(1000).optional(), available: z.boolean().optional(), featured: z.boolean().optional() }).refine((value) => Object.values(value).some((field) => field !== undefined));

export async function PATCH(request: Request) {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  const body = updateSchema.safeParse(await request.json().catch(() => null));
  const productId = new URL(request.url).searchParams.get("id");
  if (!body.success || !productId || productId.length > 64) return Response.json({ error: "INVALID_PRODUCT" }, { status: 400 });
  try {
    const product = await db.product.update({ where: { id: productId }, data: body.data, select: { id: true, price: true, available: true, featured: true } });
    return Response.json({ ...product, price: product.price.toNumber() });
  } catch (error) {
    console.error("[admin:product-update]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "PRODUCT_UPDATE_FAILED" }, { status: 404 });
  }
}
