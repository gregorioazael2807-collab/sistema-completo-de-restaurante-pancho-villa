"use client";

import { useState, type FormEvent } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function KitchenLogin({ unauthorized = false }: { unauthorized?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const result = await signIn("kitchen-owner", {
        email: String(form.get("email") ?? "").trim().toLowerCase(),
        password: String(form.get("password") ?? ""),
        redirect: false,
      });
      if (!result || result.error) {
        setError("No se pudo iniciar sesión. Comprueba tus datos y que tu restaurante haya sido activado.");
      } else {
        router.replace("/cocina");
        router.refresh();
      }
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="kitchen-page kitchen-login-page">
      <section className="kitchen-login-card" aria-labelledby="kitchen-login-title">
        <p className="kitchen-login-brand">PANCHO VILLA · CONTROL INTERNO</p>
        <h1 id="kitchen-login-title">Comandas de cocina</h1>
        <p>Acceso exclusivo del administrador del restaurante.</p>
        {unauthorized ? (
          <div>
            <p className="kitchen-alert" role="alert">Esta cuenta no tiene permiso de administrador.</p>
            <button className="kitchen-action" onClick={() => signOut({ callbackUrl: "/cocina/login" })}>Usar otra cuenta</button>
          </div>
        ) : (
          <form onSubmit={submit} className="kitchen-login-form">
            <label htmlFor="kitchen-email">Correo del administrador</label>
            <input id="kitchen-email" name="email" type="email" autoComplete="username" required disabled={pending} />
            <label htmlFor="kitchen-password">Contraseña</label>
            <input id="kitchen-password" name="password" type="password" autoComplete="current-password" required disabled={pending} />
            {error && <p className="kitchen-alert" role="alert">{error}</p>}
            <button className="kitchen-action" type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar a las comandas"}</button>
          </form>
        )}
        <p><Link href="/cocina/recuperar">¿Olvidaste tu contraseña?</Link></p>
        <Link className="kitchen-action" href="/cocina/registro">Crear cuenta de cocina</Link>
        <small>Usa tu cuenta de propietario. La instalación del restaurante debe estar activada antes de entrar.</small>
      </section>
    </main>
  );
}
