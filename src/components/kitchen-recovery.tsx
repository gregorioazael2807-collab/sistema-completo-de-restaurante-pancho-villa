"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export function KitchenRecovery({ token = "", reset = false, emailConfigured = false }: { token?: string; reset?: boolean; emailConfigured?: boolean }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await fetch(reset ? "/api/auth/password-reset/complete" : "/api/auth/password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(reset ? { token, password: form.get("password") } : { email: form.get("email"), locale: "es", scope: "kitchen" }),
      });
      if (!response.ok) throw new Error();
      setDone(true);
    } catch {
      setError(reset ? "No se pudo cambiar la contraseña. Revisa sus requisitos o solicita un enlace nuevo." : "No se pudo completar la solicitud. Inténtalo de nuevo.");
    } finally { setPending(false); }
  }

  return <main className="kitchen-page kitchen-login-page"><section className="kitchen-login-card">
    <p className="kitchen-login-brand">PANCHO VILLA · CONTROL INTERNO</p>
    <h1>{reset ? "Nueva contraseña" : "Recuperar acceso"}</h1>
    <p>Cuenta del administrador de cocina.</p>
    {!reset && !emailConfigured && <p className="kitchen-alert" role="status">El envío de correo todavía no está configurado. No podrás recibir el enlace hasta activar el servicio y su procesador de envíos.</p>}
    {done ? <p role="status">{reset ? "Contraseña actualizada. Ya puedes iniciar sesión." : "Si el correo corresponde a un administrador activo, se ha solicitado un enlace válido durante 30 minutos. Su entrega depende del servicio de correo."}</p> : <form className="kitchen-login-form" onSubmit={submit}>
      {reset ? <><label htmlFor="recovery-password">Nueva contraseña</label><input id="recovery-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} /><small>Al menos 12 caracteres, una mayúscula y un número.</small></> : <><label htmlFor="recovery-email">Correo del administrador</label><input id="recovery-email" name="email" type="email" autoComplete="email" maxLength={254} required disabled={pending} /></>}
      {error && <p className="kitchen-alert" role="alert">{error}</p>}
      <button className="kitchen-action" disabled={pending || (!reset && !emailConfigured)}>{pending ? "Procesando…" : reset ? "Guardar contraseña" : "Solicitar enlace"}</button>
    </form>}
    <p><Link href="/cocina/login">Volver al acceso de cocina</Link></p>
  </section></main>;
}
