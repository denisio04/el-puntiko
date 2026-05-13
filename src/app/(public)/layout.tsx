"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingCart, Search, X, User, LogOut, UserPlus, Menu, Package, Phone } from "lucide-react";
import { ContactSubmenu } from "@/components/ui/ContactSubmenu";
import { useCartStore } from "@/stores/useCartStore";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";


function useCurrentPath() {
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState(pathname);

  useEffect(() => {
    setCurrentPath(window.location.pathname + window.location.search);
  }, [pathname]);

  return currentPath;
}

function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const user = session?.user;
  const itemCount = useCartStore((state) => state.getItemCount());
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [contactNumber, setContactNumber] = useState<string | null>(null);
  const [menuHeight, setMenuHeight] = useState<number | undefined>(undefined);
  const mainPanelRef = useRef<HTMLDivElement>(null);
  const contactPanelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = useCurrentPath();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/contact")
      .then((res) => res.json())
      .then((data: { contactNumber: string | null }) => setContactNumber(data.contactNumber))
      .catch(() => setContactNumber(null));
  }, []);

  useEffect(() => {
    if (!menuOpen) setContactMenuOpen(false);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.menu-dropdown')) {
          setMenuOpen(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      setMenuHeight(undefined);
      return;
    }
    const raf = requestAnimationFrame(() => {
      const activePanel = contactMenuOpen ? contactPanelRef.current : mainPanelRef.current;
      if (activePanel) {
        setMenuHeight(activePanel.scrollHeight);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [menuOpen, contactMenuOpen]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchValue.trim()) {
        router.push(`/?search=${encodeURIComponent(searchValue.trim())}`);
      }
    },
    [searchValue, router],
  );

  const clearSearch = useCallback(() => {
    setSearchValue("");
    router.push("/");
    setSearchOpen(false);
  }, [router]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchValue.trim()) {
        router.push(`/?search=${encodeURIComponent(searchValue.trim())}`, {
          scroll: false,
        });
      } else if (window.location.search.includes("search=")) {
        router.push("/", { scroll: false });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue, router]);

  return (
    <>
      <header className="sticky top-0 bg-white border-b border-black z-50">
        <nav className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
          {isAuthenticated ? (
            <Link
              href="/admin"
              className="text-2xl md:text-3xl font-black tracking-tighter shrink-0 hover:opacity-70"
            >
              EL PUNTIKO.
            </Link>
          ) : (
            <button
              onClick={() => router.push(pathname === "/" ? "/login" : "/")}
              className="text-2xl md:text-3xl font-black tracking-tighter shrink-0 hover:opacity-70"
            >
              EL PUNTIKO.
            </button>
          )}

          <div className="flex items-center gap-2">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="relative flex items-center">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-32 md:w-48 lg:w-64 px-3 py-1.5 pr-8 text-sm border border-black focus:outline-none focus:ring-1 focus:ring-black"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (searchValue) {
                      clearSearch();
                    } else {
                      setSearchOpen(false);
                    }
                  }}
                  className="absolute right-2 p-0.5 hover:bg-black hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 hover:bg-black hover:text-white transition-colors"
                aria-label="Buscar"
              >
                <Search className="w-5 md:w-6 h-5 md:h-6" />
              </button>
            )}

            <Link
              href="/checkout"
              className="p-2 hover:bg-black hover:text-white transition-colors flex items-center gap-2"
            >
              <ShoppingCart className="w-5 md:w-6 h-5 md:h-6" />
              {mounted && itemCount > 0 && (
                <span className="text-xs md:text-sm font-bold">
                  {itemCount}
                </span>
              )}
            </Link>

            <div className="relative menu-dropdown">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-2 hover:bg-black hover:text-white transition-colors"
                aria-label="Menú"
              >
                <Menu className="w-5 md:w-6 h-5 md:h-6" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-black shadow-lg z-50 overflow-hidden"
                  style={{ height: menuHeight ?? 'auto' }}>
                  <div
                    className={`flex items-start transition-transform duration-300 ease-in-out ${
                      contactMenuOpen ? '-translate-x-1/2' : 'translate-x-0'
                    }`}
                    style={{ width: "200%" }}
                  >
                    <div className="w-1/2" ref={mainPanelRef}>
                      {isAuthenticated ? (
                        <div className="flex flex-col">
                      {user?.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm"
                          onClick={() => setMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Panel Admin
                        </Link>
                      )}
                      {user?.role === "AFFILIATE" && (
                        <Link
                          href="/afiliado"
                          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm"
                          onClick={() => setMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Mi Panel
                        </Link>
                      )}
                      {user?.role === "STAFF" && (
                        <Link
                          href="/staff"
                          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm"
                          onClick={() => setMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Panel Staff
                        </Link>
                      )}
                      {user?.role === "DELIVERY" && (
                        <Link
                          href="/delivery"
                          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm"
                          onClick={() => setMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Panel Delivery
                        </Link>
                      )}
                      {user?.role === "SUPPLIER" && (
                        <Link
                          href="/supplier"
                          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm"
                          onClick={() => setMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Panel Proveedor
                        </Link>
                      )}
                      {user?.role === "CUSTOMER" && (
                        <Link
                          href="/perfil"
                          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm"
                          onClick={() => setMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Mi Perfil
                        </Link>
                      )}
                      <div className="border-t border-black">
                        <Link
                          href="/perfil/pedidos"
                          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm"
                          onClick={() => setMenuOpen(false)}
                        >
                          <Package className="w-4 h-4" />
                          Mis Pedidos
                        </Link>
                      </div>
                      <div className="border-t border-black">
                        <button
                          onClick={() => setContactMenuOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm w-full text-left"
                        >
                          <Phone className="w-4 h-4" />
                          Contacto
                        </button>
                      </div>
                      <div className="border-t border-black">
                        <button
                          onClick={async () => {
                            setMenuOpen(false);
                            await signOut({ callbackUrl: "/" });
                          }}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <Link
                        href={`/login?from=${encodeURIComponent(currentPath)}`}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm"
                        onClick={() => setMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Iniciar Sesión
                      </Link>
                      <Link
                        href={`/registro?from=${encodeURIComponent(currentPath)}`}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm"
                        onClick={() => setMenuOpen(false)}
                      >
                        <UserPlus className="w-4 h-4" />
                        Registrarse
                      </Link>
                      <div className="border-t border-black">
                        <button
                          onClick={() => setContactMenuOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm w-full text-left"
                        >
                          <Phone className="w-4 h-4" />
                          Contacto
                        </button>
                      </div>
                    </div>
                  )}
                    </div>
                    <div className="w-1/2" ref={contactPanelRef}>
                      <ContactSubmenu contactNumber={contactNumber} onBack={() => setContactMenuOpen(false)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <NavigationWrapper>{children}</NavigationWrapper>
    </Suspense>
  );
}