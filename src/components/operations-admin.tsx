"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/locale";
import { kitchenCopy } from "@/lib/kitchen-copy";
import "../app/operations.css";
type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock: string;
  reserved: string;
  minimum: string;
  unitCostCents: string;
};
type AdminData = {
  recipeReferences?: {
    productId: string;
    quantity: number;
    count: number;
    averageMinutes: number;
    minimumMinutes: number;
    maximumMinutes: number;
    observedAt: string;
  }[];
  ingredients: Ingredient[];
  stations: { id: string; name: string; capacity: number }[];
  recipes: {
    id: string;
    productId: string | null;
    modifierId: string | null;
    stationId: string;
    minMinutes: number;
    maxMinutes: number;
    ingredients: { ingredientId: string; quantity: string }[];
  }[];
  products: { id: string; name: string; available: boolean }[];
  modifiers: { id: string; name: string }[];
  movements: {
    id: string;
    kind: string;
    quantity: string;
    note: string;
    createdAt: string;
    ingredient: { name: string; unit: string };
  }[];
  settings: {
    latitude: string | null;
    longitude: string | null;
    dispatchMinMinutes: number | null;
    dispatchMaxMinutes: number | null;
  } | null;
  shifts: {
    id: string;
    openedAt: string;
    closedAt: string | null;
    differenceCents: number | null;
    summary: { effectiveMinutes?: number; prepared?: number } | null;
  }[];
  routeReferences?: {
    band: number;
    minSeconds: number;
    maxSeconds: number;
    method: string;
    mode: string;
    createdAt: string;
  }[];
};
type Sale = {
  publicId: string;
  status: string;
  currency: string;
  total: string;
  ingredientCostCents: number | null;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  deliveryFee: string;
  payment: {
    status: string;
    method: string | null;
    refundedAmount: string;
  } | null;
  items: {
    productName: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
};
type SalesData = {
  orders: Sale[];
  count: number;
  truncated: boolean;
  currencies: Record<
    string,
    {
      pendingCents: number;
      collectedCents: number;
      refundedCents: number;
      ingredientCostCents: number;
      ingredientMarginCents: number;
      unknownCosts: number;
    }
  >;
};
export function OperationsAdmin({
  locale,
  mode,
}: {
  locale: Locale;
  mode: "inventory" | "sales";
}) {
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const t = kitchenCopy[locale];
  const [data, setData] = useState<AdminData | null>(null),
    [sales, setSales] = useState<SalesData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [recipeLines, setRecipeLines] = useState<
      { ingredientId: string; quantity: number; unit: string }[]
    >([]),
    [recipeTarget, setRecipeTarget] = useState("");
  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        fetch("/api/admin/operations", { cache: "no-store" }),
        mode === "sales"
          ? fetch("/api/admin/sales", { cache: "no-store" })
          : Promise.resolve(null),
      ]);
      if (!r.ok || (s && !s.ok)) throw Error();
      setData(await r.json());
      if (s) setSales(await s.json());
    } catch {
      setError(t.error);
    }
  }, [mode, t.error]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(
    body: Record<string, unknown>,
    url = "/api/admin/operations",
  ) {
    if (typeof body.requestId === "string") {
      const { requestId: _, ...fields } = body;
      void _;
      const signature = JSON.stringify(fields);
      if (!pending.current || pending.current.signature !== signature)
        pending.current = { signature, id: body.requestId };
      body = { ...body, requestId: pending.current.id };
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json();
        throw Error(e.error);
      }
      pending.current = null;
      setMessage(t.saved);
      await load();
    } catch (e) {
      setError(`${t.error}: ${e instanceof Error ? e.message : ""}`);
    } finally {
      setBusy(false);
    }
  }
  const values = (form: HTMLFormElement) =>
    Object.fromEntries(new FormData(form).entries());
  const money = (cents: number, currency = "EUR") =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(
      cents / 100,
    );
  const date = (value: string) => new Date(value).toLocaleString(locale);
  const ingredientOptions = data?.ingredients.map((i) => (
    <option key={i.id} value={i.id}>
      {i.name} ({i.unit})
    </option>
  ));
  const input = (
    label: string,
    name: string,
    type = "text",
    value?: string | number,
  ) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        required
        defaultValue={value}
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
  return (
    <main className="operations-page">
      <header>
        <Link href="/cocina">← {t.back}</Link>
        <h1>{mode === "inventory" ? t.inventory : t.sales}</h1>
        <nav>
          <Link href="/admin/inventario">{t.inventory}</Link>
          <Link href="/admin/ventas">{t.sales}</Link>
        </nav>
      </header>
      {error && (
        <p role="alert" className="kitchen-alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {mode === "inventory" ? (
        <>
          <div className="operations-grid">
            <section>
              <h2>{t.stations}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = values(e.currentTarget);
                  void submit({
                    action: "STATION",
                    name: v.name,
                    capacity: Number(v.capacity),
                  });
                }}
              >
                {input(t.name, "name")}
                {input(t.capacity, "capacity", "number", 1)}
                <button disabled={busy}>{t.save}</button>
              </form>
              {data?.stations.map((s) => (
                <form
                  key={s.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = values(e.currentTarget);
                    void submit({
                      action: "STATION",
                      id: s.id,
                      name: s.name,
                      capacity: Number(v.capacity),
                    });
                  }}
                >
                  <strong>{s.name}</strong>
                  {input(t.capacity, "capacity", "number", s.capacity)}
                  <button disabled={busy}>{t.save}</button>
                </form>
              ))}
            </section>
            <section>
              <h2>{t.ingredient}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = values(e.currentTarget);
                  void submit({
                    action: "INGREDIENT",
                    name: v.name,
                    unit: v.unit,
                    minimum: Number(v.minimum),
                    unitCostCents: Number(v.cost),
                  });
                }}
              >
                {input(t.name, "name")}
                <label>
                  {t.unit}
                  <select name="unit">
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="unit">unit</option>
                  </select>
                </label>
                {input(t.minimum, "minimum", "number", 0)}
                {input(t.cost, "cost", "number", 0)}
                <button disabled={busy}>{t.save}</button>
              </form>
            </section>
            <section>
              <h2>{t.movement}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = values(e.currentTarget);
                  void submit({
                    action: "MOVEMENT",
                    requestId: crypto.randomUUID(),
                    ingredientId: v.ingredientId,
                    kind: v.kind,
                    quantity: Number(v.quantity),
                    unit: v.unit,
                    ...(v.cost !== "" ? { unitCostCents: Number(v.cost) } : {}),
                    note: v.note,
                  });
                }}
              >
                <label>
                  {t.ingredient}
                  <select name="ingredientId" required>
                    {ingredientOptions}
                  </select>
                </label>
                <label>
                  {t.movement}
                  <select name="kind">
                    <option value="PURCHASE">{t.purchase}</option>
                    <option value="ENTRY">{t.entry}</option>
                    <option value="ADJUSTMENT">{t.adjustment}</option>
                    <option value="WASTE">{t.waste}</option>
                  </select>
                </label>
                {input(t.quantity, "quantity", "number")}
                <label>
                  {t.unit}
                  <select name="unit">
                    {["g", "kg", "ml", "l", "unit"].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.cost}
                  <input name="cost" type="number" step="any" />
                </label>
                {input(t.note, "note")}
                <button disabled={busy || !data?.ingredients.length}>
                  {t.save}
                </button>
              </form>
            </section>
          </div>
          <section>
            <h2>{t.stock}</h2>
            <div className="operations-table">
              <table>
                <thead>
                  <tr>
                    <th>{t.ingredient}</th>
                    <th>{t.stock}</th>
                    <th>{t.reserved}</th>
                    <th>{t.minimum}</th>
                    <th>{t.cost}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.ingredients.map((i) => (
                    <tr key={i.id}>
                      <td>{i.name}</td>
                      <td>
                        {i.stock} {i.unit}
                      </td>
                      <td>{i.reserved}</td>
                      <td>{i.minimum}</td>
                      <td>{i.unitCostCents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2>{t.recipes}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = values(e.currentTarget);
                const [kind, targetId] = String(v.target).split(":");
                void submit({
                  action: "RECIPE",
                  [kind === "product" ? "productId" : "modifierId"]: targetId,
                  stationId: v.stationId,
                  minMinutes: Number(v.min),
                  maxMinutes: Number(v.max),
                  ingredients: recipeLines,
                });
              }}
            >
              <div className="operations-grid">
                <label>
                  {t.product}
                  <select
                    name="target"
                    required
                    value={recipeTarget}
                    onChange={(e) => {
                      setRecipeTarget(e.target.value);
                      setRecipeLines([]);
                    }}
                  >
                    <option value="">—</option>
                    {data?.products.map((p) => (
                      <option value={`product:${p.id}`} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                    {data?.modifiers.map((m) => (
                      <option value={`modifier:${m.id}`} key={m.id}>
                        + {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.station}
                  <select name="stationId" required>
                    {data?.stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                {input(t.min, "min", "number")}
                {input(t.max, "max", "number")}
              </div>
              {recipeLines.map((line, index) => (
                <div className="operations-recipe-line" key={line.ingredientId}>
                  <span>
                    {
                      data?.ingredients.find((i) => i.id === line.ingredientId)
                        ?.name
                    }
                  </span>
                  <input
                    aria-label={`${t.quantity} ${index + 1}`}
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={line.quantity}
                    onChange={(e) =>
                      setRecipeLines((lines) =>
                        lines.map((l, i) =>
                          i === index
                            ? { ...l, quantity: Number(e.target.value) }
                            : l,
                        ),
                      )
                    }
                  />
                  <span>{line.unit}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setRecipeLines((lines) =>
                        lines.filter((_, i) => i !== index),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <label>
                {t.ingredient}
                <select
                  value=""
                  onChange={(e) => {
                    const i = data?.ingredients.find(
                      (i) => i.id === e.target.value,
                    );
                    if (i && !recipeLines.some((l) => l.ingredientId === i.id))
                      setRecipeLines((lines) => [
                        ...lines,
                        { ingredientId: i.id, quantity: 1, unit: i.unit },
                      ]);
                  }}
                >
                  <option value="">+</option>
                  {ingredientOptions}
                </select>
              </label>
              <button disabled={busy || !recipeLines.length}>{t.save}</button>
            </form>
            <div className="operations-table">
              <table>
                <tbody>
                  {data?.recipes.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {data.products.find((p) => p.id === r.productId)
                          ?.name ??
                          data.modifiers.find((m) => m.id === r.modifierId)
                            ?.name}
                      </td>
                      <td>
                        {data.stations.find((s) => s.id === r.stationId)?.name}
                      </td>
                      <td>
                        {r.minMinutes}–{r.maxMinutes} {t.minutes}
                      </td>
                      <td>
                        {r.ingredients
                          .map(
                            (l) =>
                              `${data.ingredients.find((i) => i.id === l.ingredientId)?.name}: ${l.quantity}`,
                          )
                          .join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2>
              {locale === "es"
                ? "Tiempos reales observados"
                : locale === "en"
                  ? "Observed preparation times"
                  : "Gemessene Zubereitungszeiten"}
            </h2>
            {data?.recipeReferences?.map((r) => (
              <p key={`${r.productId}:${r.quantity}`}>
                {data.products.find((p) => p.id === r.productId)?.name} ·{" "}
                {r.quantity}× · {t.samples}: {r.count} ·{" "}
                {r.minimumMinutes.toFixed(1)}–{r.maximumMinutes.toFixed(1)}{" "}
                {t.minutes} · Ø {r.averageMinutes.toFixed(1)} ·{" "}
                {date(r.observedAt)}
              </p>
            ))}
          </section>
          <section>
            <h2>{t.product}</h2>
            <div className="operations-products">
              {data?.products.map((p) => (
                <button
                  disabled={busy}
                  key={p.id}
                  onClick={() =>
                    void submit({
                      action: "SOLD_OUT",
                      productId: p.id,
                      available: !p.available,
                    })
                  }
                >
                  {p.name} · {p.available ? t.available : t.soldOut}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2>{t.location}</h2>
            <p>{t.coveragePending}</p>
            <form
              key={JSON.stringify(data?.settings)}
              onSubmit={(e) => {
                e.preventDefault();
                const v = values(e.currentTarget);
                void submit({
                  action: "LOCATION",
                  latitude: Number(v.latitude),
                  longitude: Number(v.longitude),
                  dispatchMinMinutes: Number(v.min),
                  dispatchMaxMinutes: Number(v.max),
                });
              }}
            >
              <div className="operations-grid">
                {input(
                  t.latitude,
                  "latitude",
                  "number",
                  data?.settings?.latitude ?? "",
                )}
                {input(
                  t.longitude,
                  "longitude",
                  "number",
                  data?.settings?.longitude ?? "",
                )}
                {input(
                  t.dispatchMin,
                  "min",
                  "number",
                  data?.settings?.dispatchMinMinutes ?? "",
                )}
                {input(
                  t.dispatchMax,
                  "max",
                  "number",
                  data?.settings?.dispatchMaxMinutes ?? "",
                )}
              </div>
              <button disabled={busy}>{t.save}</button>
            </form>
            <h3>{t.route}</h3>
            {[1, 2, 3, 4, 5, 6, 7].map((band) => {
              const rows =
                data?.routeReferences?.filter((r) => r.band === band) ?? [];
              return (
                <p key={band}>
                  {band - 1}–{band} km · {t.samples}: {rows.length} ·{" "}
                  {rows.length
                    ? `${Math.round(Math.min(...rows.map((r) => r.minSeconds)) / 60)}–${Math.round(Math.max(...rows.map((r) => r.maxSeconds)) / 60)} ${t.minutes} · ${rows[0].method} · ${date(rows[0].createdAt)}`
                    : t.pending}
                </p>
              );
            })}
          </section>
          <section>
            <h2>{t.history}</h2>
            {data?.movements.map((m) => (
              <p key={m.id}>
                {date(m.createdAt)} · {m.ingredient.name} · {m.kind} ·{" "}
                {m.quantity} {m.ingredient.unit} · {m.note}
              </p>
            ))}
          </section>
        </>
      ) : (
        <>
          <p className="kitchen-note">{t.fiscal}</p>
          <form
            className="operations-filter"
            onSubmit={async (e) => {
              e.preventDefault();
              const v = values(e.currentTarget);
              setBusy(true);
              try {
                const r = await fetch(
                  `/api/admin/sales?from=${encodeURIComponent(new Date(String(v.from)).toISOString())}&until=${encodeURIComponent(new Date(String(v.until)).toISOString())}`,
                );
                if (!r.ok) throw Error();
                setSales(await r.json());
              } catch {
                setError(t.error);
              } finally {
                setBusy(false);
              }
            }}
          >
            {input(t.from, "from", "datetime-local")}
            {input(t.until, "until", "datetime-local")}
            <button disabled={busy}>{t.refresh}</button>
          </form>
          {sales?.truncated && <p role="alert">{t.partial}</p>}
          {Object.entries(sales?.currencies ?? {}).map(([currency, s]) => (
            <section key={currency}>
              <h2>{currency}</h2>
              <div className="operations-grid">
                <p>
                  {t.collected}: <b>{money(s.collectedCents, currency)}</b>
                </p>
                <p>
                  {t.paymentPending}: <b>{money(s.pendingCents, currency)}</b>
                </p>
                <p>
                  {t.refunded}: <b>{money(s.refundedCents, currency)}</b>
                </p>
                <p>
                  {t.margin}: <b>{money(s.ingredientMarginCents, currency)}</b>
                </p>
                <p>
                  {t.unknownCosts}: {s.unknownCosts}
                </p>
              </div>
            </section>
          ))}
          <section>
            <h2>{t.payments}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!confirm(t.confirm)) return;
                const v = values(e.currentTarget);
                void submit({
                  action: "PAYMENT",
                  requestId: crypto.randomUUID(),
                  publicId: v.publicId,
                  kind: v.kind,
                  method: v.method,
                  amountCents: Math.round(Number(v.amount) * 100),
                });
              }}
            >
              <div className="operations-grid">
                {input(t.order, "publicId")}
                <label>
                  {t.payments}
                  <select name="kind">
                    <option value="CAPTURE">{t.capture}</option>
                    <option value="REFUND">{t.refund}</option>
                  </select>
                </label>
                <label>
                  {t.method}
                  <select name="method">
                    <option value="CASH">{t.cash}</option>
                    <option value="CARD">{t.card}</option>
                    <option value="OTHER">{t.other}</option>
                  </select>
                </label>
                {input(t.amount, "amount", "number")}
              </div>
              <button disabled={busy}>{t.save}</button>
            </form>
          </section>
          <section>
            <h2>{t.shift}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = values(e.currentTarget);
                void submit(
                  {
                    action: "OPEN",
                    openingCashCents: Math.round(Number(v.cash) * 100),
                  },
                  "/api/kitchen/shift",
                );
              }}
            >
              {input(t.openingCash, "cash", "number", 0)}
              <button disabled={busy}>{t.openShift}</button>
            </form>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!confirm(t.confirm)) return;
                const v = values(e.currentTarget);
                void submit(
                  {
                    action: "CLOSE",
                    countedCashCents: Math.round(Number(v.cash) * 100),
                  },
                  "/api/kitchen/shift",
                );
              }}
            >
              {input(t.countedCash, "cash", "number")}
              <button disabled={busy}>{t.closeShift}</button>
            </form>
            {data?.shifts.map((s) => (
              <p key={s.id}>
                {date(s.openedAt)} — {s.closedAt ? date(s.closedAt) : t.open} ·{" "}
                {t.prepared}: {s.summary?.prepared ?? "—"} · {t.effective}:{" "}
                {s.summary?.effectiveMinutes?.toFixed(1) ?? "—"} {t.minutes} ·{" "}
                {t.difference}:{" "}
                {s.differenceCents === null ? "—" : money(s.differenceCents)}
              </p>
            ))}
          </section>
          <section>
            <h2>{t.wasteCooked}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = values(e.currentTarget);
                void submit({
                  action: "COOKED_WASTE",
                  requestId: crypto.randomUUID(),
                  publicId: v.publicId,
                  note: v.note,
                });
              }}
            >
              {input(t.order, "publicId")}
              {input(t.note, "note")}
              <button disabled={busy}>{t.save}</button>
            </form>
          </section>
          <section>
            <h2>{t.order}</h2>
            <div className="operations-table">
              <table>
                <thead>
                  <tr>
                    <th>{t.order}</th>
                    <th>{t.status}</th>
                    <th>{t.amount}</th>
                    <th>{t.payments}</th>
                    <th>{t.cost}</th>
                  </tr>
                </thead>
                <tbody>
                  {sales?.orders.map((o) => (
                    <tr key={o.publicId}>
                      <td>
                        <strong>{o.publicId}</strong>
                        {o.items.map((i, index) => (
                          <p key={index}>
                            {i.quantity}× {i.productName} · {i.unitPrice}
                          </p>
                        ))}
                        <small>
                          {o.subtotal} + {o.taxAmount} + {o.deliveryFee} −{" "}
                          {o.discountAmount}
                        </small>
                      </td>
                      <td>{o.status}</td>
                      <td>
                        {o.total} {o.currency}
                      </td>
                      <td>
                        {o.payment?.status} · {o.payment?.method ?? "—"}
                        <p>
                          {t.refunded}: {o.payment?.refundedAmount ?? 0}
                        </p>
                      </td>
                      <td>
                        {o.ingredientCostCents === null
                          ? t.pending
                          : money(o.ingredientCostCents, o.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
