"use client";

import { useEffect, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Flame, LoaderCircle, LockKeyhole } from "lucide-react";
import { normalizeLocalePreference, type Locale } from "@/lib/locale";

const labels = {
  es: {
    loginTitle: "Qué bueno verte de nuevo.",
    registerTitle: "Tu mesa empieza aquí.",
    loginText: "Entra a tu cuenta y sigue disfrutando tus favoritos.",
    registerText:
      "Crea tu cuenta para pedir y seguir tus pedidos con facilidad.",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo electrónico",
    phone: "Teléfono (opcional)",
    password: "Contraseña",
    forgot: "¿Olvidaste tu contraseña?",
    login: "Iniciar sesión",
    register: "Crear cuenta",
    noAccount: "¿Aún no tienes cuenta?",
    hasAccount: "¿Ya tienes cuenta?",
    signup: "Regístrate",
    signin: "Inicia sesión",
    passwordRule: "Al menos 12 caracteres, una mayúscula y un número.",
    error:
      "No pudimos completar la solicitud. Comprueba tus datos e inténtalo otra vez.",
    invalidLogin: "El correo o la contraseña no son correctos.",
    emailExists: "Ya existe una cuenta con ese correo electrónico.",
    rateLimited:
      "Demasiados intentos. Espera unos minutos antes de probar otra vez.",
    wait: "Un momento…",
    promise: "BUEN SABOR, CERO COMPLICACIONES",
    visual: "Tu antojo,\na tu manera.",
    visualText: "Tus favoritos y tus pedidos, siempre a mano.",
  },
  en: {
    loginTitle: "Good to see you again.",
    registerTitle: "Your table starts here.",
    loginText: "Sign in to your account and enjoy your favourites again.",
    registerText: "Create an account to order and track your meals with ease.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email address",
    phone: "Phone (optional)",
    password: "Password",
    forgot: "Forgot your password?",
    login: "Sign in",
    register: "Create account",
    noAccount: "New to Pancho Villa?",
    hasAccount: "Already have an account?",
    signup: "Create one",
    signin: "Sign in",
    passwordRule: "At least 12 characters, one uppercase letter and a number.",
    error:
      "We couldn't complete your request. Check your details and try again.",
    invalidLogin: "The email or password is incorrect.",
    emailExists: "An account with this email already exists.",
    rateLimited: "Too many attempts. Please wait a few minutes and try again.",
    wait: "One moment…",
    promise: "GREAT FLAVOUR, NO FUSS",
    visual: "Your craving,\nyour way.",
    visualText: "Your favourites and orders, always close at hand.",
  },
  de: {
    loginTitle: "Schön, dich wiederzusehen.",
    registerTitle: "Dein Platz ist hier.",
    loginText: "Melde dich an und genieße deine Lieblingsgerichte.",
    registerText:
      "Erstelle ein Konto und verfolge deine Bestellungen ganz einfach.",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail-Adresse",
    phone: "Telefon (optional)",
    password: "Passwort",
    forgot: "Passwort vergessen?",
    login: "Anmelden",
    register: "Konto erstellen",
    noAccount: "Noch kein Konto?",
    hasAccount: "Du hast schon ein Konto?",
    signup: "Registrieren",
    signin: "Anmelden",
    passwordRule: "Mindestens 12 Zeichen, ein Großbuchstabe und eine Zahl.",
    error:
      "Die Anfrage ist fehlgeschlagen. Prüfe deine Angaben und versuche es erneut.",
    invalidLogin: "E-Mail-Adresse oder Passwort ist falsch.",
    emailExists: "Für diese E-Mail-Adresse gibt es bereits ein Konto.",
    rateLimited:
      "Zu viele Versuche. Bitte warte einige Minuten und versuche es erneut.",
    wait: "Einen Moment…",
    promise: "GUTER GESCHMACK, GANZ EINFACH",
    visual: "Dein Appetit,\ndein Moment.",
    visualText: "Deine Lieblingsgerichte und Bestellungen immer griffbereit.",
  },
} satisfies Record<Locale, Record<string, string>>;

export function AuthVisual({ mode }: { mode: "login" | "register" }) {
  const [locale, setLocale] = useState<Locale>("es");
  const text = labels[locale];

  useEffect(() => {
    const saved = normalizeLocalePreference(
      localStorage.getItem("pancho-villa-locale"),
    );
    setLocale(saved);
  }, []);

  return (
    <aside className="auth-visual">
      <Link
        className="brand auth-brand"
        href="/"
        aria-label="Pancho Villa, inicio"
      >
        <span className="brand-mark">
          <Flame size={20} />
        </span>
        <span>
          PANCHO <b>VILLA</b>
          <small>COCINA MEXICANA</small>
        </span>
      </Link>
      <div className="auth-visual-content">
        <div className="auth-food-art" aria-hidden="true">
          <span className="auth-art-sun" />
          <div className="auth-tortilla">
            <span>✳</span>
            <i />
            <b>●　✳　●</b>
          </div>
          <small>
            DE NUESTRA COCINA
            <br />A TU MESA
          </small>
        </div>
        <p className="eyebrow">{text.promise}</p>
        <h1>{text.visual}</h1>
        <p>{text.visualText}</p>
      </div>
      <span className="auth-visual-coordinate">
        COCINA MEXICANA · HECHA CON CARIÑO
      </span>
      <span className="auth-side-number">PV — 01</span>
      <span className="auth-mode-indicator">
        {mode === "login" ? "01 / 02" : "02 / 02"}
      </span>
    </aside>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("es");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const text = labels[locale];
  const isRegister = mode === "register";

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

  function changeLocale(next: Locale) {
    setLocale(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") ?? "");

    if (
      isRegister &&
      (password.length < 12 ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password))
    ) {
      setError(text.passwordRule);
      setPending(false);
      return;
    }

    try {
      if (isRegister) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            firstName: form.get("firstName"),
            lastName: form.get("lastName"),
            email,
            phone: form.get("phone"),
            password,
            locale,
          }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          const code = result.error;
          throw new Error(
            code === "EMAIL_EXISTS" ? "EMAIL_EXISTS" : code || "REQUEST_FAILED",
          );
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) throw new Error("INVALID_LOGIN");
      router.replace("/cuenta");
      router.refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "";
      setError(
        message === "EMAIL_EXISTS"
          ? text.emailExists
          : message === "INVALID_LOGIN"
            ? text.invalidLogin
            : message === "RATE_LIMITED"
              ? text.rateLimited
              : text.error,
      );
      setPending(false);
    }
  }

  return (
    <main className="auth-layout">
      <AuthVisual mode={mode} />
      <section className="auth-panel">
        <div className="auth-panel-top">
          <Link className="auth-back" href="/">
            ←{" "}
            <span>
              {locale === "es" ? "Volver" : locale === "en" ? "Back" : "Zurück"}
            </span>
          </Link>
          <div className="auth-languages" role="group" aria-label="Idioma">
            {(["es", "en", "de"] as const).map((language) => (
              <button
                type="button"
                key={language}
                onClick={() => changeLocale(language)}
                aria-pressed={locale === language}
                className={locale === language ? "selected" : ""}
              >
                {language === "es" ? "ES" : language === "en" ? "EN" : "DE"}
              </button>
            ))}
          </div>
        </div>
        <div className="auth-form-wrap">
          <span className="auth-mobile-logo">
            <span className="brand-mark">
              <Flame size={18} />
            </span>
            PANCHO <b>VILLA</b>
          </span>
          <span className="auth-kicker">
            <LockKeyhole size={14} />
            {isRegister ? "PANCHO VILLA CLUB" : "TU CUENTA"}
          </span>
          <h2>{isRegister ? text.registerTitle : text.loginTitle}</h2>
          <p className="auth-description">
            {isRegister ? text.registerText : text.loginText}
          </p>
          <form className="auth-form" onSubmit={submit}>
            {isRegister && (
              <div className="auth-name-row">
                <label>
                  {text.firstName}
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  {text.lastName}
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    required
                    maxLength={80}
                  />
                </label>
              </div>
            )}
            <label>
              {text.email}
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
            {!isRegister && <Link className="auth-forgot" href="/forgot-password">{text.forgot}</Link>}
            {isRegister && (
              <label>
                {text.phone}
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  maxLength={32}
                />
              </label>
            )}
            <label>
              {text.password}
              <input
                type="password"
                name="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={isRegister ? 12 : 1}
                maxLength={128}
              />
            </label>
            {isRegister && (
              <small className="password-hint">{text.passwordRule}</small>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={pending}
            >
              {pending ? (
                <>
                  <LoaderCircle size={16} className="spin-icon" />
                  {text.wait}
                </>
              ) : (
                <>
                  {isRegister ? text.register : text.login}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {isRegister ? text.hasAccount : text.noAccount}{" "}
            <Link href={isRegister ? "/login" : "/register"}>
              {isRegister ? text.signin : text.signup}
            </Link>
          </p>
          <p className="auth-privacy">
            {locale === "es"
              ? "Tus datos se usan únicamente para gestionar tu cuenta y tus pedidos."
              : locale === "en"
                ? "Your details are only used to manage your account and orders."
                : "Deine Daten werden nur für dein Konto und deine Bestellungen verwendet."}
          </p>
        </div>
        <span className="auth-panel-footer">
          PANCHO VILLA · SABOR MEXICANO PARA COMPARTIR
        </span>
      </section>
    </main>
  );
}
