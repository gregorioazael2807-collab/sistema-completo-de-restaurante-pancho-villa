"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export function KitchenRegister() {
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmation")) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/kitchen/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerName: form.get("ownerName"),
          restaurantName: form.get("restaurantName"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        setError(result.error === "OWNER_EMAIL_EXISTS" ? "Ya existe un propietario con ese correo en cocina." : result.error === "INVALID_INPUT" ? "Revisa los datos. La contraseña requiere 12 caracteres, una mayúscula y un número." : "No se pudo crear la cuenta. Inténtalo más tarde.");
        return;
      }
      setCreated(true);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally { setPending(false); }
  }

  return <main className="kitchen-page kitchen-login-page"><section className="kitchen-login-card">
    <p className="kitchen-login-brand">PANCHO VILLA · CONTROL INTERNO</p>
    <h1>Crear cuenta de cocina</h1>
    <p>Crea tu cuenta de propietario y tu restaurante, separados de las cuentas de clientes.</p>
    {created ? <div role="status"><h2>Cuenta creada</h2><p>Tu restaurante y contraseña quedaron guardados. Falta activar tu instalación privada. Una vez activada, podrás entrar a sus comandas con este correo y contraseña.</p></div> : <>
      <p className="kitchen-alert">Cada restaurante necesita una instalación privada. Crear esta cuenta no concede acceso a Pancho Villa: el responsable de la instalación debe activarla.</p>
      <form className="kitchen-login-form" onSubmit={submit}>
        <label htmlFor="owner-name">Tu nombre</label><input id="owner-name" name="ownerName" autoComplete="name" minLength={2} maxLength={100} required disabled={pending} />
        <label htmlFor="restaurant-name">Nombre del restaurante</label><input id="restaurant-name" name="restaurantName" autoComplete="organization" minLength={2} maxLength={120} required disabled={pending} />
        <label htmlFor="owner-email">Correo</label><input id="owner-email" name="email" type="email" autoComplete="email" maxLength={254} required disabled={pending} />
        <label htmlFor="owner-password">Crear contraseña de cocina</label><input id="owner-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} />
        <small>Al menos 12 caracteres, una mayúscula y un número.</small>
        <label htmlFor="owner-confirmation">Repetir contraseña</label><input id="owner-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} />
        {error && <p className="kitchen-alert" role="alert">{error}</p>}
        <button className="kitchen-action" disabled={pending}>{pending ? "Creando…" : "Crear mi cuenta y restaurante"}</button>
      </form>
    </>}
    <p><Link href="/cocina/login">Volver al acceso de cocina</Link></p>
  </section></main>;
}
