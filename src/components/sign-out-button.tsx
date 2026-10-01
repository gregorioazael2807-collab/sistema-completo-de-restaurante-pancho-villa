"use client";

import { signOut } from "next-auth/react";
import type { Locale } from "@/lib/locale";

export function SignOutButton({ locale = "es" }: { locale?: Locale }) {
  return (
    <button
      className="button button-outline"
      type="button"
      onClick={() => { window.dispatchEvent(new Event("pancho-session-change")); void signOut({ callbackUrl: "/" }); }}
    >
      {locale === "es" ? "Cerrar sesión" : locale === "en" ? "Sign out" : "Abmelden"}
    </button>
  );
}
