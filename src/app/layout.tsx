import type { Metadata } from "next";
import "./globals.css";
import { NextAuthProvider } from "@/providers/SessionProvider";
import { CurrencyProvider } from "@/providers/CurrencyProvider";

export const metadata: Metadata = {
  title: "EL PUNTIKO.",
  description: "Tienda online - Pago contra reembolso",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon1.png",
  },
  openGraph: {
    title: "EL PUNTIKO.",
    description: "Tienda online - Pago contra reembolso",
    images: ["/favicon1.png"],
  },
  other: {
    "googlebot": "notranslate",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" translate="no" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-black" suppressHydrationWarning>
        <NextAuthProvider>
          <CurrencyProvider>{children}</CurrencyProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}