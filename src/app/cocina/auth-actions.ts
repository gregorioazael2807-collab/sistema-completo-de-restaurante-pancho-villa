"use server";

import { AuthError } from "next-auth";
import { kitchenSignIn, kitchenSignOut } from "@/kitchen-auth";

export async function loginKitchen(email: string, password: string) {
  try {
    await kitchenSignIn("kitchen-owner", { email, password, redirect: false, redirectTo: "/cocina" });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false };
    throw error;
  }
}

export async function logoutKitchen() {
  await kitchenSignOut({ redirect: false, redirectTo: "/cocina/login" });
}
