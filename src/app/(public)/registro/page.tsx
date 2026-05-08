"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type FormData = {
  username: string;
  password: string;
  name: string;
  phone: string;
  ci: string;
  address: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

async function registerUser(data: FormData) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Error al registrarse");
  }

  return res.json();
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const action = searchParams.get("action");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
    name: "",
    phone: "",
    ci: "",
    address: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = "El usuario debe tener al menos 3 caracteres";
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }
    if (!formData.name) {
      newErrors.name = "El nombre es requerido";
    }
    if (!formData.phone) {
      newErrors.phone = "El teléfono es requerido";
    }
    if (!formData.ci) {
      newErrors.ci = "El CI es requerido";
    }
    if (!formData.address) {
      newErrors.address = "La dirección es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      await registerUser(formData);
      
      const signInResult = await signIn("credentials", {
        username: formData.username,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
      } else {
        if (action === "confirm" && from === "/checkout") {
          router.push("/checkout");
        } else {
          router.push("/perfil");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errors[e.target.name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    }
  };

  const inputClass = "w-full px-4 py-3 border border-black bg-white text-black focus:outline-none focus:ring-0 focus:border-2";
  const errorClass = "text-xs text-red-600 mt-1";

  return (
    <div className="w-full max-w-md border border-black p-6 md:p-8">
      <h1 className="text-2xl md:text-3xl font-black text-center mb-8">CREAR CUENTA</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="mb-6 p-3 border border-red-600 bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Usuario</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={inputClass}
            required
          />
          {errors.username && <p className={errorClass}>{errors.username}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Nombre completo</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={inputClass}
            required
          />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">CI (Carné de identidad)</label>
          <input
            type="text"
            name="ci"
            value={formData.ci}
            onChange={handleChange}
            className={inputClass}
            required
          />
          {errors.ci && <p className={errorClass}>{errors.ci}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Teléfono</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={inputClass}
            required
          />
          {errors.phone && <p className={errorClass}>{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Dirección</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={inputClass}
            required
          />
          {errors.address && <p className={errorClass}>{errors.address}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Contraseña</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={inputClass}
            required
          />
          {errors.password && <p className={errorClass}>{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-black text-white font-medium hover:bg-white hover:text-black hover:border-2 hover:border-black transition-colors disabled:opacity-50"
        >
          {loading ? "Registrando..." : "REGISTRARSE"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => router.push("/login")}
          className="text-sm underline hover:opacity-70"
        >
          ¿Ya tienes cuenta? Iniciar sesión
        </button>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Suspense fallback={<div className="text-center">Cargando...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}