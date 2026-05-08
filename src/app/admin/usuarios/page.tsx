"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, X } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { getAdminUsers, createUser, updateUser, deleteUser } from "../actions";

type ModalMode = "create" | "edit" | null;

const getRoleLabel = (role: string) => {
  switch (role) {
    case "ADMIN": return "Admin";
    case "AFFILIATE": return "Afiliado";
    case "SUPPLIER": return "Proveedor";
    case "DELIVERY": return "Repartidor";
    case "STAFF": return "Staff";
    case "CUSTOMER": return "Cliente";
    default: return role;
  }
};

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case "ADMIN": return "bg-black text-white";
    case "SUPPLIER": return "bg-blue-600 text-white";
    case "DELIVERY": return "bg-green-600 text-white";
    case "STAFF": return "bg-purple-600 text-white";
    case "AFFILIATE": return "bg-yellow-600 text-white";
    default: return "bg-gray-200 text-black";
  }
};

export default function UsuariosPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [users, setUsers] = useState<Array<{ id: string; username: string | null; name: string | null; phone: string | null; ci: string | null; role: string; wallet: number; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("");
  
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    phone: "",
    ci: "",
    role: "AFFILIATE",
    wallet: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/admin/usuarios");
    }
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    getAdminUsers()
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .finally(() => setLoading(false));
  }, [mounted, isAuthenticated]);

  if (!mounted || !isAuthenticated) {
    return null;
  }

  const filteredUsers = roleFilter
    ? users.filter((u) => u.role === roleFilter)
    : users;

  const openCreateModal = () => {
    setFormData({ username: "", password: "", name: "", phone: "", ci: "", role: "AFFILIATE", wallet: 0 });
    setModalMode("create");
  };

  const openEditModal = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setFormData({
        username: user.username || "",
        password: "",
        name: user.name || "",
        phone: user.phone || "",
        ci: user.ci || "",
        role: user.role,
        wallet: user.wallet,
      });
      setEditingUserId(userId);
      setModalMode("edit");
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUserId(null);
    setFormError(null);
    setFormData({ username: "", password: "", name: "", phone: "", ci: "", role: "AFFILIATE", wallet: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (modalMode === "create") {
      const result = await createUser(
        formData.username,
        formData.password,
        formData.name || formData.username,
        formData.role,
        formData.wallet,
        formData.phone,
        formData.ci
      );
      if (result.error) {
        setFormError(result.error);
        return;
      }
      const data = await getAdminUsers();
      if (data.users) setUsers(data.users);
    } else if (modalMode === "edit" && editingUserId) {
      const updates: { name?: string; role?: string; wallet?: number; password?: string; phone?: string; ci?: string } = {
        role: formData.role,
        wallet: formData.wallet,
        name: formData.name,
        phone: formData.phone,
        ci: formData.ci,
      };
      if (formData.password) {
        updates.password = formData.password;
      }
      const result = await updateUser(editingUserId, formData.name, formData.role, formData.wallet, formData.password || null, formData.phone, formData.ci);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      const data = await getAdminUsers();
      if (data.users) setUsers(data.users);
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (deletingUserId) {
      await deleteUser(deletingUserId);
      const data = await getAdminUsers();
      if (data.users) setUsers(data.users);
      setDeletingUserId(null);
    }
  };

  const confirmDelete = (userId: string) => {
    setDeletingUserId(userId);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="border-b border-black pb-4 mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 hover:bg-black hover:text-white px-2 py-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <h1 className="text-4xl font-black">GESTIÓN DE USUARIOS</h1>
      </div>

      {/* Filtro por rol */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setRoleFilter("")}
          className={`px-3 py-1 border border-black ${
            roleFilter === "" ? "bg-black text-white" : "hover:bg-gray-100"
          }`}
        >
          Todos
        </button>
        {["ADMIN", "AFFILIATE", "SUPPLIER", "DELIVERY", "STAFF", "CUSTOMER"].map((rol) => (
          <button
            key={rol}
            onClick={() => setRoleFilter(rol)}
            className={`px-3 py-1 border border-black ${
              roleFilter === rol ? "bg-black text-white" : "hover:bg-gray-100"
            }`}
          >
            {getRoleLabel(rol)}
          </button>
        ))}
      </div>

      {/* Tabla para PC */}
      <div className="hidden md:block border border-black">
        <div className="grid grid-cols-10 bg-black text-white font-bold p-4">
          <div className="col-span-2">Usuario</div>
          <div className="col-span-2 text-center">Rol</div>
          <div className="col-span-2 text-center">Cartera</div>
          <div className="col-span-2 text-center">Creado</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {loading ? (
          <div className="p-4 text-center">Cargando...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-center">No hay usuarios</div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-10 p-4 border-b border-black items-center hover:bg-gray-50"
            >
              <div className="col-span-2 font-medium">{user.username}</div>
              <div className="col-span-2 text-center">
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium ${getRoleBadgeClass(user.role)}`}
                >
                  {getRoleLabel(user.role)}
                </span>
              </div>
              <div className="col-span-2 text-center">${user.wallet.toFixed(2)}</div>
              <div className="col-span-2 text-center text-sm text-gray-600">
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  onClick={() => openEditModal(user.id)}
                  className="p-2 hover:bg-black hover:text-white border border-black"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => confirmDelete(user.id)}
                  className="p-2 hover:bg-black hover:text-white border border-black"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tarjetas para móvil */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="p-4 text-center">Cargando...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-center">No hay usuarios</div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="border border-black p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium text-lg">{user.username}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(user.id)}
                    className="p-2 hover:bg-black hover:text-white border border-black"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => confirmDelete(user.id)}
                    className="p-2 hover:bg-black hover:text-white border border-black"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium ${getRoleBadgeClass(user.role)}`}
                >
                  {getRoleLabel(user.role)}
                </span>
                <span className="font-medium">${user.wallet.toFixed(2)}</span>
              </div>
              <div className="mt-2 text-xs text-gray-500 text-right">
                Creado: {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white font-medium hover:bg-white hover:text-black hover:border-2 hover:border-black transition-colors"
        >
          <Plus className="w-5 h-5" />
          CREAR USUARIO
        </button>
      </div>

      {modalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-md h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-black sticky top-0 bg-white">
              <h2 className="text-xl font-black">
                {modalMode === "create" ? "NUEVO USUARIO" : "EDITAR USUARIO"}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-black hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 border border-red-600 bg-red-50 text-red-600 text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Usuario</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 border border-black focus:outline-none focus:ring-0 focus:border-2"
                  required
                  disabled={modalMode === "edit"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nombre Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-black focus:outline-none focus:ring-0 focus:border-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Carnet de Identidad</label>
                <input
                  type="text"
                  value={formData.ci}
                  onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                  className="w-full px-4 py-3 border border-black focus:outline-none focus:ring-0 focus:border-2"
                  placeholder="Ej: 89020305023"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-black focus:outline-none focus:ring-0 focus:border-2"
                  placeholder="Ej: +53 5 1234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Contraseña {modalMode === "edit" && "(dejar vacío para mantener)"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-black focus:outline-none focus:ring-0 focus:border-2"
                  required={modalMode === "create"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-black focus:outline-none focus:ring-0 focus:border-2 bg-white"
                >
                  <option value="AFFILIATE">Afiliado</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPPLIER">Proveedor</option>
                  <option value="DELIVERY">Repartidor</option>
                  <option value="STAFF">Staff</option>
                  <option value="CUSTOMER">Cliente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cartera ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.wallet}
                  onChange={(e) => setFormData({ ...formData, wallet: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-black focus:outline-none focus:ring-0 focus:border-2"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 border-2 border-black font-medium hover:bg-black hover:text-white transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-black text-white font-medium hover:bg-white hover:text-black hover:border-2 hover:border-black transition-colors"
                >
                  CONFIRMAR
                </button>
              </div>
            </form>
          </div>
</div>
      )}

      {deletingUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-black">
              <h2 className="text-xl font-black">ELIMINAR USUARIO</h2>
              <button onClick={() => setDeletingUserId(null)} className="p-1 hover:bg-black hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-6">¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeletingUserId(null)}
                  className="flex-1 py-3 border-2 border-black font-medium hover:bg-black hover:text-white transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-black text-white font-medium hover:bg-white hover:text-black hover:border-2 hover:border-black transition-colors"
                >
                  ELIMINAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}