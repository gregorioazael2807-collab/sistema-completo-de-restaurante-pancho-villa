import { db } from "@/lib/db";

export async function GET() {
  try {
    const settings = await db.restaurantSettings.findFirst({ select: { taxRate: true, deliveryFee: true, minDeliveryAmount: true, currency: true, pickupEnabled: true, deliveryEnabled: true, acceptingOrders: true } });
    if (!settings) return Response.json({ error: "CHECKOUT_UNAVAILABLE" }, { status: 503 });
    return Response.json({ taxRate: Number(settings.taxRate), deliveryFee: Number(settings.deliveryFee), minDeliveryAmount: Number(settings.minDeliveryAmount), currency: settings.currency, pickupEnabled: settings.pickupEnabled, deliveryEnabled: settings.deliveryEnabled, acceptingOrders: settings.acceptingOrders }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[checkout:info]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "CHECKOUT_UNAVAILABLE" }, { status: 503 });
  }
}
