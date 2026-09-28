import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
