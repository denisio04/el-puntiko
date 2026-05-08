"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { signOut } from "next-auth/react";
import { useState } from "react";

const affiliateLinks = [
  { href: "/afiliado", label: "Dashboard" },
  { href: "/afiliado/tienda", label: "EL PUNTIKO." },
  { href: "/afiliado/ventas", label: "Ventas" },
];

export default function AffiliateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, setLoggingOut } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/" });
    logout();
    router.push("/");
  };

  const getPageTitle = () => {
    const current = affiliateLinks.find(l => l.href === pathname);
    return current?.label || "AFILIADO";
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:block w-64 bg-black text-white p-4 flex flex-col fixed h-screen">
        <h1 className="text-xl font-black mb-8">AFILIADO</h1>
        <nav className="space-y-1 flex-1">
          {affiliateLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2 rounded-none ${
                pathname === link.href
                  ? "bg-white text-black"
                  : "hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-2">{user?.name}</p>
          <button
            onClick={handleLogout}
            className="text-sm hover:underline text-gray-300"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-black text-white h-14 px-4 flex items-center justify-between">
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <h1 className="text-lg font-black">{getPageTitle()}</h1>
        <div className="w-6" />
      </header>

      {menuOpen && (
        <nav className="md:hidden fixed top-14 left-0 right-0 z-20 bg-black text-white border-b-2 border-white">
          {affiliateLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 ${
                pathname === link.href ? "bg-white text-black" : "hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setMenuOpen(false);
              handleLogout();
            }}
            className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-gray-300"
          >
            Cerrar Sesión
          </button>
        </nav>
      )}

      <main className={`flex-1 pt-14 md:pt-0 md:ml-64 ${menuOpen ? 'mt-48' : ''}`}>
        {children}
      </main>
    </div>
  );
}