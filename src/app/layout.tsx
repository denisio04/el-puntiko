import type { Metadata } from "next";
import "./globals.css";
import { NextAuthProvider } from "@/providers/SessionProvider";

export const metadata: Metadata = {
  title: "EL PUNTIKO.",
  description: "Tienda online - Pago contra reembolso",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-black">
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}