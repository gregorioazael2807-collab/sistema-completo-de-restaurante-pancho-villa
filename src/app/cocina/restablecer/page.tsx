import { KitchenRecovery } from "@/components/kitchen-recovery";
import "../../kitchen.css";

export default async function KitchenResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <KitchenRecovery reset token={token ?? ""} />;
}
