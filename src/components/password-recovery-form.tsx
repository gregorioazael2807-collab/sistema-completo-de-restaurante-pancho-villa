"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { normalizeLocalePreference } from "@/lib/locale";
import "../app/recovery.css";

const copy = {
  es: { forgot: "Recupera tu cuenta", reset: "Crea una nueva contraseña", forgotText: "Te enviaremos un enlace seguro si encontramos una cuenta con ese correo.", resetText: "Elige una contraseña segura para volver a entrar a Pancho Villa.", email: "Correo electrónico", password: "Nueva contraseña", hint: "12 caracteres, una mayúscula y un número.", send: "Enviar enlace", update: "Actualizar contraseña", wait: "Un momento…", generic: "Si el correo coincide con una cuenta, recibirás un enlace de recuperación.", success: "Contraseña actualizada. Ya puedes iniciar sesión.", invalid: "El enlace no es válido o ya caducó. Solicita uno nuevo.", failure: "No se pudo completar la solicitud. Inténtalo de nuevo.", login: "Volver a iniciar sesión", back: "Volver", sent: "Solicitud recibida" },
  en: { forgot: "Recover your account", reset: "Create a new password", forgotText: "We’ll send a secure link if an account matches that email.", resetText: "Choose a secure password to sign back in to Pancho Villa.", email: "Email address", password: "New password", hint: "12 characters, one uppercase letter and one number.", send: "Send recovery link", update: "Update password", wait: "One moment…", generic: "If the email matches an account, you’ll receive a recovery link.", success: "Password updated. You can now sign in.", invalid: "This link is invalid or expired. Request a new one.", failure: "We could not complete your request. Please try again.", login: "Back to sign in", back: "Back", sent: "Request received" },
  de: { forgot: "Konto wiederherstellen", reset: "Neues Passwort erstellen", forgotText: "Wenn ein Konto zu dieser E-Mail gehört, senden wir einen sicheren Link.", resetText: "Wähle ein sicheres Passwort für deine nächste Anmeldung.", email: "E-Mail-Adresse", password: "Neues Passwort", hint: "12 Zeichen, ein Großbuchstabe und eine Zahl.", send: "Link senden", update: "Passwort ändern", wait: "Einen Moment…", generic: "Wenn die E-Mail zu einem Konto gehört, erhältst du einen Link.", success: "Passwort aktualisiert. Du kannst dich jetzt anmelden.", invalid: "Der Link ist ungültig oder abgelaufen. Fordere einen neuen an.", failure: "Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut.", login: "Zurück zur Anmeldung", back: "Zurück", sent: "Anfrage erhalten" },
} satisfies Record<Locale, Record<string, string>>;

export function PasswordRecoveryForm({ mode, token = "" }: { mode: "request" | "reset"; token?: string }) {
  const [locale, setLocale] = useState<Locale>("es");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { const saved = normalizeLocalePreference(localStorage.getItem("pancho-villa-locale")); setLocale(saved); }, []);
  const t = copy[locale];
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch(mode === "request" ? "/api/auth/password-reset" : "/api/auth/password-reset/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mode === "request" ? { email, locale } : { token, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error === "RESET_INVALID_OR_EXPIRED" ? t.invalid : t.failure); return; }
      setMessage(mode === "request" ? t.generic : t.success);
    } catch { setError(t.failure); } finally { setPending(false); }
  }
  const done = Boolean(message);
  return <main className="recovery-page"><header><Link className="brand" href="/"><span className="brand-mark">PV</span><span>PANCHO <b>VILLA</b><small>COCINA MEXICANA</small></span></Link><Link href="/login"><ArrowLeft size={15} />{t.back}</Link></header><section className="recovery-card"><span className="recovery-icon">{done ? <Check size={22} /> : mode === "request" ? <Mail size={21} /> : <ShieldCheck size={22} />}</span><p className="eyebrow">PANCHO VILLA · CUENTA</p><h1>{mode === "request" ? t.forgot : t.reset}</h1><p className="recovery-intro">{mode === "request" ? t.forgotText : t.resetText}</p>{done ? <div className="recovery-message" role="status">{message}<Link href="/login">{t.login}</Link></div> : <form onSubmit={submit}>{mode === "request" ? <label>{t.email}<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label> : <><label>{t.password}<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><small>{t.hint}</small></>}{error && <p className="recovery-error" role="alert">{error}</p>}<button className="button button-primary" type="submit" disabled={pending}>{pending ? <><LoaderCircle size={15} className="spin-icon" />{t.wait}</> : mode === "request" ? t.send : t.update}</button></form>}{mode === "request" && <small className="recovery-generic-note">{t.generic}</small>}</section></main>;
}
