import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { AssistantChat } from "@/components/assistant-chat";

export default async function AssistantPage() {
  const user = await requireCurrentUser();
  if (user.role !== "CLIENTE" && user.role !== "ADMIN") redirect("/cuenta");
  return <AssistantChat locale={user.locale === "en" || user.locale === "de" ? user.locale : "es"} firstName={user.firstName} />;
}
