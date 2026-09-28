"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CircleCheck, Clock3, Flame, LoaderCircle } from "lucide-react";
import "../../checkout.css";

type Order = { publicId: string; type: "PICKUP" | "DELIVERY"; status: string; createdAt: string; estimatedReadyAt: string | null; items: { productName: string; quantity: number; instructions: string | null; modifiers: { modifierName: string }[] }[]; statusHistory: { to: string; createdAt: string }[] };
const stages = ["NUEVO", "CONFIRMADO", "EN_PREPARACION", "LISTO", "EN_CAMINO", "ENTREGADO"];
const statusText: Record<string, string> = { NUEVO: "Recibido", CONFIRMADO: "Confirmado", EN_PREPARACION: "En preparación", LISTO: "Listo", EN_CAMINO: "En camino", ENTREGADO: "Entregado", CANCELADO: "Cancelado" };

export default function TrackOrderPage({ params }: { params: Promise<{ publicId: string }> }) {
  const [publicId, setPublicId] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { void params.then(({ publicId: value }) => setPublicId(value)); }, [params]);
  useEffect(() => {
    if (!publicId) return;
    let active = true;
    const load = () => fetch(`/api/orders/${publicId}`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<Order>; }).then((data) => { if (active) { setOrder(data); setFailed(false); } }).catch(() => { if (active) setFailed(true); });
    void load();
    const timer = window.setInterval(() => { if (order?.status !== "ENTREGADO" && order?.status !== "CANCELADO") void load(); }, 12_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [publicId, order?.status]);
  return <main className="checkout-shell tracking-page"><header className="checkout-head"><Link href="/menu"><ArrowLeft size={17} />Menú</Link><span className="brand-mark"><Flame size={18} /></span></header><section className="tracking-card"><p className="eyebrow">PANCHO VILLA · BERLIN</p><h1>Seguimiento del pedido</h1>{failed && <p role="alert">No encontramos el pedido o no se pudo conectar. Revisa el enlace e inténtalo de nuevo.</p>}{!order && !failed && <p className="catalog-status"><LoaderCircle className="spin-icon" /> Cargando pedido…</p>}{order && <><div className="tracking-number"><span>Número de pedido</span><strong>{order.publicId}</strong><span>{order.type === "PICKUP" ? "Recogida" : "Entrega"}</span></div>{order.status === "CANCELADO" ? <p className="tracking-cancelled">El pedido fue cancelado.</p> : <ol className="tracking-stages">{stages.filter((stage) => stage !== "EN_CAMINO" || order.type === "DELIVERY").map((stage, index) => { const current = stages.indexOf(order.status); const completed = current >= stages.indexOf(stage); return <li className={completed ? "done" : ""} key={stage}><span>{completed ? <CircleCheck size={19} /> : index === current + 1 ? <Clock3 size={18} /> : <i />}</span><b>{statusText[stage]}</b></li>; })}</ol>}<div className="tracking-items"><h2>Tu pedido</h2>{order.items.map((item, i) => <p key={`${item.productName}-${i}`}><strong>{item.quantity} × {item.productName}</strong>{item.modifiers.length > 0 && <small>{item.modifiers.map((m) => m.modifierName).join(" · ")}</small>}{item.instructions && <small>{item.instructions}</small>}</p>)}</div><p className="tracking-refresh">Actualizamos el estado automáticamente.</p></>}</section></main>;
}
