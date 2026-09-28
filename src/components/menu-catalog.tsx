"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame, LoaderCircle, Search, ShoppingBag } from "lucide-react";
import { normalizeLocalePreference, type Locale } from "@/lib/locale";
import { useCart } from "@/components/cart-provider";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  price: number;
  currency: string;
  featured: boolean;
  image: { src: string; alt: string } | null;
  modifierGroups?: { id: string; name: string; required: boolean; minSelect: number; maxSelect: number; modifiers: { id: string; name: string; priceDelta: number }[] }[];
};
type Category = { slug: string; name: string; products: Product[] };
type CatalogPayload = { categories: Category[] };
const EMPTY_CATEGORIES: Category[] = [];

const labels = {
  es: {
    home: "Inicio",
    menu: "Menú",
    title: "El menú",
    intro: "Sabores hechos al momento, para disfrutar como más te guste.",
    all: "Todo",
    loading: "Cargando el menú…",
    unavailable:
      "El menú no está disponible ahora. Comprueba la conexión con la base de datos e inténtalo de nuevo.",
    retry: "Volver a intentar",
    ingredients: "Ingredientes",
    allergens: "Alérgenos registrados",
    noAllergens: "Ningún alérgeno indicado en la ficha",
    empty: "No hay productos disponibles en esta categoría.",
    login: "Mi cuenta",
    search: "Buscar platos",
    add: "Añadir al carrito",
    cart: "Carrito",
    choose: "Personaliza tu plato",
  },
  en: {
    home: "Home",
    menu: "Menu",
    title: "The menu",
    intro: "Freshly made flavours, ready to enjoy your way.",
    all: "All",
    loading: "Loading the menu…",
    unavailable:
      "The menu is unavailable right now. Check the database connection and try again.",
    retry: "Try again",
    ingredients: "Ingredients",
    allergens: "Registered allergens",
    noAllergens: "No allergens listed on this item",
    empty: "No available items in this category.",
    login: "My account",
    search: "Search dishes",
    add: "Add to cart",
    cart: "Cart",
    choose: "Customize your dish",
  },
  de: {
    home: "Start",
    menu: "Speisekarte",
    title: "Die Speisekarte",
    intro: "Frisch zubereitete Aromen, ganz nach deinem Geschmack.",
    all: "Alle",
    loading: "Speisekarte wird geladen…",
    unavailable:
      "Die Speisekarte ist derzeit nicht verfügbar. Bitte prüfe die Datenbankverbindung und versuche es erneut.",
    retry: "Erneut versuchen",
    ingredients: "Zutaten",
    allergens: "Erfasste Allergene",
    noAllergens: "Für dieses Gericht sind keine Allergene eingetragen",
    empty: "In dieser Kategorie sind keine Gerichte verfügbar.",
    login: "Mein Konto",
    search: "Gerichte suchen",
    add: "In den Warenkorb",
    cart: "Warenkorb",
    choose: "Stelle dein Gericht zusammen",
  },
} satisfies Record<Locale, Record<string, string>>;

const ingredientNames: Record<string, Partial<Record<Locale, string>>> = {
  cerdo: { en: "pork", de: "Schweinefleisch" },
  piña: { en: "pineapple", de: "Ananas" },
  cebolla: { en: "onion", de: "Zwiebel" },
  cilantro: { en: "coriander", de: "Koriander" },
  maíz: { en: "corn", de: "Mais" },
  ternera: { en: "beef", de: "Rindfleisch" },
  tomate: { en: "tomato", de: "Tomate" },
  pollo: { en: "chicken", de: "Hähnchen" },
  aguacate: { en: "avocado", de: "Avocado" },
  col: { en: "cabbage", de: "Kohl" },
  crema: { en: "crema", de: "Crema" },
  trigo: { en: "wheat", de: "Weizen" },
  frijoles: { en: "beans", de: "Bohnen" },
  arroz: { en: "rice", de: "Reis" },
  tomatillo: { en: "tomatillo", de: "Tomatillo" },
  pimiento: { en: "pepper", de: "Paprika" },
  queso: { en: "cheese", de: "Käse" },
  setas: { en: "mushrooms", de: "Pilze" },
  "queso oaxaca": { en: "Oaxaca cheese", de: "Oaxaca-Käse" },
  epazote: { en: "epazote", de: "Epazote" },
  "chile guajillo": { en: "guajillo chile", de: "Guajillo-Chili" },
  "chile poblano": { en: "poblano pepper", de: "Poblano-Chili" },
  chile: { en: "chile", de: "Chili" },
  lima: { en: "lime", de: "Limette" },
  huevo: { en: "egg", de: "Ei" },
  leche: { en: "milk", de: "Milch" },
  vainilla: { en: "vanilla", de: "Vanille" },
  azúcar: { en: "sugar", de: "Zucker" },
  chocolate: { en: "chocolate", de: "Schokolade" },
  canela: { en: "cinnamon", de: "Zimt" },
  naranja: { en: "orange", de: "Orange" },
  "flor de jamaica": { en: "hibiscus", de: "Hibiskus" },
  agua: { en: "water", de: "Wasser" },
  "agua con gas": { en: "sparkling water", de: "Mineralwasser" },
  hierbabuena: { en: "mint", de: "Minze" },
};
const allergenNames: Record<string, Record<Locale, string>> = {
  milk: { es: "leche", en: "milk", de: "Milch" },
  gluten: { es: "gluten", en: "gluten", de: "Gluten" },
  egg: { es: "huevo", en: "egg", de: "Ei" },
};
const allowedImages = new Set([
  "/menu/tacos-photo.jpg",
  "/menu/burrito-photo.jpg",
  "/menu/quesadilla-photo.jpg",
  "/menu/specialities-photo.jpg",
  "/menu/starters-photo.jpg",
  "/menu/dessert-photo.jpg",
  "/menu/drinks-photo.jpg",
]);

function ProductCard({
  product,
  locale,
  copy,
  compact = false,
  onAdd,
}: {
  product: Product;
  locale: Locale;
  copy: Record<string, string>;
  compact?: boolean;
  onAdd?: (modifiers: { id: string; name: string; priceDelta: number }[]) => void;
}) {
  const [selectedModifiers, setSelectedModifiers] = useState<{ id: string; name: string; priceDelta: number }[]>([]);
  const image =
    product.image && allowedImages.has(product.image.src)
      ? product.image
      : null;
  const price = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: product.currency,
  }).format(product.price);
  const ingredients = product.ingredients.map(
    (value) => ingredientNames[value]?.[locale] ?? value,
  );
  const allergens = product.allergens.map(
    (value) => allergenNames[value]?.[locale] ?? value,
  );

  return (
    <article className={compact ? "catalog-card menu-card" : "catalog-card"}>
      <div className="catalog-image">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw"
          />
        ) : (
          <span className="catalog-image-fallback">
            <Flame size={28} />
          </span>
        )}
        {product.featured && (
          <span className="featured-pill">
            ✳{" "}
            {locale === "es"
              ? "Favorito"
              : locale === "en"
                ? "Favourite"
                : "Beliebt"}
          </span>
        )}
      </div>
      <div className="catalog-info">
        <div className="catalog-title-line">
          <h2>{product.name}</h2>
          <strong>{price}</strong>
        </div>
        <p className="catalog-description">{product.description}</p>
        <p className="catalog-meta">
          <b>{copy.ingredients}:</b> {ingredients.join(" · ")}
        </p>
        <p className="catalog-allergens">
          <b>{copy.allergens}:</b>{" "}
          {allergens.length ? allergens.join(", ") : copy.noAllergens}
        </p>
        {onAdd && product.modifierGroups?.map((group) => <fieldset className="product-options" key={group.id}><legend>{group.name}<small>{group.minSelect ? `${group.minSelect}–${group.maxSelect}` : `0–${group.maxSelect}`}</small></legend>{group.modifiers.map((modifier) => {
          const checked = selectedModifiers.some((item) => item.id === modifier.id);
          return <label key={modifier.id}><input type="checkbox" checked={checked} onChange={() => setSelectedModifiers((current) => {
            if (checked) return current.filter((item) => item.id !== modifier.id);
            const groupIds = new Set(group.modifiers.map((option) => option.id));
            const selectedInGroup = current.filter((item) => groupIds.has(item.id));
            const withoutGroup = current.filter((item) => !groupIds.has(item.id));
            return [...withoutGroup, ...(group.maxSelect === 1 ? [] : selectedInGroup.slice(-(group.maxSelect - 1))), modifier];
          })} /><span>{modifier.name}</span>{modifier.priceDelta > 0 && <small>+{new Intl.NumberFormat(locale, { style: "currency", currency: product.currency }).format(modifier.priceDelta)}</small>}</label>;
        })}</fieldset>)}
        {onAdd && <button className="button button-primary catalog-add" type="button" onClick={() => onAdd(selectedModifiers)}><ShoppingBag size={15} />{copy.add}</button>}
      </div>
    </article>
  );
}

function useCatalog(locale: Locale, refreshKey = 0) {
  const [payload, setPayload] = useState<CatalogPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setFailed(false);
    setPayload(null);
    fetch(`/api/catalog?locale=${locale}`, {
      signal: abort.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("CATALOG_UNAVAILABLE");
        return response.json() as Promise<CatalogPayload>;
      })
      .then((data) => setPayload(data))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setFailed(true);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [locale, refreshKey]);

  return { payload, loading, failed };
}

export function MenuPreview({ locale }: { locale: Locale }) {
  const { payload, loading, failed } = useCatalog(locale);
  const featured =
    payload?.categories
      .flatMap((category) => category.products)
      .filter((product) => product.featured)
      .slice(0, 3) ?? [];
  if (loading)
    return (
      <div
        className="menu-grid menu-grid-skeleton"
        aria-label={labels[locale].loading}
      >
        <span />
        <span />
        <span />
      </div>
    );
  if (failed || featured.length === 0)
    return (
      <p className="menu-inline-empty">
        {failed ? labels[locale].unavailable : labels[locale].empty}
      </p>
    );
  return (
    <div className="menu-grid">
      {featured.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          locale={locale}
          copy={labels[locale]}
          compact
        />
      ))}
    </div>
  );
}

export function MenuCatalog() {
  const cart = useCart();
  const [locale, setLocale] = useState<Locale>("es");
  const [selected, setSelected] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { payload, loading, failed } = useCatalog(locale, refreshKey);
  const copy = labels[locale];

  useEffect(() => {
    const saved = normalizeLocalePreference(
      localStorage.getItem("pancho-villa-locale"),
    );
    setLocale(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("pancho-villa-locale", locale);
  }, [locale]);

  const categories = payload?.categories ?? EMPTY_CATEGORIES;
  const shownCategories = useMemo(() => {
    const activeCategories =
      selected === "all"
        ? categories
        : categories.filter((item) => item.slug === selected);
    const query = search.trim().toLocaleLowerCase(locale);
    return activeCategories
      .map((category) => ({
        ...category,
        products: category.products.filter(
          (product) =>
            !query ||
            [product.name, product.description, ...product.ingredients]
              .join(" ")
              .toLocaleLowerCase(locale)
              .includes(query),
        ),
      }))
      .filter((category) => category.products.length > 0);
  }, [categories, selected, search, locale]);

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Flame size={19} />
          </span>
          <span>
            PANCHO <b>VILLA</b>
            <small>COCINA MEXICANA</small>
          </span>
        </Link>
        <nav aria-label="Principal">
          <Link href="/">{copy.home}</Link>
          <span aria-current="page">{copy.menu}</span>
        </nav>
        <div className="catalog-actions">
          <Link className="catalog-account-link" href="/carrito"><ShoppingBag size={16} />{copy.cart} ({cart.items.reduce((sum, item) => sum + item.quantity, 0)})</Link>
          <div
            className="locale-switch"
            role="group"
            aria-label="Language / Idioma / Sprache"
          >
            {(["es", "en", "de"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                className={locale === lang ? "locale active" : "locale"}
                aria-pressed={locale === lang}
                onClick={() => setLocale(lang)}
              >
                {lang === "es" ? "🇪🇸 ES" : lang === "en" ? "🇬🇧 EN" : "🇩🇪 DE"}
              </button>
            ))}
          </div>
          <Link className="catalog-account-link" href="/login">
            {copy.login}
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>
      <section className="catalog-hero">
        <p className="eyebrow">
          <span />
          PANCHO VILLA · BERLIN
        </p>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
        <div className="catalog-hero-deco" aria-hidden="true">
          ✳　◇　✳
        </div>
      </section>
      <section className="catalog-content" aria-label={copy.menu}>
        <div className="catalog-controls">
          <div className="category-filters" aria-label={copy.menu}>
            <button
              type="button"
              className={
                selected === "all"
                  ? "category-filter selected"
                  : "category-filter"
              }
              aria-pressed={selected === "all"}
              onClick={() => setSelected("all")}
            >
              {copy.all}
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category.slug}
                className={
                  selected === category.slug
                    ? "category-filter selected"
                    : "category-filter"
                }
                aria-pressed={selected === category.slug}
                onClick={() => setSelected(category.slug)}
              >
                {category.name}
              </button>
            ))}
          </div>
          <label className="catalog-search">
            <Search size={16} />
            <span className="visually-hidden">{copy.search}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.search}
            />
          </label>
        </div>
        {loading && (
          <p className="catalog-status" role="status">
            <LoaderCircle size={17} className="spin-icon" />
            {copy.loading}
          </p>
        )}
        {failed && (
          <div className="catalog-status catalog-error" role="alert">
            <p>{copy.unavailable}</p>
            <button
              className="button button-outline"
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
            >
              {copy.retry}
            </button>
          </div>
        )}
        {!loading && !failed && shownCategories.length === 0 && (
          <p className="catalog-status">{copy.empty}</p>
        )}
        {!loading &&
          !failed &&
          shownCategories.map((category) => (
            <section className="catalog-category" key={category.slug}>
              <div className="catalog-category-heading">
                <h2>{category.name}</h2>
                <span>{String(category.products.length).padStart(2, "0")}</span>
              </div>
              <div className="catalog-grid">
                {category.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    locale={locale}
                    copy={copy}
                    onAdd={(modifiers) => cart.add({ productId: product.id, slug: product.slug, name: product.name, price: product.price, currency: product.currency, image: product.image?.src ?? null }, modifiers)}
                  />
                ))}
              </div>
            </section>
          ))}
      </section>
      <footer className="catalog-footer">
        <Link className="brand brand-footer" href="/">
          <span className="brand-mark">
            <Flame size={18} />
          </span>
          <span>
            PANCHO <b>VILLA</b>
            <small>COCINA MEXICANA</small>
          </span>
        </Link>
        <p>
          {locale === "es"
            ? "Sabor mexicano, hecho para compartir."
            : locale === "en"
              ? "Mexican flavour, made to share."
              : "Mexikanischer Geschmack zum Teilen."}
        </p>
      </footer>
    </main>
  );
}
