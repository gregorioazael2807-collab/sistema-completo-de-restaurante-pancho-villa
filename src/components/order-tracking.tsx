"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/locale";
import { kitchenCopy } from "@/lib/kitchen-copy";
import "../app/checkout.css";
type Order = {
  publicId: string;
  type: string;
  status: string;
  estimatedReadyAt: string | null;
  estimatedReadyUntil: string | null;
  estimatedArrivalAt: string | null;
  estimatedArrivalUntil: string | null;
  items: {
    productName: string;
    quantity: number;
    instructions: string | null;
    modifiers: { modifierName: string }[];
  }[];
};
export function OrderTracking({
  publicId,
  locale,
}: {
  publicId: string;
  locale: Locale;
}) {
  const t = kitchenCopy[locale];
  const [order, setOrder] = useState<Order | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/orders/${publicId}`, { cache: "no-store" });
        if (!r.ok) throw Error();
        const data = await r.json();
        if (active) {
          setOrder(data);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 7000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [publicId]);
  const status = (value: string) =>
    ({
      NUEVO: t.new,
      CONFIRMADO: t.accept,
      EN_PREPARACION: t.cooking,
      LISTO: t.ready,
      EN_CAMINO: t.dispatch,
      ENTREGADO: t.delivered,
      CANCELADO: t.cancel,
      NO_PRESENTADO: t.noShow,
    })[value] ?? value;
  const range = (from: string | null, until: string | null) =>
    from && until
      ? `${new Date(from).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}–${new Date(until).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`
      : t.pending;
  return (
    <main className="checkout-shell tracking-page">
      <Link href="/cuenta">← {t.order}</Link>
      <section className="tracking-card">
        <p className="eyebrow">PANCHO VILLA</p>
        <h1>
          {t.order} {publicId}
        </h1>
        {failed && <p role="alert">{t.connection}</p>}
        {order && (
          <>
            <p>
              {order.type === "PICKUP" ? t.pickup : t.delivery} ·{" "}
              <strong>{status(order.status)}</strong>
            </p>
            {!["ENTREGADO", "CANCELADO", "NO_PRESENTADO"].includes(
              order.status,
            ) && (
              <p>
                {order.type === "DELIVERY"
                  ? locale === "es"
                    ? "Llegada aproximada"
                    : locale === "en"
                      ? "Estimated arrival"
                      : "Geschätzte Ankunft"
                  : t.estimated}
                :{" "}
                <b>
                  {order.type === "DELIVERY"
                    ? range(
                        order.estimatedArrivalAt,
                        order.estimatedArrivalUntil,
                      )
                    : range(order.estimatedReadyAt, order.estimatedReadyUntil)}
                </b>
              </p>
            )}
            <div className="tracking-items">
              {order.items.map((i, index) => (
                <p key={index}>
                  <strong>
                    {i.quantity}× {i.productName}
                  </strong>
                  {i.modifiers.map((m, j) => (
                    <small key={j}>+ {m.modifierName}</small>
                  ))}
                  {i.instructions && <small>{i.instructions}</small>}
                </p>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
