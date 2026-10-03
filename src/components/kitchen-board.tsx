"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, RefreshCw } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { kitchenCopy } from "@/lib/kitchen-copy";
import type { DailySales } from "@/lib/kitchen-daily-sales";
import { KitchenSalesClose } from "@/components/kitchen-sales-close";
import { logoutKitchen } from "@/app/cocina/auth-actions";
import {
  KitchenMariachi,
  type MariachiState,
} from "@/components/kitchen-mariachi";
import "../app/kitchen.css";
type Item = {
  id: string;
  productName: string;
  quantity: number;
  instructions: string | null;
  allergens: string[];
  allergensRecorded: boolean;
  stationName: string | null;
  cookStatus: string;
  assignedTo: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  estimatedAt: string | null;
  estimatedUntil: string | null;
  modifiers: { modifierName: string }[];
};
type Ticket = {
  publicId: string;
  type: "PICKUP" | "DELIVERY";
  status: string;
  createdAt: string;
  notes: string | null;
  deliveryNote: string | null;
  estimatedReadyAt: string | null;
  estimatedReadyUntil: string | null;
  inventoryComplete: boolean;
  preparationDeadlineAt: string | null;
  items: Item[];
  statusHistory: { to: string; createdAt: string; changedBy: string | null }[];
};
type Snapshot = {
  orders: Ticket[];
  canManage: boolean;
  canMarkNoShow: boolean;
  settings: {
    acceptingOrders: boolean;
    timezone: string;
    serviceMode: string;
  } | null;
  shift: {
    id: string;
    openedAt: string;
    pauses: { startedAt: string; endedAt: string | null }[];
  } | null;
  lastClosedShift: { id: string; closedAt: string; summary: { dailySales?: DailySales } | null } | null;
  lowStock: {
    id: string;
    name: string;
    stock: number;
    reserved: number;
    unit: string;
  }[];
  staff: { id: string; firstName: string; lastName: string }[];
  events: { id: string; kind: string; publicId?: string }[];
  mariachiResource: string | null;
};
export function KitchenBoard({
  locale,
  actorId,
}: {
  locale: Locale;
  actorId: string;
}) {
  const router = useRouter();
  const t = kitchenCopy[locale];
  const [data, setData] = useState<Snapshot | null>(null),
    [failed, setFailed] = useState(false),
    [transport, setTransport] = useState("poll"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now()),
    [animations, setAnimations] = useState(true),
    [sound, setSound] = useState(false),
    [pulse, setPulse] = useState<MariachiState>("idle"),
    [assignees, setAssignees] = useState<Record<string, string>>({});
  const [selectedTickets, setSelectedTickets] = useState<Record<string, string>>({});
  const [showSalesClose, setShowSalesClose] = useState(false);
  const seen = useRef<Set<string>>(new Set()),
    initialized = useRef(false),
    audio = useRef<AudioContext | null>(null),
    soundRef = useRef(false),
    pulseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    lastReceived = useRef(0);
  const ingest = useCallback(
    (snapshot: Snapshot) => {
      if (!navigator.onLine) {
        setFailed(true);
        return;
      }
      setData(snapshot);
      setFailed(false);
      lastReceived.current = Date.now();
      if (!initialized.current) {
        try {
          seen.current = new Set(
            JSON.parse(
              sessionStorage.getItem(`kitchen-events:${actorId}`) ?? "[]",
            ),
          );
        } catch {}
        if (!seen.current.size)
          for (const e of snapshot.events) seen.current.add(e.id);
        initialized.current = true;
      }
      const fresh = snapshot.events.filter((e) => !seen.current.has(e.id));
      for (const e of snapshot.events) seen.current.add(e.id);
      const ids = [...seen.current].slice(-1000);
      seen.current = new Set(ids);
      try {
        sessionStorage.setItem(
          `kitchen-events:${actorId}`,
          JSON.stringify(ids),
        );
      } catch {}
      if (fresh.some((e) => e.kind === "NUEVO" || e.kind === "LISTO")) {
        setPulse(fresh.some((e) => e.kind === "LISTO") ? "ready" : "new");
        if (pulseTimer.current) clearTimeout(pulseTimer.current);
        pulseTimer.current = setTimeout(() => setPulse("idle"), 4000);
        if (
          soundRef.current &&
          audio.current &&
          audio.current.state === "running"
        ) {
          const osc = audio.current.createOscillator(),
            gain = audio.current.createGain();
          osc.frequency.value = 660;
          gain.gain.value = 0.08;
          osc.connect(gain);
          gain.connect(audio.current.destination);
          osc.start();
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            audio.current.currentTime + 0.25,
          );
          osc.stop(audio.current.currentTime + 0.3);
        }
      }
    },
    [actorId],
  );
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/kitchen/orders", { cache: "no-store" });
      if (r.status === 401 || r.status === 403) {
        setData(null);
        setFailed(true);
        router.replace("/cocina/login?expired=1");
        return;
      }
      if (!r.ok) throw Error();
      ingest(await r.json());
    } catch {
      setFailed(true);
    }
  }, [ingest, router]);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      setAnimations(
        !reduced.matches && localStorage.getItem("kitchen-animation") !== "off",
      );
    };
    preference();
    reduced.addEventListener("change", preference);
    void load();
    let eventSource: EventSource | null = null;
    let revoked = false;
    const connect = () => {
      if (revoked) return;
      eventSource = new EventSource("/api/kitchen/stream");
      eventSource.addEventListener("snapshot", (event) => {
        ingest(JSON.parse((event as MessageEvent).data));
        setTransport("sse");
      });
      eventSource.addEventListener("unavailable", () => {
        setFailed(true);
        setTransport("poll");
      });
      eventSource.addEventListener("revoked", () => {
        revoked = true;
        setData(null);
        setFailed(true);
        eventSource?.close();
        router.replace("/cocina/login?expired=1");
      });
      eventSource.onerror = () => {
        setTransport("poll");
        void load();
      };
    };
    connect();
    const poll = setInterval(() => {
      if (!revoked && Date.now() - lastReceived.current > 6500) void load();
    }, 7000);
    const tick = setInterval(() => {
      setNow(Date.now());
      if (lastReceived.current && Date.now() - lastReceived.current > 15000)
        setFailed(true);
    }, 1000);
    const offline = () => {
      setFailed(true);
      setTransport("poll");
      eventSource?.close();
    };
    const online = () => {
      if (!revoked) {
        eventSource?.close();
        connect();
        void load();
      }
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    const focus = () => {
      if (!revoked) void load();
    };
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      eventSource?.close();
      window.removeEventListener("focus", focus);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      reduced.removeEventListener("change", preference);
    };
  }, [ingest, load, router]);
  async function action(url: string, body: unknown, method = "POST") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json();
        throw Error(e.error);
      }
      await load();
      return true;
    } catch (e) {
      setError(`${t.error}: ${e instanceof Error ? e.message : ""}`);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const time = (value: string) =>
    new Date(value).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: data?.settings?.timezone ?? "Europe/Berlin",
    });
  const interval = (from: string | null, until: string | null) =>
    from && until ? `${time(from)}–${time(until)}` : t.pending;
  const orders = data?.orders ?? [],
    overdue = orders.filter(
      (o) =>
        ["NUEVO", "CONFIRMADO", "EN_PREPARACION"].includes(o.status) &&
        o.preparationDeadlineAt &&
        new Date(o.preparationDeadlineAt).getTime() < now,
    );
  const paused = data?.shift?.pauses.some((p) => !p.endedAt),
    open = data?.settings?.acceptingOrders;
  const state: MariachiState = !open
    ? "closed"
    : pulse !== "idle"
      ? pulse
      : overdue.length
        ? "delay"
        : "idle";
  function setAnimation(value: boolean) {
    const allowed =
      value && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    setAnimations(allowed);
    localStorage.setItem("kitchen-animation", allowed ? "on" : "off");
  }
  async function toggleSound() {
    if (!sound) {
      audio.current ??= new AudioContext();
      await audio.current.resume();
    }
    soundRef.current = !sound;
    setSound(!sound);
  }
  function update(order: Ticket, status: string) {
    if (
      ["CANCELADO", "NO_PRESENTADO", "ENTREGADO"].includes(status) &&
      !confirm(t.confirm)
    )
      return;
    void action(
      `/api/orders/${order.publicId}`,
      { status, requestId: crypto.randomUUID() },
      "PATCH",
    );
  }
  function shift(actionName: string) {
    if (actionName === "CLOSE" && !confirm(t.confirm)) return;
    void action("/api/kitchen/shift", { action: actionName }).then((success) => {
      if (success && actionName === "CLOSE") setShowSalesClose(true);
    });
  }
  const groups = [
    { key: "new", test: (o: Ticket) => o.status === "NUEVO" },
    {
      key: "cooking",
      test: (o: Ticket) => ["CONFIRMADO", "EN_PREPARACION"].includes(o.status),
    },
    { key: "ready", test: (o: Ticket) => o.status === "LISTO" },
    {
      key: "history",
      test: (o: Ticket) =>
        ["EN_CAMINO", "ENTREGADO", "CANCELADO", "NO_PRESENTADO"].includes(
          o.status,
        ),
    },
  ] as const;
  return (
    <main className="kitchen-page kitchen-board-page">
      <header className="kitchen-header flex flex-wrap gap-4 py-5">
        <div>
          <Link href="/" className="kitchen-brand">
            <span className="brand-mark">
              <Flame size={18} />
            </span>
            PANCHO VILLA
          </Link>
          <h1>{t.title}</h1>
          <p>{transport === "sse" ? t.live : t.polling}</p>
        </div>
        <KitchenMariachi
          state={state}
          enabled={animations}
          resource={data?.mariachiResource ?? null}
        />
        <div className="kitchen-shift-info">
          <strong>{time(new Date(now).toISOString())}</strong>
          <p>
            {open ? t.open : t.closed}
            {paused ? ` · ${t.pause}` : ""}
          </p>
          <p>
            {data?.shift
              ? `${t.shift}: ${Math.floor((now - new Date(data.shift.openedAt).getTime()) / 60000)} ${t.minutes} · ${t.effective}: ${Math.floor((now - new Date(data.shift.openedAt).getTime() - data.shift.pauses.reduce((sum, p) => sum + new Date(p.endedAt ?? now).getTime() - new Date(p.startedAt).getTime(), 0)) / 60000)} ${t.minutes}`
              : t.noShift}
          </p>
        </div>
        <button
          type="button"
          className="kitchen-refresh"
          onClick={() => void load()}
          aria-label={t.refresh}
        >
          <RefreshCw />
        </button>
      </header>
      <div className="kitchen-toolbar flex flex-wrap gap-3 py-4">
        <button type="button" disabled={busy} onClick={async () => {
          await logoutKitchen();
          router.replace("/cocina/login");
          router.refresh();
        }}>Salir de cocina</button>
        <label>
          <input
            type="checkbox"
            checked={animations}
            onChange={(e) => setAnimation(e.target.checked)}
          />
          {t.animations}
        </label>
        <button
          type="button"
          onClick={() => void toggleSound()}
          aria-pressed={sound}
        >
          {t.sound}: {sound ? "✓" : "—"}
        </button>
        {!data?.shift ? (
          <button disabled={busy || failed} onClick={() => shift("OPEN")}>
            {t.openShift}
          </button>
        ) : (
          <>
            <button
              disabled={busy || failed}
              onClick={() => shift(paused ? "RESUME" : "PAUSE")}
            >
              {paused ? t.resume : t.pause}
            </button>
            <button
              disabled={busy || failed}
              onClick={() => shift("STOP_ORDERS")}
            >
              {t.stop}
            </button>
            <button disabled={busy || failed} onClick={() => shift("CLOSE")}>
              {t.closeShift}
            </button>
          </>
        )}
        {data?.lastClosedShift?.summary?.dailySales && (
          <button type="button" onClick={() => setShowSalesClose(true)}>Ver último cierre de ventas</button>
        )}
        {data?.canManage && (
          <>
            <Link href="/admin/inventario">{t.inventory}</Link>
            <Link href="/admin/ventas">{t.sales}</Link>
          </>
        )}
      </div>
      <div className="kitchen-counts flex flex-wrap gap-3">
        {groups.slice(0, 3).map((g) => (
          <span key={g.key}>
            {t[g.key]} <b>{orders.filter(g.test).length}</b>
          </span>
        ))}
      </div>
      {failed && (
        <p className="kitchen-alert" role="alert">
          {t.connection}
        </p>
      )}
      {error && (
        <p className="kitchen-alert" role="alert">
          {error}
        </p>
      )}
      {overdue.length > 0 && (
        <p className="kitchen-alert">
          {t.delay}: {overdue.length}
        </p>
      )}
      {Boolean(data?.lowStock.length) && (
        <p className="kitchen-alert">
          {t.lowStock}:{" "}
          {data!.lowStock
            .map((i) => `${i.name} (${i.stock - i.reserved} ${i.unit})`)
            .join(" · ")}
        </p>
      )}
      <div className="kitchen-columns">
        {groups.map((group) => {
          const queue = orders.filter(group.test);
          const selectedIndex = Math.max(0, queue.findIndex((order) => order.publicId === selectedTickets[group.key]));
          const visible = queue.slice(selectedIndex, selectedIndex + 1);
          const move = (direction: number) => {
            const next = queue[selectedIndex + direction];
            if (next) setSelectedTickets((current) => ({ ...current, [group.key]: next.publicId }));
          };
          return (
          <section
            className={`kitchen-column kitchen-${group.key}`}
            key={group.key}
          >
            <header>
              <h2>{t[group.key]}</h2>
              <span>{queue.length}</span>
            </header>
            <div className="kitchen-queue-controls">
              <button type="button" disabled={selectedIndex === 0} onClick={() => move(-1)} aria-label={locale === "es" ? "Comanda anterior" : locale === "en" ? "Previous ticket" : "Vorheriger Bon"}>←</button>
              <span aria-live="polite">{queue.length ? selectedIndex + 1 : 0} / {queue.length}</span>
              <button type="button" disabled={selectedIndex >= queue.length - 1} onClick={() => move(1)} aria-label={locale === "es" ? "Comanda siguiente" : locale === "en" ? "Next ticket" : "Nächster Bon"}>→</button>
            </div>
            {!queue.length && (
              <p className="kitchen-empty">{t.empty}</p>
            )}
            {visible.map((order) => (
              <article
                className={`kitchen-order ${overdue.includes(order) ? "overdue" : ""}`}
                key={order.publicId}
              >
                <div className="kitchen-ticket-head">
                  <strong>{order.publicId}</strong>
                </div>
                <p>
                  {time(order.createdAt)} · {t.wait}:{" "}
                  {Math.max(
                    0,
                    Math.floor(
                      (now - new Date(order.createdAt).getTime()) / 60000,
                    ),
                  )}{" "}
                  {t.minutes}
                </p>
                <p className="kitchen-type">
                  {order.type === "PICKUP" ? t.pickup : t.delivery} ·{" "}
                  {order.status}
                </p>
                <p>
                  {t.estimated}:{" "}
                  <b>
                    {interval(
                      order.estimatedReadyAt,
                      order.estimatedReadyUntil,
                    )}
                  </b>
                </p>
                <ul>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <strong>{item.quantity}×</strong>
                      <div>
                        <b>{item.productName}</b>
                        {item.modifiers.map((m, i) => (
                          <small key={i}>+ {m.modifierName}</small>
                        ))}
                        {item.instructions && (
                          <small className="kitchen-instruction">
                            {item.instructions}
                          </small>
                        )}
                        <small>
                          {t.allergens}:{" "}
                          {item.allergensRecorded
                            ? item.allergens.join(", ") || "—"
                            : t.unknownAllergens}
                        </small>
                        <small>
                          {t.station}: {item.stationName ?? t.unassigned}
                        </small>
                        <small>
                          {t.status}:{" "}
                          {item.cookStatus === "READY"
                            ? t.readyItem
                            : item.cookStatus === "PREPARING"
                              ? t.preparingItem
                              : t.pendingItem}
                        </small>
                        <small>
                          {interval(item.estimatedAt, item.estimatedUntil)}
                        </small>
                        <small>
                          {t.responsible}:{" "}
                          {data?.staff.find((s) => s.id === item.assignedTo)
                            ?.firstName ?? t.unassigned}
                        </small>
                        {order.status === "EN_PREPARACION" &&
                          item.cookStatus === "PENDING" && (
                            <label>
                              {t.responsible}
                              <select
                                value={assignees[item.id] ?? actorId}
                                onChange={(e) =>
                                  setAssignees((a) => ({
                                    ...a,
                                    [item.id]: e.target.value,
                                  }))
                                }
                              >
                                {data?.staff.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.firstName} {s.lastName}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        {order.status === "EN_PREPARACION" &&
                          item.cookStatus !== "READY" && (
                            <button
                              className="kitchen-item-action"
                              disabled={busy || failed}
                              onClick={() =>
                                void action(
                                  `/api/kitchen/items/${item.id}`,
                                  {
                                    status:
                                      item.cookStatus === "PENDING"
                                        ? "PREPARING"
                                        : "READY",
                                    requestId: crypto.randomUUID(),
                                    assignedTo:
                                      assignees[item.id] ??
                                      item.assignedTo ??
                                      actorId,
                                  },
                                  "PATCH",
                                )
                              }
                            >
                              {item.cookStatus === "PENDING"
                                ? t.start
                                : t.itemReady}
                            </button>
                          )}
                      </div>
                    </li>
                  ))}
                </ul>
                {order.notes && <p className="kitchen-note">{order.notes}</p>}
                {order.deliveryNote && (
                  <p className="kitchen-note">{order.deliveryNote}</p>
                )}
                {!order.inventoryComplete && (
                  <p className="kitchen-note">{t.incomplete}</p>
                )}
                <div className="kitchen-actions">
                  {(order.status === "NUEVO"
                    ? [
                        ["CONFIRMADO", t.accept],
                        ["CANCELADO", t.cancel],
                      ]
                    : order.status === "CONFIRMADO"
                      ? [
                          ["EN_PREPARACION", t.start],
                          ["CANCELADO", t.cancel],
                        ]
                      : order.status === "EN_PREPARACION"
                        ? [["LISTO", t.finish]]
                        : order.status === "LISTO"
                          ? [
                              [
                                order.type === "DELIVERY"
                                  ? "EN_CAMINO"
                                  : "ENTREGADO",
                                order.type === "DELIVERY"
                                  ? t.dispatch
                                  : t.delivered,
                              ],
                              ...(data?.canMarkNoShow && order.type === "PICKUP"
                                ? [["NO_PRESENTADO", t.noShow]]
                                : []),
                            ]
                          : order.status === "EN_CAMINO"
                            ? [["ENTREGADO", t.delivered]]
                            : []
                  ).map(([status, label]) => (
                    <button
                      className="kitchen-action"
                      key={status}
                      disabled={
                        busy ||
                        failed ||
                        (status === "LISTO" &&
                          order.items.some((i) => i.cookStatus !== "READY"))
                      }
                      onClick={() => update(order, status)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {group.key === "history" && (
                  <details>
                    <summary>{t.history}</summary>
                    {order.statusHistory.map((h, i) => (
                      <p key={i}>
                        {time(h.createdAt)} · {h.to} ·{" "}
                        {data?.staff.find((s) => s.id === h.changedBy)
                          ?.firstName ??
                          h.changedBy ??
                          "—"}
                      </p>
                    ))}
                  </details>
                )}
              </article>
            ))}
          </section>
          );
        })}
      </div>
      <p className="kitchen-board-footer">{t.soundsOnly}</p>
      {showSalesClose && data?.lastClosedShift?.summary?.dailySales && (
        <KitchenSalesClose sales={data.lastClosedShift.summary.dailySales} locale={locale} onClose={() => setShowSalesClose(false)} />
      )}
    </main>
  );
}
