import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateKitchenOwner } from "@/lib/kitchen-owner-auth";
import { scopedAuthConfig } from "@/lib/auth-config";

export const {
  handlers: kitchenHandlers,
  auth: kitchenAuth,
  signIn: kitchenSignIn,
  signOut: kitchenSignOut,
} = NextAuth({
  ...scopedAuthConfig("kitchen"),
  providers: [Credentials({
    id: "kitchen-owner",
    name: "Propietario de cocina",
    credentials: {
      email: { type: "email", label: "Correo del propietario" },
      password: { type: "password", label: "Contraseña de cocina" },
    },
    async authorize(credentials) { return authenticateKitchenOwner(credentials); },
  })],
});
