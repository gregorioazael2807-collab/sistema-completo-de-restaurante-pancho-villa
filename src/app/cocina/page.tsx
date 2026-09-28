import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { KitchenBoard } from "@/components/kitchen-board";

export default async function KitchenPage() {
  const user = await requireCurrentUser();
  if (user.role !== "ADMIN" && user.role !== "COCINA") redirect("/cuenta");
  return <KitchenBoard locale={user.locale === "en" || user.locale === "de" ? user.locale : "es"} />;
}
