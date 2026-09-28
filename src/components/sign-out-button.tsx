"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="button button-outline"
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Cerrar sesión
    </button>
  );
}
