"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingCart, Search, X, User, LogOut, UserPlus } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { WhatsAppNavButton } from "@/components/ui/WhatsAppNavButton";

function useCurrentPath() {
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState(pathname);

  useEffect(() => {
    setCurrentPath(window.location.pathname + window.location.search);
  }, [pathname]);

  return currentPath;
}

function NavigationContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const user = session?.user;
  const itemCount = useCartStore((state) => state.getItemCount());
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = useCurrentPath();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchValue.trim()) {
        router.push(`/?search=${encodeURIComponent(searchValue.trim())}`);
      }
    },
    [searchValue, router],
  );

  const clearSearch = () => {
    setSearchValue("");
    router.push("/");
    setSearchOpen(false);
  };

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
          <NavigationLinks currentPath={currentPath} />
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}

function NavigationLinks({ currentPath }: { currentPath: string }) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const user = session?.user;
  const itemCount = useCartStore((state) => state.getItemCount());
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchValue.trim()) {
        router.push(`/?search=${encodeURIComponent(searchValue.trim())}`);
      }
    },
    [searchValue, router],
  );

  const clearSearch = () => {
    setSearchValue("");
    router.push("/");
    setSearchOpen(false);
  };

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

        {isAuthenticated ? (
          <>
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="p-2 hover:bg-black hover:text-white transition-colors"
                aria-label="Panel admin"
              >
                <User className="w-5 md:w-6 h-5 md:h-6" />
              </Link>
            )}
            {user?.role === "AFFILIATE" && (
              <Link
                href="/afiliado"
                className="p-2 hover:bg-black hover:text-white transition-colors"
                aria-label="Panel afiliado"
              >
                <User className="w-5 md:w-6 h-5 md:h-6" />
              </Link>
            )}
            {user?.role === "STAFF" && (
              <Link
                href="/staff"
                className="p-2 hover:bg-black hover:text-white transition-colors"
                aria-label="Panel staff"
              >
                <User className="w-5 md:w-6 h-5 md:h-6" />
              </Link>
            )}
            {user?.role === "DELIVERY" && (
              <Link
                href="/delivery"
                className="p-2 hover:bg-black hover:text-white transition-colors"
                aria-label="Panel delivery"
              >
                <User className="w-5 md:w-6 h-5 md:h-6" />
              </Link>
            )}
            {user?.role === "SUPPLIER" && (
              <Link
                href="/supplier"
                className="p-2 hover:bg-black hover:text-white transition-colors"
                aria-label="Panel proveedor"
              >
                <User className="w-5 md:w-6 h-5 md:h-6" />
              </Link>
            )}
            {user?.role === "CUSTOMER" && (
              <Link
                href="/perfil"
                className="p-2 hover:bg-black hover:text-white transition-colors"
                aria-label="Mi perfil"
              >
                <User className="w-5 md:w-6 h-5 md:h-6" />
              </Link>
            )}
            <WhatsAppNavButton />
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
            <button
              onClick={async () => {
                await signOut({ callbackUrl: "/" });
              }}
              className="p-2 hover:bg-black hover:text-white transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 md:w-6 h-5 md:h-6" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1">
            <Link
              href={`/login?from=${encodeURIComponent(currentPath)}`}
              className="p-2 hover:bg-black hover:text-white transition-colors"
              aria-label="Iniciar sesión"
            >
              <User className="w-5 md:w-6 h-5 md:h-6" />
            </Link>
            <Link
              href={`/registro?from=${encodeURIComponent(currentPath)}`}
              className="p-2 hover:bg-black hover:text-white transition-colors"
              aria-label="Registrarse"
            >
              <UserPlus className="w-5 md:w-6 h-5 md:h-6" />
            </Link>
            <WhatsAppNavButton />
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
          </div>
        )}
      </div>
    </>
  );
}

function NavigationWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <NavigationContent>{children}</NavigationContent>
    </Suspense>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavigationWrapper>{children}</NavigationWrapper>;
}
