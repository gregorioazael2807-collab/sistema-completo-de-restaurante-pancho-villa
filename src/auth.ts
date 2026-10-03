import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticate } from "@/lib/security";
import { scopedAuthConfig } from "@/lib/auth-config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...scopedAuthConfig("customer"),
  providers: [Credentials({
    credentials: {
      email: { type: "email", label: "Correo electrónico" },
      password: { type: "password", label: "Contraseña" },
    },
    async authorize(credentials, request) {
      const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const user = await authenticate(credentials, ip);
      return user?.role === "CLIENTE" ? user : null;
    },
  })],
});
