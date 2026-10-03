"use client";

import { useEffect, useRef } from "react";
import type { DailySales } from "@/lib/kitchen-daily-sales";
import type { Locale } from "@/lib/locale";

export function KitchenSalesClose({ sales, locale, onClose }: { sales: DailySales; locale: Locale; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const money = (cents: number, currency: string) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  return <dialog ref={dialog} className="kitchen-sales-dialog" onClose={onClose}>
    <h2>Cierre de ventas · {sales.date}</h2>
    <p>Comandas entregadas hasta {new Date(sales.through).toLocaleTimeString(locale, { timeZone: sales.timezone })} · {sales.timezone}</p>
    {!sales.currencies.length && <p>No hay comandas entregadas en este día.</p>}
    {sales.currencies.map((group) => <section key={group.currency}>
      <h3>{group.currency} · {group.orders} comandas · {group.quantity} productos</h3>
      <table><thead><tr><th>Producto y extras</th><th>Cantidad</th><th>Importe</th></tr></thead><tbody>{group.products.map((row, index) => <tr key={index}><td>{row.name}</td><td>{row.quantity}</td><td>{money(row.totalCents, group.currency)}</td></tr>)}</tbody></table>
      <dl>
        <dt>Productos, incluidos extras</dt><dd>{money(group.subtotalCents, group.currency)}</dd>
        <dt>Descuentos</dt><dd>−{money(group.discountCents, group.currency)}</dd>
        <dt>Impuestos</dt><dd>{money(group.taxCents, group.currency)}</dd>
        <dt>Reparto</dt><dd>{money(group.deliveryCents, group.currency)}</dd>
        <dt><strong>Total vendido</strong></dt><dd><strong>{money(group.totalCents, group.currency)}</strong></dd>
      </dl>
    </section>)}
    <p>Este es el cierre de ventas, no una confirmación de pagos ni del efectivo físico. Es acumulado del día hasta este cierre; no sumes dos cierres del mismo día.</p>
    <button type="button" onClick={() => dialog.current?.close()}>Volver a cocina</button>
  </dialog>;
}
