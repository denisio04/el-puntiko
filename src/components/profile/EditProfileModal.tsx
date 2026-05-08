"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

interface ProfileData {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  ci?: string | null;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileData) => Promise<void>;
  initialData: ProfileData;
}

export function EditProfileModal({ isOpen, onClose, onSave, initialData }: EditProfileModalProps) {
  const [formData, setFormData] = useState<ProfileData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Perfil" size="md">
      <div className="flex flex-col gap-4 p-4">
        {error && (
          <div className="p-3 border-2 border-red-600 bg-red-100 text-red-800">
            {error}
          </div>
        )}

        <Input
          label="Nombre"
          name="name"
          value={formData.name || ""}
          onChange={handleChange}
          placeholder="Tu nombre completo"
        />

        <Input
          label="Teléfono"
          name="phone"
          type="tel"
          value={formData.phone || ""}
          onChange={handleChange}
          placeholder="ej: 51234567"
        />

        <div className="w-full">
          <label htmlFor="address" className="block text-sm font-medium mb-2">
            Dirección
          </label>
          <textarea
            id="address"
            name="address"
            value={formData.address || ""}
            onChange={handleChange}
            placeholder="Tu dirección de entrega"
            className="w-full px-4 py-3 border border-black bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-2"
            rows={3}
          />
        </div>

        <Input
          label="CI (Carné de Identidad)"
          name="ci"
          value={formData.ci || ""}
          onChange={handleChange}
          placeholder="ej: 12345678901"
        />

        <div className="flex gap-4 mt-4">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 border-2 border-black bg-black text-white px-6 py-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 border-2 border-black bg-white px-6 py-2 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}