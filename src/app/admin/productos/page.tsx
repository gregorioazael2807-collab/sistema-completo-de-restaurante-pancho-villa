import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { ProductManagement } from "@/components/product-management";

export default async function ProductsPage() {
  const user = await requireCurrentUser();
  if (user.role !== "ADMIN") redirect("/cuenta");
  const products = await db.product.findMany({ orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }], select: { id: true, slug: true, name: true, price: true, currency: true, available: true, featured: true, category: { select: { name: true, translations: { where: { locale: user.locale }, select: { name: true } } } }, translations: { where: { locale: user.locale }, select: { name: true } }, image: { select: { src: true } } } });
  const locale = user.locale === "en" || user.locale === "de" ? user.locale : "es";
  return <ProductManagement locale={locale} products={products.map((item) => ({ id: item.id, slug: item.slug, name: item.translations[0]?.name ?? item.name, price: item.price.toNumber(), currency: item.currency, available: item.available, featured: item.featured, category: item.category.translations[0]?.name ?? item.category.name, image: item.image?.src ?? null }))} />;
}
