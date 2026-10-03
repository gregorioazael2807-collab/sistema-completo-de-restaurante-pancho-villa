import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { CatalogManager } from "@/components/catalog-manager";
export default async function ProductsPage() {
  const user = await requireCurrentUser("kitchen");
  if (user.role !== "ADMIN") redirect("/cuenta");
  return <CatalogManager locale={user.locale === "en" || user.locale === "de" ? user.locale : "es"} />;
}
