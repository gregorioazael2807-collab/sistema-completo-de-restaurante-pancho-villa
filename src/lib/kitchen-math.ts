export type PrepTask = {
  stationId: string;
  minMinutes: number;
  maxMinutes: number;
  quantity: number;
};
export type PrepItem = {
  id: string;
  orderId: string;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  tasks: PrepTask[] | null;
  unknown: boolean;
};
export function estimateKitchen(
  items: PrepItem[],
  capacities: Record<string, number>,
  now: Date,
) {
  const earliest = new Map<string, number[]>(),
    latest = new Map<string, number[]>();
  const origins: Record<string, number> = {};
  for (const item of items)
    if (item.startedAt && !item.finishedAt)
      for (const task of item.tasks ?? [])
        origins[task.stationId] = Math.min(
          origins[task.stationId] ?? now.getTime(),
          item.startedAt.getTime(),
        );
  const result: Record<string, { from: Date | null; until: Date | null }> = {};
  // Started work occupies slots first; waiting tickets retain FIFO order.
  const ordered = [...items].sort(
    (a, b) =>
      Number(Boolean(b.startedAt)) - Number(Boolean(a.startedAt)) ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  );
  for (const item of ordered) {
    if (item.finishedAt) {
      result[item.id] = { from: item.finishedAt, until: item.finishedAt };
      continue;
    }
    let from = now.getTime(),
      until = now.getTime();
    let unknown = item.unknown || !item.tasks?.length;
    for (const task of item.tasks ?? []) {
      const capacity = capacities[task.stationId];
      if (!Number.isInteger(capacity) || capacity < 1) {
        unknown = true;
        continue;
      }
      if (!earliest.has(task.stationId)) {
        earliest.set(
          task.stationId,
          Array(capacity).fill(origins[task.stationId] ?? now.getTime()),
        );
        latest.set(
          task.stationId,
          Array(capacity).fill(origins[task.stationId] ?? now.getTime()),
        );
      }
      const low = earliest.get(task.stationId)!,
        high = latest.get(task.stationId)!;
      for (let unit = 0; unit < task.quantity; unit++) {
        const li = low.indexOf(Math.min(...low)),
          hi = high.indexOf(Math.min(...high));
        const start = item.startedAt?.getTime() ?? now.getTime();
        low[li] = Math.max(start, low[li]) + task.minMinutes * 60000;
        high[hi] = Math.max(start, high[hi]) + task.maxMinutes * 60000;
        from = Math.max(from, low[li]);
        until = Math.max(until, high[hi]);
      }
    }
    result[item.id] = unknown
      ? { from: null, until: null }
      : { from: new Date(from), until: new Date(until) };
  }
  return result;
}
const conversions: Record<string, { base: string; factor: number }> = {
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  ml: { base: "ml", factor: 1 },
  l: { base: "ml", factor: 1000 },
  unit: { base: "unit", factor: 1 },
};
export function toBaseQuantity(quantity: number, unit: string, base: string) {
  const conversion = conversions[unit];
  if (!conversion || conversion.base !== base || !Number.isFinite(quantity))
    throw Error("INVALID_UNIT");
  const value = quantity * conversion.factor;
  if (Math.abs(value * 1000 - Math.round(value * 1000)) > 0.00001)
    throw Error("PRECISION_EXCEEDED");
  if (base === "unit" && !Number.isInteger(value)) throw Error("INVALID_UNIT");
  return Math.round(value * 1000) / 1000;
}
export function straightDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const x =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function deliveryBand(km: number) {
  return !Number.isFinite(km) || km < 0 || km > 7
    ? null
    : Math.max(1, Math.ceil(km));
}
export function arrivalWindow(
  ready: Date | null,
  readyUntil: Date | null,
  dispatchMin: number | null,
  dispatchMax: number | null,
  travelMin: number | null,
  travelMax: number | null,
  departedAt: Date | null = null,
) {
  if (travelMin === null || travelMax === null)
    return { from: null, until: null };
  if (departedAt)
    return {
      from: new Date(departedAt.getTime() + travelMin * 1000),
      until: new Date(departedAt.getTime() + travelMax * 1000),
    };
  if (!ready || !readyUntil || dispatchMin === null || dispatchMax === null)
    return { from: null, until: null };
  return {
    from: new Date(ready.getTime() + dispatchMin * 60000 + travelMin * 1000),
    until: new Date(
      readyUntil.getTime() + dispatchMax * 60000 + travelMax * 1000,
    ),
  };
}
