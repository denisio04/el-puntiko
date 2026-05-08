"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EditProfileModal } from "@/components/profile/EditProfileModal";

interface ProfileData {
  id: string;
  username: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  ci: string | null;
  role: string;
  createdAt: string;
}

export default function PerfilCuentaPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profileRes = await fetch("/api/profile");

      if (profileRes.status === 401) {
        router.push("/login");
        return;
      }

      if (!profileRes.ok) {
        throw new Error("Error al cargar datos");
      }

      const profileData = await profileRes.json();
      setProfile(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data: Partial<ProfileData>) => {
    setIsSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Error al guardar");
    }

    const updated = await res.json();
    setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="border-2 border-black p-8 text-center">
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="border-2 border-red-600 p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="border-2 border-black px-6 py-2 hover:bg-black hover:text-white"
            >
              Ir a Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="border-2 border-black p-8 text-center">
            <p>No se encontraron datos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-8">
          MIS DATOS
        </h1>

        <div className="border-2 border-black p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black">INFORMACIÓN</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="border-2 border-black px-4 py-2 text-sm hover:bg-black hover:text-white"
            >
              Editar
            </button>
          </div>

          <div className="space-y-3">
            <div className="border-b border-gray-200 pb-2">
              <p className="text-sm text-gray-500">Nombre</p>
              <p className="font-medium">{profile.name || "No establecido"}</p>
            </div>
            <div className="border-b border-gray-200 pb-2">
              <p className="text-sm text-gray-500">Usuario</p>
              <p className="font-medium">@{profile.username}</p>
            </div>
            <div className="border-b border-gray-200 pb-2">
              <p className="text-sm text-gray-500">Teléfono</p>
              <p className="font-medium">{profile.phone || "No establecido"}</p>
            </div>
            <div className="border-b border-gray-200 pb-2">
              <p className="text-sm text-gray-500">Dirección</p>
              <p className="font-medium">{profile.address || "No establecida"}</p>
            </div>
            <div className="border-b border-gray-200 pb-2">
              <p className="text-sm text-gray-500">CI</p>
              <p className="font-medium">{profile.ci || "No establecido"}</p>
            </div>
            <div className="pt-2">
              <p className="text-sm text-gray-500">Cliente desde</p>
              <p className="font-medium">{formatDate(profile.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={profile}
      />
    </div>
  );
}