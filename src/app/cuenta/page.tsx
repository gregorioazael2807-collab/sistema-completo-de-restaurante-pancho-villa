import { requireCurrentUser } from "@/lib/current-user";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";

export default async function AccountPage() {
  const user = await requireCurrentUser();
  return (
    <main className="account-page">
      <header className="account-top">
        <Link className="brand" href="/">
          <span className="brand-mark">PV</span>
          <span>
            PANCHO <b>VILLA</b>
            <small>COCINA MEXICANA</small>
          </span>
        </Link>
        <SignOutButton />
      </header>
      <section className="account-card">
        <p className="eyebrow">
          <span />
          TU CUENTA PANCHO VILLA
        </p>
        <h1>¡Hola, {user.firstName}!</h1>
        <p>
          Tu cuenta está lista. Muy pronto podrás consultar aquí tus pedidos,
          favoritos y direcciones.
        </p>
        <dl>
          <div>
            <dt>Correo</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Cuenta</dt>
            <dd>{user.role === "CLIENTE" ? "Cliente" : user.role}</dd>
          </div>
        </dl>
        <Link className="button button-primary" href="/#menu">
          Explorar el menú
        </Link>
      </section>
    </main>
  );
}
