import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

export type AuthScope = "customer" | "kitchen";

export function scopedAuthConfig(scope: AuthScope): Omit<NextAuthConfig, "providers"> {
  const secure = process.env.NODE_ENV === "production";
  const prefix = process.env.AUTH_COOKIE_NAME ?? "pancho-villa.session";
  const namespace = `${prefix}.${scope}`;
  const name = `${namespace}.session-token`;
  return {
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    basePath: scope === "kitchen" ? "/api/kitchen-auth" : "/api/auth",
    cookies: {
      sessionToken: { name, options: { httpOnly: true, sameSite: "lax", path: "/", secure } },
      csrfToken: { name: `${namespace}.csrf-token`, options: { httpOnly: true, sameSite: "lax", path: "/", secure } },
      callbackUrl: { name: `${namespace}.callback-url`, options: { sameSite: "lax", path: "/", secure } },
    },
    session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
    pages: { signIn: scope === "kitchen" ? "/cocina/login" : "/login" },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          const authenticated = user as typeof user & { role: Role; sessionVersion: number };
          token.sub = authenticated.id;
          token.role = authenticated.role;
          token.sessionVersion = authenticated.sessionVersion;
          token.authScope = scope;
        }
        // Descarta también las sesiones antiguas compartidas.
        if (token.authScope !== scope) return null;
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.sub ?? "";
          session.user.role = (token.role as Role | undefined) ?? "CLIENTE";
          session.user.sessionVersion = Number(token.sessionVersion ?? 0);
        }
        return session;
      },
      async signIn({ user }) {
        if (!user.id) return false;
        const current = await db.user.findUnique({ where: { id: user.id }, select: { active: true, role: true } });
        return Boolean(current?.active && (scope === "kitchen" ? current.role === "ADMIN" : current.role === "CLIENTE"));
      },
    },
  };
}
