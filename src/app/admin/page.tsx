import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { getAdminSummary } from "@/lib/admin-summary";
import { AdminDashboard } from "@/components/admin-dashboard";

export default async function AdminPage() {
  const user = await requireCurrentUser("kitchen");
  if (user.role !== "ADMIN") redirect("/cuenta");
  const summary = await getAdminSummary();
  return <AdminDashboard data={summary} locale={user.locale === "en" || user.locale === "de" ? user.locale : "es"} />;
}
