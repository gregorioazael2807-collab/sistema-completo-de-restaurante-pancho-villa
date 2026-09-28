"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, LoaderCircle, Package, Save } from "lucide-react";
import type { Locale } from "@/lib/locale";
import "../app/products.css";

type Product = { id: string; slug: string; name: string; price: number; currency: string; available: boolean; featured: boolean; category: string; image: string | null };
const copy = {
  es: { title: "Productos", desc: "Actualiza precios y disponibilidad del catálogo.", back: "Administración", category: "Categoría", price: "Precio", available: "Disponible", featured: "Favorito", save: "Guardar", saved: "Guardado", error: "No se pudo guardar el producto." },
  en: { title: "Products", desc: "Update catalog prices and availability.", back: "Administration", category: "Category", price: "Price", available: "Available", featured: "Featured", save: "Save", saved: "Saved", error: "Could not save the product." },
  de: { title: "Produkte", desc: "Preise und Verfügbarkeit im Katalog verwalten.", back: "Verwaltung", category: "Kategorie", price: "Preis", available: "Verfügbar", featured: "Empfohlen", save: "Speichern", saved: "Gespeichert", error: "Das Produkt konnte nicht gespeichert werden." },
} satisfies Record<Locale, Record<string, string>>;

export function ProductManagement({ locale, products: initial }: { locale: Locale; products: Product[] }) {
  const t = copy[locale];
  const [products, setProducts] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function save(product: Product) {
    setBusy(product.id); setMessage("");
    try {
      const response = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ price: product.price, available: product.available, featured: product.featured }) });
      if (!response.ok) throw new Error();
      setMessage(t.saved);
    } catch { setMessage(t.error); } finally { setBusy(null); }
  }
  return <main className="products-page"><header><Link href="/admin"><ArrowLeft size={16} />{t.back}</Link><span className="brand-mark"><Package size={18} /></span></header><section className="products-intro"><p className="eyebrow">PANCHO VILLA · ADMIN</p><h1>{t.title}</h1><p>{t.desc}</p></section>{message && <p className="products-message" role="status">{message}</p>}<section className="products-list">{products.map((product) => <article className="product-admin-card" key={product.id}>{product.image && <Image src={product.image} alt="" width={92} height={76} sizes="92px" />}<div className="product-admin-main"><small>{product.category}</small><h2>{product.name}</h2><code>{product.slug}</code></div><label className="product-admin-price">{t.price}<span><input type="number" min="0" max="1000" step="0.01" value={product.price} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, price: Number(event.target.value) } : item))} />{product.currency}</span></label><label className="product-admin-check"><input type="checkbox" checked={product.available} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, available: event.target.checked } : item))} />{t.available}</label><label className="product-admin-check"><input type="checkbox" checked={product.featured} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, featured: event.target.checked } : item))} />{t.featured}</label><button type="button" disabled={busy === product.id} onClick={() => void save(product)}>{busy === product.id ? <LoaderCircle className="spin-icon" size={16} /> : message === t.saved ? <Check size={15} /> : <Save size={15} />}{busy === product.id ? "…" : t.save}</button></article>)}</section></main>;
}
