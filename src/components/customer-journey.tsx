"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type FormEvent,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import type { Locale } from "@/lib/locale";
import { journeyCopy, noticeText } from "@/lib/journey-copy";

export type JourneyProduct = {
  id: string;
  slug: string;
  name: string;
  price: string | number;
  currency: string;
  image: string | null;
};
export type JourneyMessage = {
  id: string;
  requestId: string;
  role: "assistant" | "user";
  content: string;
  recommendations?: JourneyProduct[];
  safetyNotice?: boolean;
};
export type JourneyOrder = {
  publicId: string;
  status: string;
  type: string;
  createdAt: string;
  items: { productName: string; quantity: number }[];
};
export type JourneyNotice = {
  id: string;
  eventKey?: string;
  status: string;
  readAt: string | null;
  createdAt: string;
  order: { publicId: string; type: string };
};
type Customer = { id: string; firstName: string; locale: Locale };
type Snapshot = {
  customer: Customer;
  orders: JourneyOrder[];
  messages: {
    id: string;
    requestId: string;
    role: string;
    content: string;
    metadata: Record<string, unknown> | null;
  }[];
  notices: JourneyNotice[];
  unreadCount: number;
};
type Journey = {
  customer: Customer | null;
  orders: JourneyOrder[];
  messages: JourneyMessage[];
  notices: JourneyNotice[];
  unreadCount: number;
  busy: boolean;
  ready: boolean;
  error: string;
  send: (message: string, selectedOrderId?: string) => Promise<boolean>;
  markRead: (ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
};
const JourneyContext = createContext<Journey | null>(null);
export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error("JourneyProvider is required");
  return context;
}
export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const cart = useCart();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<JourneyOrder[]>([]);
  const [messages, setMessages] = useState<JourneyMessage[]>([]);
  const [notices, setNotices] = useState<JourneyNotice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const epoch = useRef(0);
  const latestRequest = useRef(0);
  const identity = useRef<string | null>(null);
  const sending = useRef(false);
  const clear = useCallback(() => {
    epoch.current++;
    latestRequest.current++;
    identity.current = null;
    setCustomer(null);
    setOrders([]);
    setMessages([]);
    setNotices([]);
    setUnreadCount(0);
    setError("");
    setReady(true);
  }, []);
  const apply = useCallback((data: Snapshot) => {
    if (identity.current && identity.current !== data.customer.id)
      epoch.current++;
    identity.current = data.customer.id;
    setCustomer(data.customer);
    setOrders(data.orders);
    setMessages(
      data.messages
        .filter(
          (message) => message.role === "user" || message.role === "assistant",
        )
        .map((message) => ({
          id: message.id,
          requestId: message.requestId,
          role: message.role as "user" | "assistant",
          content: message.content,
          recommendations: message.metadata?.recommendations as
            JourneyProduct[] | undefined,
          safetyNotice: message.metadata?.safetyNotice === true,
        })),
    );
    setNotices(data.notices);
    setUnreadCount(data.unreadCount);
    setReady(true);
    setError("");
  }, []);
  const refresh = useCallback(async () => {
    const version = epoch.current;
    const request = ++latestRequest.current;
    try {
      const response = await fetch("/api/ai/journey", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (version !== epoch.current || request !== latestRequest.current)
        return;
      if (response.status === 401 || response.status === 403) {
        clear();
        return;
      }
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (version === epoch.current && request === latestRequest.current)
        apply(data);
    } catch {
      if (version === epoch.current && request === latestRequest.current) {
        setError("JOURNEY_UNAVAILABLE");
        setReady(true);
      }
    }
  }, [apply, clear]);
  useEffect(() => {
    let active = true;
    let running = false;
    const controller = new AbortController();
    async function load() {
      if (running || !active) return;
      running = true;
      const version = epoch.current;
      const request = ++latestRequest.current;
      try {
        const response = await fetch("/api/ai/journey", {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        if (
          !active ||
          version !== epoch.current ||
          request !== latestRequest.current
        )
          return;
        if (response.status === 401 || response.status === 403) {
          clear();
          return;
        }
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (
          active &&
          version === epoch.current &&
          request === latestRequest.current
        )
          apply(data);
      } catch {
        if (
          active &&
          version === epoch.current &&
          request === latestRequest.current
        ) {
          setError("JOURNEY_UNAVAILABLE");
          setReady(true);
        }
      } finally {
        running = false;
      }
    }
    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 7000);
    const focus = () => void load();
    const session = () => {
      clear();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("pancho-session-change", session);
    document.addEventListener("visibilitychange", focus);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", focus);
      window.removeEventListener("pancho-session-change", session);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [pathname, apply, clear]);
  async function send(message: string, selectedOrderId?: string) {
    if (!customer || sending.current || !message.trim()) return false;
    const owner = customer.id;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          requestId: crypto.randomUUID(),
          selectedOrderId,
          cartItems: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (response.status === 401 || response.status === 403) {
        clear();
        return false;
      }
      if (!response.ok) throw new Error();
      if (identity.current === owner) await refresh();
      return true;
    } catch {
      if (identity.current === owner) setError("CHAT_UNAVAILABLE");
      return false;
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function markRead(ids: string[]) {
    if (!customer || !ids.length) return;
    const owner = customer.id;
    try {
      const response = await fetch("/api/ai/journey", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
      if (identity.current === owner) await refresh();
    } catch {
      if (identity.current === owner) setError("NOTICE_UNAVAILABLE");
    }
  }
  return (
    <JourneyContext.Provider
      value={{
        customer,
        orders,
        messages,
        notices,
        unreadCount,
        busy,
        ready,
        error,
        send,
        markRead,
        refresh,
      }}
    >
      {children}
      <JourneyWidget />
    </JourneyContext.Provider>
  );
}
function JourneyWidget() {
  const journey = useJourney();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const customer = journey.customer;
  useEffect(() => {
    setInput("");
    setOpen(false);
  }, [customer?.id]);
  useEffect(() => {
    if (open && panel.current)
      panel.current.scrollTop = panel.current.scrollHeight;
  }, [open, journey.messages]);
  if (
    !customer ||
    pathname === "/asistente" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/cocina") ||
    ["/login", "/register", "/forgot-password", "/reset-password"].includes(
      pathname,
    )
  )
    return null;
  const t = journeyCopy[customer.locale];
  const latest = journey.notices.find((notice) => !notice.readAt);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await journey.send(input)) setInput("");
  }
  return (
    <aside className="journey-widget" aria-label={t.title}>
      {!open && latest && (
        <div className="journey-toast" role="status">
          <strong>{t.latest}</strong>
          <p>{noticeText(customer.locale, latest)}</p>
          <Link href={`/pedido/${latest.order.publicId}`}>{t.track}</Link>
          <button
            type="button"
            aria-label={t.read}
            onClick={() => void journey.markRead([latest.id])}
          >
            ✓
          </button>
        </div>
      )}
      {open && (
        <section className="journey-panel" aria-label={t.title}>
          <header>
            <strong>{t.title}</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.close}
            >
              ×
            </button>
          </header>
          <div className="journey-body" ref={panel}>
            <h2>{t.notices}</h2>
            {journey.notices.slice(0, 15).map((notice) => (
              <article
                className={`journey-notice ${notice.readAt ? "read" : ""}`}
                key={notice.id}
              >
                <p>{noticeText(customer.locale, notice)}</p>
                <small>
                  {t.observed}:{" "}
                  {new Date(notice.createdAt).toLocaleString(customer.locale)}
                </small>
                <Link href={`/pedido/${notice.order.publicId}`}>{t.track}</Link>
                {!notice.readAt && (
                  <button
                    type="button"
                    onClick={() => void journey.markRead([notice.id])}
                  >
                    {t.read}
                  </button>
                )}
              </article>
            ))}
            <h2>{t.chat}</h2>
            {journey.messages.length === 0 && <p>{t.empty}</p>}
            {journey.messages.map((message) => (
              <p key={message.id} className={`journey-message ${message.role}`}>
                {message.content}
              </p>
            ))}
            {journey.busy && <p role="status">{t.thinking}</p>}
          </div>
          {journey.error && (
            <p className="journey-error" role="alert">
              {t.error}
            </p>
          )}
          <form onSubmit={submit}>
            <label className="sr-only" htmlFor="journey-input">
              {t.placeholder}
            </label>
            <input
              id="journey-input"
              maxLength={1000}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t.placeholder}
            />
            <button disabled={journey.busy || !input.trim()}>{t.send}</button>
          </form>
          <Link className="journey-full" href="/asistente">
            {t.full}
          </Link>
        </section>
      )}
      <button
        className="journey-launcher"
        type="button"
        aria-label={t.open}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ✦ SaborMX{" "}
        {journey.unreadCount > 0 && <span>{journey.unreadCount}</span>}
      </button>
    </aside>
  );
}
