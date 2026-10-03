import { redirect } from "next/navigation";
import { getActor } from "@/lib/access";
import { KitchenLogin } from "@/components/kitchen-login";
import "../../kitchen.css";

export default async function KitchenLoginPage() {
  const actor = await getActor("kitchen");
  if (actor?.role === "ADMIN") redirect("/cocina");
  return <KitchenLogin unauthorized={Boolean(actor)} />;
}
