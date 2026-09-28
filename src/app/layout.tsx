import type { Metadata } from "next";
import "./globals.css";
import "./auth.css";
import "./catalog.css";
import "./checkout.css";
import "./kitchen.css";
import "./admin.css";
import "./assistant.css";
import "./recovery.css";
import "./account.css";
import "./automation.css";
import "./products.css";
import { CartProvider } from "@/components/cart-provider";

export const metadata: Metadata = {
  title: "Pancho Villa — Sabor mexicano, hecho para compartir",
  description:
    "Descubre el menú de Pancho Villa, pide para recoger o recibir en casa y sigue tu pedido en tiempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
