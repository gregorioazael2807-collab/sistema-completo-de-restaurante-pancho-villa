import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { normalizeLocalePreference } from "@/lib/locale";
import { OrderTracking } from "@/components/order-tracking";
export default async function Page({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireCurrentUser();
  const { publicId } = await params;
  const order = await db.order.findFirst({
    where: {
      publicId,
      ...(user.role === "ADMIN" || user.role === "COCINA"
        ? {}
        : { userId: user.id }),
    },
    select: { id: true },
  });
  if (!order) notFound();
  return (
    <OrderTracking
      publicId={publicId}
      locale={normalizeLocalePreference(user.locale)}
    />
  );
}
