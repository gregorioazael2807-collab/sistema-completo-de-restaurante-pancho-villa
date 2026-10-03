import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticate } from "@/lib/security";
import { authenticateKitchenOwner } from "@/lib/kitchen-owner-auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  ...(process.env.AUTH_COOKIE_NAME
    ? {
        cookies: {
          sessionToken: {
            name: process.env.AUTH_COOKIE_NAME,
            options: {
              httpOnly: true,
              sameSite: "lax" as const,
              path: "/",
              secure: process.env.NODE_ENV === "production",
            },
          },
          csrfToken: {
            name: `${process.env.AUTH_COOKIE_NAME}.csrf`,
            options: {
              httpOnly: true,
              sameSite: "lax" as const,
              path: "/",
              secure: process.env.NODE_ENV === "production",
            },
          },
          callbackUrl: {
            name: `${process.env.AUTH_COOKIE_NAME}.callback`,
            options: {
              sameSite: "lax" as const,
              path: "/",
              secure: process.env.NODE_ENV === "production",
            },
          },
        },
      }
    : {}),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "kitchen-owner",
      name: "Propietario de cocina",
      credentials: {
        email: { type: "email", label: "Correo del propietario" },
        password: { type: "password", label: "Contraseña de cocina" },
      },
      async authorize(credentials) {
        return authenticateKitchenOwner(credentials);
      },
    }),
    Credentials({
      credentials: {
        email: { type: "email", label: "Correo electrónico" },
        password: { type: "password", label: "Contraseña" },
      },
      async authorize(credentials, request) {
        const ipAddress =
          request.headers.get("x-real-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        return authenticate(credentials, ipAddress);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authenticated = user as typeof user & {
          role: "ADMIN" | "COCINA" | "EMPLEADO" | "CLIENTE";
          sessionVersion: number;
        };
        token.sub = authenticated.id;
        token.role = authenticated.role;
        token.sessionVersion = authenticated.sessionVersion;
      }
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
      const activeUser = await db.user.findUnique({
        where: { id: user.id },
        select: { active: true },
      });
      return Boolean(activeUser?.active);
    },
  },
});
