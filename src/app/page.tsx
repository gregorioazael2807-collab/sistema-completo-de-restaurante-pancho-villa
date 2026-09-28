"use client";

import { useEffect, useState } from "react";
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

const menuCards = {
  es: [
    {
      name: "Tacos al pastor",
      desc: "Piña asada · cilantro · cebolla",
      price: "€ 12,50",
      color: "coral",
      mark: "01",
    },
    {
      name: "Quesadilla de maíz",
      desc: "Queso fundido · salsa verde",
      price: "€ 9,80",
      color: "green",
      mark: "02",
    },
    {
      name: "Burrito norteño",
      desc: "Frijoles · arroz · aguacate",
      price: "€ 13,90",
      color: "yellow",
      mark: "03",
    },
  ],
  en: [
    {
      name: "Al pastor tacos",
      desc: "Roasted pineapple · coriander · onion",
      price: "€ 12.50",
      color: "coral",
      mark: "01",
    },
    {
      name: "Corn quesadilla",
      desc: "Melted cheese · green salsa",
      price: "€ 9.80",
      color: "green",
      mark: "02",
    },
    {
      name: "Northern burrito",
      desc: "Beans · rice · avocado",
      price: "€ 13.90",
      color: "yellow",
      mark: "03",
    },
  ],
  de: [
    {
      name: "Tacos al Pastor",
      desc: "Gegrillte Ananas · Koriander · Zwiebel",
      price: "€ 12,50",
      color: "coral",
      mark: "01",
    },
    {
      name: "Mais-Quesadilla",
      desc: "Geschmolzener Käse · grüne Salsa",
      price: "€ 9,80",
      color: "green",
      mark: "02",
    },
    {
      name: "Burrito Norteño",
      desc: "Bohnen · Reis · Avocado",
      price: "€ 13,90",
      color: "yellow",
      mark: "03",
    },
  ],
} satisfies Record<
  Locale,
  { name: string; desc: string; price: string; color: string; mark: string }[]
>;

function PepperArt() {
  return (
    <svg
      className="pepper-art"
      viewBox="0 0 580 530"
      role="img"
      aria-label="Ilustración decorativa de tacos mexicanos recién preparados"
    >
      <defs>
        <linearGradient id="tortilla" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#F2C879" />
          <stop offset="1" stopColor="#DB984D" />
        </linearGradient>
        <linearGradient id="plate" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#F8EBDD" />
          <stop offset="1" stopColor="#E9D7C6" />
        </linearGradient>
      </defs>
      <ellipse
        cx="290"
        cy="430"
        rx="225"
        ry="48"
        fill="#294B3E"
        opacity=".12"
      />
      <ellipse cx="290" cy="385" rx="232" ry="94" fill="url(#plate)" />
      <ellipse cx="290" cy="372" rx="208" ry="72" fill="#FFF9F0" />
      <g transform="translate(108 155) rotate(-9)">
        <path
          d="M20 184 Q35 40 176 42 Q318 43 326 184 Q179 251 20 184Z"
          fill="url(#tortilla)"
        />
        <path
          d="M36 162 Q79 104 126 125 Q174 147 219 114 Q270 77 310 156 Q273 198 220 186 Q172 174 126 201 Q76 228 36 162Z"
          fill="#83492E"
        />
        <path
          d="M53 147 Q87 100 130 122 Q174 145 217 112 Q262 79 296 143 Q260 168 220 159 Q172 148 130 177 Q85 207 53 147Z"
          fill="#3D6A48"
        />
        <g fill="#D85E3E">
          <circle cx="101" cy="145" r="12" />
          <circle cx="183" cy="132" r="11" />
          <circle cx="246" cy="139" r="10" />
          <circle cx="149" cy="161" r="8" />
        </g>
        <g fill="#F0D88C">
          <circle cx="127" cy="139" r="5" />
          <circle cx="215" cy="145" r="5" />
          <circle cx="77" cy="153" r="4" />
          <circle cx="169" cy="117" r="4" />
        </g>
        <path
          d="M72 72 Q146 36 226 71"
          fill="none"
          stroke="#FFE9B3"
          strokeWidth="5"
          strokeLinecap="round"
          opacity=".8"
        />
      </g>
      <g transform="translate(315 175) rotate(10)">
        <path
          d="M18 170 Q31 47 135 44 Q241 43 260 168 Q145 226 18 170Z"
          fill="url(#tortilla)"
        />
        <path
          d="M35 151 Q75 101 110 122 Q152 149 185 117 Q221 88 245 148 Q213 177 183 162 Q146 145 111 174 Q69 204 35 151Z"
          fill="#7A442D"
        />
        <path
          d="M48 139 Q79 103 111 123 Q150 147 184 115 Q216 88 232 140 Q203 160 182 149 Q146 133 112 160 Q75 186 48 139Z"
          fill="#55764A"
        />
        <g fill="#CB5338">
          <circle cx="92" cy="139" r="10" />
          <circle cx="166" cy="132" r="9" />
          <circle cx="202" cy="142" r="7" />
        </g>
        <path
          d="M78 67 Q140 41 202 72"
          fill="none"
          stroke="#FFE9B3"
          strokeWidth="5"
          strokeLinecap="round"
          opacity=".8"
        />
      </g>
      <g transform="translate(83 346)">
        <path d="M0 32 Q22 0 51 8 Q63 29 38 54 Q15 59 0 32Z" fill="#659051" />
        <path
          d="M0 32 Q24 29 51 8"
          stroke="#DDE6B6"
          strokeWidth="3"
          fill="none"
        />
      </g>
      <g transform="translate(421 335)">
        <circle cx="24" cy="24" r="25" fill="#E9C94D" />
        <path d="M0 24 Q24 2 48 24 Q24 47 0 24Z" fill="#F6E49A" />
        <path d="M24 3 Q23 24 24 45" stroke="#D6B84A" strokeWidth="2" />
      </g>
    </svg>
  );
}

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
            <a key={label} href={["#menu", "#cocina", "#visitanos"][i]}>
              {label}
            </a>
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
          <a
            className="button button-primary nav-order"
            href="#menu"
            aria-label={t.order}
          >
            <ShoppingBag size={16} />
            <span className="nav-label">{t.order}</span>
          </a>
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
            <a className="button button-primary" href="#menu">
              {t.menu}
              <ArrowRight size={17} />
            </a>
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
          <PepperArt />
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
          <a href="#menu" className="outline-link">
            {t.viewAll}
            <ArrowRight size={16} />
          </a>
        </div>
        <div className="menu-grid">
          {menuCards[locale].map((item) => (
            <article className="menu-card" key={item.mark}>
              <div className={`dish-art dish-${item.color}`} aria-hidden="true">
                <span className="dish-number">{item.mark}</span>
                <div className="dish-orbit">
                  {item.mark === "01" ? "✳" : item.mark === "02" ? "◌" : "✿"}
                </div>
                <div className="dish-plate">
                  <div className="dish-food" />
                </div>
              </div>
              <div className="menu-card-info">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                </div>
                <b>{item.price}</b>
              </div>
            </article>
          ))}
        </div>
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
        <a href="#menu" className="button button-light">
          {t.order}
          <ArrowRight size={17} />
        </a>
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
