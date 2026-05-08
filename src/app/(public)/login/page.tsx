"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/useAuthStore";

function getPreviousPage(): string {
  if (typeof window === "undefined") return "/";
  const referer = document.referrer;
  if (!referer) return "/";
  try {
    const refererUrl = new URL(referer);
    if (refererUrl.origin === window.location.origin) {
      return refererUrl.pathname + refererUrl.search;
    }
  } catch {
    return "/";
  }
  return "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const { data: session, status } = useSession();
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const [initialFrom, setInitialFrom] = useState<string | null>(null);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const previousPage = getPreviousPage();
    setInitialFrom(fromParam || previousPage);
  }, [fromParam]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      login({
        id: session.user.id,
        email: session.user.email || "",
        name: session.user.name || "",
        role: session.user.role,
      });
      
      fetch("/api/auth/sync", { method: "POST", credentials: "include" }).catch(console.error);
    }
  }, [status, session, login]);

  useEffect(() => {
    if (session?.user && (user?.id || session.user.id) && initialFrom) {
      const role = session.user.role;
      const from = initialFrom;
      let destination = "/";

      const isValidFrom = from && from !== "/" && from !== "/login" && from !== "/registro" && !from.startsWith("/admin") && !from.startsWith("/afiliado") && !from.startsWith("/staff") && !from.startsWith("/repartidor") && !from.startsWith("/supplier") && !from.startsWith("/perfil");

      if (isValidFrom) {
        destination = from;
      } else {
        if (role === "ADMIN") {
          destination = "/admin";
        } else if (role === "AFFILIATE") {
          destination = "/afiliado";
        } else if (role === "STAFF") {
          destination = "/staff";
        } else if (role === "DELIVERY") {
          destination = "/repartidor";
        } else if (role === "SUPPLIER") {
          destination = "/supplier";
        } else {
          destination = "/";
        }
      }

      router.replace(destination);
    }
  }, [session, user, router, initialFrom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Usuario o contraseña incorrectos");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md border border-black p-8">
      <h1 className="text-3xl font-black mb-8 text-center">INICIAR SESIÓN</h1>
      
      {error && (
        <div className="mb-6 p-3 border border-red-600 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 border border-black bg-white text-black focus:outline-none focus:ring-0 focus:border-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-black bg-white text-black focus:outline-none focus:ring-0 focus:border-2"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-black text-white font-medium hover:bg-white hover:text-black hover:border-2 hover:border-black transition-colors disabled:opacity-50"
        >
          {loading ? "Verificando..." : "ENTRAR"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => router.push(initialFrom || "/")}
          className="text-sm underline"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <Suspense fallback={<div className="text-center">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}