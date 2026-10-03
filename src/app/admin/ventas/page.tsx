import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { normalizeLocalePreference } from "@/lib/locale";
import { OperationsAdmin } from "@/components/operations-admin";
export default async function Page() {
  const user = await requireCurrentUser("kitchen");
  if (user.role !== "ADMIN") redirect("/cuenta");
  return (
    <OperationsAdmin
      locale={normalizeLocalePreference(user.locale)}
      mode="sales"
    />
  );
}
