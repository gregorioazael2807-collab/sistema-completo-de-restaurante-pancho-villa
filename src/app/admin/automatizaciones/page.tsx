import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { AutomationDashboard } from "@/components/automation-dashboard";

export default async function AutomationPage() {
  const user = await requireCurrentUser("kitchen");
  if (user.role !== "ADMIN") redirect("/cuenta");
  const [pending, sent, failed, processing] = await Promise.all([
    db.automationJob.count({ where: { status: "PENDING" } }),
    db.notification.count({ where: { status: "SENT" } }),
    db.notification.count({ where: { status: "FAILED" } }),
    db.automationJob.count({ where: { status: "PROCESSING" } }),
  ]);
  return <AutomationDashboard locale={user.locale === "en" || user.locale === "de" ? user.locale : "es"} data={{ pending, sent, failed, processing, emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) }} />;
}
