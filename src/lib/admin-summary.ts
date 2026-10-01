import { Temporal } from "@js-temporal/polyfill";
import { db } from "@/lib/db";

export async function getAdminSummary() {
  const settings = await db.restaurantSettings.findFirst({
    select: { timezone: true, currency: true },
  });
  const timezone = settings?.timezone ?? "Europe/Berlin";
  const now = Temporal.Now.zonedDateTimeISO(timezone);
  const startToday = new Date(now.startOfDay().toInstant().epochMilliseconds);
  const startWeek = new Date(
    now
      .subtract({ days: now.dayOfWeek - 1 })
      .startOfDay()
      .toInstant().epochMilliseconds,
  );
  const [
    todayOrders,
    todayCounts,
    clients,
    employees,
    products,
    pendingAutomations,
    failedNotifications,
    weekOrders,
    bestsellers,
  ] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: startToday } },
      select: {
        total: true,
        status: true,
        payment: { select: { status: true, refundedAmount: true } },
      },
    }),
    db.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: startToday } },
      _count: { _all: true },
    }),
    db.user.count({ where: { role: "CLIENTE", active: true } }),
    db.employee.count({ where: { active: true } }),
    db.product.count({ where: { available: true } }),
    db.automationJob.count({ where: { status: "PENDING" } }),
    db.notification.count({ where: { status: "FAILED" } }),
    db.order.findMany({
      where: { createdAt: { gte: startWeek } },
      select: {
        total: true,
        createdAt: true,
        status: true,
        payment: { select: { status: true, refundedAmount: true } },
      },
    }),
    db.orderItem.groupBy({
      by: ["productName"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);
  const count = (status: string) =>
    todayCounts.find((row) => row.status === status)?._count._all ?? 0;
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = now.subtract({ days: now.dayOfWeek - 1 - index }).startOfDay();
    return {
      date: day.toPlainDate().toString(),
      label: new Intl.DateTimeFormat("es", {
        weekday: "short",
        timeZone: timezone,
      }).format(new Date(day.toInstant().epochMilliseconds)),
      sales: 0,
      orders: 0,
    };
  });
  const hourlyDemand = new Map<number, number>();
  for (const order of weekOrders) {
    const zonedOrderTime = Temporal.Instant.from(
      order.createdAt.toISOString(),
    ).toZonedDateTimeISO(timezone);
    const date = zonedOrderTime.toPlainDate().toString();
    const bucket = week.find((day) => day.date === date);
    if (bucket) {
      bucket.orders += 1;
      if (order.payment && ["PAID", "REFUNDED"].includes(order.payment.status))
        bucket.sales +=
          Number(order.total) - Number(order.payment.refundedAmount);
    }
    hourlyDemand.set(
      zonedOrderTime.hour,
      (hourlyDemand.get(zonedOrderTime.hour) ?? 0) + 1,
    );
  }
  const paidToday = todayOrders.filter(
    (order) =>
      order.payment && ["PAID", "REFUNDED"].includes(order.payment.status),
  );
  const totalToday = paidToday.reduce(
    (sum, order) =>
      sum + Number(order.total) - Number(order.payment?.refundedAmount ?? 0),
    0,
  );
  const average = paidToday.length ? totalToday / paidToday.length : 0;
  const peakHour =
    [...hourlyDemand.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    currency: settings?.currency ?? "EUR",
    timezone,
    today: {
      sales: totalToday,
      orders: todayOrders.length,
      average,
      new: count("NUEVO"),
      active:
        count("CONFIRMADO") +
        count("EN_PREPARACION") +
        count("LISTO") +
        count("EN_CAMINO"),
      cancelled: count("CANCELADO"),
      noShows: count("NO_PRESENTADO"),
    },
    clients,
    employees,
    activeProducts: products,
    pendingAutomations,
    failedNotifications,
    week,
    topProducts: bestsellers.map((item) => ({
      name: item.productName,
      quantity: item._sum.quantity ?? 0,
    })),
    peakHour,
  };
}
