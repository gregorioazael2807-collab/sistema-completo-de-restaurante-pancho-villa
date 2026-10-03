import { redirect } from "next/navigation";
import { getActor } from "@/lib/access";
import { requireCurrentUser } from "@/lib/current-user";
import { KitchenBoard } from "@/components/kitchen-board";

export default async function KitchenPage() {
  const actor = await getActor("kitchen");
  if (!actor || actor.role !== "ADMIN") redirect("/cocina/login");
  const user = await requireCurrentUser("kitchen");
  return (
    <KitchenBoard
      actorId={user.id}
      locale={user.locale === "en" || user.locale === "de" ? user.locale : "es"}
    />
  );
}
