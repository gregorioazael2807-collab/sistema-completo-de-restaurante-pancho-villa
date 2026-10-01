import { requireCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { PushOptIn } from "@/components/push-opt-in";
import { AccountDashboard } from "@/components/account-dashboard";

export default async function AccountPage() {
  const user = await requireCurrentUser();
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      publicId: true,
      status: true,
      createdAt: true,
      total: true,
      currency: true,
      items: { select: { productName: true, quantity: true } },
    },
  });
  const locale =
    user.locale === "en" || user.locale === "de" ? user.locale : "es";
  return (
    <>
      <AccountDashboard
        firstName={user.firstName || user.email.split("@")[0]}
        email={user.email}
        role={user.role}
        locale={locale}
        orders={orders.map((order) => ({
          ...order,
          total: order.total.toNumber(),
        }))}
      />
      <PushOptIn locale={locale} />
    </>
  );
}
