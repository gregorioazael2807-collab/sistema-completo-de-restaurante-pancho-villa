import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { straightDistanceKm, deliveryBand } from "@/lib/kitchen-math";
export const deliveryAddress = z.object({
  recipient: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(3).max(180),
  line2: z.string().trim().max(180).optional(),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(20),
  countryCode: z.string().length(2).default("DE"),
  deliveryNote: z.string().trim().max(1000).optional(),
});
export function addressHash(
  address: z.infer<typeof deliveryAddress>,
  actorId: string,
) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        [
          actorId,
          address.line1,
          address.line2 ?? "",
          address.city,
          address.postalCode,
          address.countryCode,
        ].map((v) => v.trim().toLowerCase()),
      ),
    )
    .digest("hex");
}
const routeResponse = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  routeMeters: z.number().int().positive(),
  minSeconds: z.number().int().positive(),
  maxSeconds: z.number().int().positive(),
  method: z.string().min(1).max(100),
  mode: z.enum(["motorcycle", "driving"]),
  matchedAddress: z.string().min(1).max(500),
});
export async function quoteDelivery(
  address: z.infer<typeof deliveryAddress>,
  actorId: string,
) {
  const settings = await db.restaurantSettings.findFirst();
  if (settings?.latitude === null || settings?.longitude === null || !settings)
    throw Error("LOCATION_NOT_CONFIGURED");
  const endpoint = process.env.DELIVERY_ROUTING_ENDPOINT;
  const key = process.env.DELIVERY_ROUTING_KEY;
  if (!endpoint || !key) throw Error("ROUTE_NOT_CONFIGURED");
  const url = new URL(endpoint);
  if (url.protocol !== "https:") throw Error("ROUTE_NOT_CONFIGURED");
  // This adapter is deliberately unconfigured. No paid geocoder is called without configuration.
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      origin: {
        latitude: Number(settings.latitude),
        longitude: Number(settings.longitude),
      },
      address: {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        postalCode: address.postalCode,
        countryCode: address.countryCode,
      },
      preferredMode: "motorcycle",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error("ROUTE_NOT_CONFIGURED");
  const route = routeResponse.parse(await response.json());
  if (route.maxSeconds < route.minSeconds) throw Error("INVALID_QUOTE");
  const km = straightDistanceKm(
    {
      latitude: Number(settings.latitude),
      longitude: Number(settings.longitude),
    },
    route,
  );
  const band = deliveryBand(km);
  if (band === null) throw Error("OUTSIDE_COVERAGE");
  const quote = await db.deliveryQuote.create({
    data: {
      addressHash: addressHash(address, actorId),
      latitude: route.latitude,
      longitude: route.longitude,
      straightKm: km,
      band,
      routeMeters: route.routeMeters,
      minSeconds: route.minSeconds,
      maxSeconds: route.maxSeconds,
      method: route.method,
      mode: route.mode,
      expiresAt: new Date(Date.now() + 15 * 60000),
    },
  });
  await db.routeReference.create({
    data: {
      band,
      minSeconds: route.minSeconds,
      maxSeconds: route.maxSeconds,
      routeMeters: route.routeMeters,
      method: route.method,
      mode: route.mode,
    },
  });
  return {
    id: quote.id,
    band,
    straightKm: km,
    routeMeters: route.routeMeters,
    minSeconds: route.minSeconds,
    maxSeconds: route.maxSeconds,
    mode: route.mode,
    method: route.method,
    matchedAddress: route.matchedAddress,
    expiresAt: quote.expiresAt,
  };
}
