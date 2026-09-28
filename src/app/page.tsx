"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Clock3,
  Flame,
  Leaf,
  MapPin,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { normalizeLocalePreference, type Locale } from "@/lib/locale";
import { MenuPreview } from "@/components/menu-catalog";

const copy = {
  es: {
    nav: ["Menú", "Nuestra cocina", "Encuéntranos"],
    order: "Pedir ahora",
    eyebrow: "COCINA MEXICANA · HECHA CON CARIÑO",
    title: "Un poquito de México,\nmucho sabor para compartir.",
    intro:
      "Tacos, antojos y buenos momentos. Pide tus favoritos recién hechos, para recoger o disfrutar en casa.",
    menu: "Explorar el menú",
    location: "Ver ubicación",
    ready: "recién hecho para ti",
    popular: "Los favoritos de la casa",
    popularSub: "Un primer bocado siempre lleva a otro.",
    viewAll: "Ver todo el menú",
    storyTag: "FUEGO LENTO, SABOR DE CASA",
    storyTitle: "Recetas con raíces. Momentos para recordar.",
    storyText:
      "Cocinamos con ingredientes frescos, tortillas calientitas y ese toque de chile, limón y alegría que convierte la comida en un buen plan.",
    storyLink: "Conoce nuestra cocina",
    pickup: "Recogida sencilla",
    pickupText: "Pide con tiempo y pasa cuando esté listo.",
    fresh: "Siempre recién hecho",
    freshText: "Tu pedido se prepara al momento.",
    cta: "¿Se te antojó?",
    ctaText: "Tu próxima comida favorita está a un clic.",
    footer: "Sabor mexicano, hecho para compartir.",
    product: "Tacos de la casa",
    count: "3 tacos · salsa fresca",
    availability: "Listo en unos 20–30 min",
    add: "Añadir",
    badges: ["Fresco cada día", "Hecho con cariño"],
  },
  en: {
    nav: ["Menu", "Our kitchen", "Find us"],
    order: "Order now",
    eyebrow: "MEXICAN KITCHEN · MADE WITH CARE",
    title: "A little taste of Mexico,\na lot to share.",
    intro:
      "Tacos, little cravings and good times. Order your favourites freshly made, for pickup or to enjoy at home.",
    menu: "Explore the menu",
    location: "Find us",
    ready: "freshly made for you",
    popular: "House favourites",
    popularSub: "One good bite always leads to another.",
    viewAll: "See the full menu",
    storyTag: "SLOW FIRE, HOMESTYLE FLAVOUR",
    storyTitle: "Recipes with roots. Moments to remember.",
    storyText:
      "We cook with fresh ingredients, warm tortillas and that touch of chile, lime and joy that turns a meal into a good plan.",
    storyLink: "Meet our kitchen",
    pickup: "Easy pickup",
    pickupText: "Order ahead and drop by when it is ready.",
    fresh: "Always freshly made",
    freshText: "Your order is prepared just for you.",
    cta: "Feeling hungry?",
    ctaText: "Your next favourite meal is one click away.",
    footer: "Mexican flavour, made to share.",
    product: "House tacos",
    count: "3 tacos · fresh salsa",
    availability: "Ready in about 20–30 min",
    add: "Add",
    badges: ["Fresh every day", "Made with care"],
  },
  de: {
    nav: ["Speisekarte", "Unsere Küche", "Anfahrt"],
    order: "Jetzt bestellen",
    eyebrow: "MEXIKANISCHE KÜCHE · MIT LIEBE GEMACHT",
    title: "Ein Hauch Mexiko,\nviel Geschmack zum Teilen.",
    intro:
      "Tacos, kleine Köstlichkeiten und schöne Momente. Frisch zubereitet zur Abholung oder für zu Hause bestellen.",
    menu: "Speisekarte entdecken",
    location: "Standort ansehen",
    ready: "frisch für dich zubereitet",
    popular: "Unsere Lieblinge",
    popularSub: "Ein guter Bissen macht Lust auf mehr.",
    viewAll: "Zur ganzen Speisekarte",
    storyTag: "LANGSAM GEGART, WIE ZU HAUSE",
    storyTitle: "Rezepte mit Wurzeln. Momente, die bleiben.",
    storyText:
      "Wir kochen mit frischen Zutaten, warmen Tortillas und einer Prise Chili, Limette und Lebensfreude.",
    storyLink: "Unsere Küche kennenlernen",
    pickup: "Einfach abholen",
    pickupText: "Vorbestellen und abholen, sobald alles fertig ist.",
    fresh: "Immer frisch zubereitet",
    freshText: "Deine Bestellung wird frisch für dich zubereitet.",
    cta: "Lust bekommen?",
    ctaText: "Dein nächstes Lieblingsessen ist nur einen Klick entfernt.",
    footer: "Mexikanischer Geschmack zum Teilen.",
    product: "Tacos des Hauses",
    count: "3 Tacos · frische Salsa",
    availability: "Fertig in etwa 20–30 Min.",
    add: "Hinzufügen",
    badges: ["Täglich frisch", "Mit Liebe gemacht"],
  },
} satisfies Record<Locale, Record<string, string | string[]>>;

export default function Home() {
  const [locale, setLocale] = useState<Locale>("es");
  const t = copy[locale];

  useEffect(() => {
    const saved = window.localStorage.getItem("pancho-villa-locale");
    setLocale(normalizeLocalePreference(saved));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("pancho-villa-locale", locale);
  }, [locale]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Pancho Villa, inicio">
          <span className="brand-mark">
            <Flame size={21} strokeWidth={2.2} />
          </span>
          <span>
            PANCHO <b>VILLA</b>
            <small>COCINA MEXICANA</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Principal">
          {(t.nav as string[]).map((label, i) => (
            <Link key={label} href={["/menu", "#cocina", "#visitanos"][i]}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="top-actions">
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
          <Link
            className="button button-primary nav-order"
            href="/menu"
            aria-label={t.order}
          >
            <ShoppingBag size={16} />
            <span className="nav-label">{t.order}</span>
          </Link>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            {t.eyebrow}
          </p>
          <h1>{t.title}</h1>
          <p className="hero-intro">{t.intro}</p>
          <div className="hero-buttons">
            <Link className="button button-primary" href="/menu">
              {t.menu}
              <ArrowRight size={17} />
            </Link>
            <a className="text-link" href="#visitanos">
              {t.location}
              <ArrowDownRight size={16} />
            </a>
          </div>
          <div className="hero-badges">
            <span>
              <Leaf size={15} />
              {(t.badges as string[])[0]}
            </span>
            <i />
            <span>
              <Sparkles size={15} />
              {(t.badges as string[])[1]}
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="pattern-corner" aria-hidden="true">
            ✳　✳　✳
            <br />
            　✳　✳　✳
            <br />
            ✳　✳　✳
          </div>
          <div className="visual-caption">
            <span className="caption-icon">
              <UtensilsCrossed size={16} />
            </span>
            <span>
              <b>{t.product}</b>
              <small>{t.count}</small>
            </span>
            <span className="caption-price">12,50 €</span>
          </div>
          <div className="hero-photo-frame">
            <Image
              src="/menu/tacos-photo.jpg"
              alt={
                locale === "es"
                  ? "Tacos al pastor con piña asada, cilantro y salsa roja"
                  : locale === "en"
                    ? "Al pastor tacos with roasted pineapple, coriander and red salsa"
                    : "Tacos al Pastor mit gegrillter Ananas, Koriander und roter Salsa"
              }
              fill
              sizes="(max-width: 700px) 92vw, (max-width: 1000px) 46vw, 40vw"
              preload
            />
          </div>
          <div className="ready-tag">
            <span className="ready-dot" />
            <span>{t.ready}</span>
          </div>
          <div className="stamp">
            BUEN
            <br />
            PROVECHO<span>✳</span>
          </div>
        </div>
        <div className="hero-bottom">
          <span>52°31&apos; N — BERLIN</span>
          <span>COCINAMOS CON ALEGRÍA</span>
          <span>01 / 03</span>
        </div>
      </section>

      <section className="menu-section section-pad" id="menu">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              <span />
              {locale === "es"
                ? "ALGO RICO TE ESPERA"
                : locale === "en"
                  ? "SOMETHING DELICIOUS AWAITS"
                  : "ETWAS LECKERES WARTET"}
            </p>
            <h2>{t.popular}</h2>
            <p>{t.popularSub}</p>
          </div>
          <Link href="/menu" className="outline-link">
            {t.viewAll}
            <ArrowRight size={16} />
          </Link>
        </div>
        <MenuPreview locale={locale} />
      </section>

      <section className="story-section section-pad" id="cocina">
        <div className="story-art">
          <div className="tile-grid" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className={`tile tile-${i % 4}`}>
                {i % 2 ? "✳" : "◇"}
              </span>
            ))}
          </div>
          <div className="story-note">
            <span>DESDE EL CORAZÓN</span>
            <b>
              con sabor
              <br />a hogar
            </b>
            <i>✳</i>
          </div>
          <div className="story-seal">
            HECHO
            <br />
            EN CASA
          </div>
        </div>
        <div className="story-copy">
          <p className="eyebrow">
            <span />
            {t.storyTag}
          </p>
          <h2>{t.storyTitle}</h2>
          <p>{t.storyText}</p>
          <a className="text-link" href="#visitanos">
            {t.storyLink}
            <ArrowRight size={16} />
          </a>
          <div className="feature-pair">
            <div>
              <span className="feature-icon">
                <Clock3 size={18} />
              </span>
              <b>{t.pickup}</b>
              <small>{t.pickupText}</small>
            </div>
            <div>
              <span className="feature-icon">
                <Flame size={18} />
              </span>
              <b>{t.fresh}</b>
              <small>{t.freshText}</small>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section section-pad" id="visitanos">
        <div>
          <p className="eyebrow">
            <span />
            PANCHO VILLA · BERLIN
          </p>
          <h2>{t.cta}</h2>
          <p>{t.ctaText}</p>
        </div>
        <Link href="/menu" className="button button-light">
          {t.order}
          <ArrowRight size={17} />
        </Link>
        <MapPin className="cta-spark" size={42} aria-hidden="true" />
      </section>

      <footer className="footer">
        <a className="brand brand-footer" href="#inicio">
          <span className="brand-mark">
            <Flame size={19} />
          </span>
          <span>
            PANCHO <b>VILLA</b>
            <small>COCINA MEXICANA</small>
          </span>
        </a>
        <p>{t.footer}</p>
        <span>© 2026 PANCHO VILLA</span>
      </footer>
    </main>
  );
}
