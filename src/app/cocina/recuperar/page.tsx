import { KitchenRecovery } from "@/components/kitchen-recovery";
import "../../kitchen.css";

export default function KitchenRecoveryPage() {
  return <KitchenRecovery emailConfigured={Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)} />;
}
