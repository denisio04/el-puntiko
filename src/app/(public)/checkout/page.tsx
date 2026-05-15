"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Send,
  Minus,
  Plus,
  Lock,
  User,
  MapPin,
  Phone,
  FileText,
  ArrowLeft,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useCartStore } from "@/stores/useCartStore";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { useSession } from "next-auth/react";
import { useCurrency } from "@/hooks/useCurrency";
import { convertPrice, formatConvertedPrice } from "@/lib/currency";

const WHATSAPP_NUMBER = "5356659558";

interface BonusProgress {
  hasReached: boolean;
  discountPercent: number;
  canUseBonus?: boolean;
  isActive?: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const getTotal = useCartStore((state) => state.getTotal);
  const referralCode = useReferralTracking();
  const { preferredCurrency, rates } = useCurrency();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [bonus, setBonus] = useState<BonusProgress | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch("/api/bonus/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (
          data &&
          data.isActive &&
          data.hasReached &&
          data.discountPercent > 0
        ) {
          setBonus(data);
        }
      })
      .catch((e) => console.error("Bonus fetch error:", e));
  }, []);

  const isLoggedIn = status === "authenticated";
  const user = session?.user as
    | {
        name?: string | null;
        phone?: string | null;
        address?: string | null;
        role?: string;
      }
    | undefined;
  const customerName = user?.name || "";
  const customerPhone = user?.phone || "";
  const customerAddress = user?.address || "";
  const isCustomer = user?.role === "CUSTOMER" || !user?.role;

  const subtotal = getTotal();
  const bonusItem = items.find((item) => item.isBonusProduct);
  const bonusItemPrice = bonusItem ? bonusItem.price * bonusItem.quantity : 0;
  const discountAmount =
    bonus && bonus.discountPercent > 0 && bonusItem
      ? bonusItemPrice * bonus.discountPercent
      : 0;
  const total = subtotal - discountAmount;
  const usedBonus = !!bonusItem && !!bonus && bonus.hasReached;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-black mb-6">Carrito vacío</h1>
        <p className="text-lg mb-8">
          Añade productos antes de proseguir al checkout.
        </p>
        <Button onClick={() => router.push("/")}>Ver productos</Button>
      </div>
    );
  }

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
    if (session?.user?.id) {
      fetch("/api/cart/reserve", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ productId: itemId }] }),
      }).catch(() => {});
    }
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const diff = newQty - item.quantity;
    updateQuantity(itemId, newQty);

    if (session?.user?.id && diff !== 0) {
      if (diff > 0) {
        fetch("/api/cart/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [{ productId: itemId, quantity: diff }] }),
        }).catch(() => {});
      } else {
        fetch("/api/cart/reserve", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [{ productId: itemId, quantity: Math.abs(diff) }] }),
        }).catch(() => {});
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const discountedItems = items.map((item) => ({
      ...item,
      price:
        bonus && bonus.hasReached && item.isBonusProduct
          ? item.price * (1 - bonus.discountPercent)
          : item.price,
    }));

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          usedBonus,
          items: items.map((item, idx) => ({
            id: item.id,
            name: item.name,
            price: discountedItems[idx].price,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            affiliateCode: item.affiliateCode || undefined,
          })),
          subtotal,
          total,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el pedido");
      }

      const orderNumber = data.orderNumber || `ORD-${Date.now()}`;

      let message = `*NUEVO PEDIDO*\n\n`;
      message += `*Cliente:* ${customerName}\n`;
      message += `*Teléfono:* ${customerPhone}\n`;
      message += `*Dirección:* ${customerAddress}\n\n`;
      message += `*Productos:*\n`;

      discountedItems.forEach((item, index) => {
        message += `${index + 1}. ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}\n`;
      });

      if (bonus && bonus.discountPercent > 0) {
        message += `\n*Subtotal:* $${subtotal.toFixed(2)}\n`;
        message += `*Descuento ${Math.round(bonus.discountPercent * 100)}:* -$${discountAmount.toFixed(2)}\n`;
      }
      message += `\n*Total:* $${total.toFixed(2)}\n`;

      if (notes) {
        message += `\n*Notas:* ${notes}\n`;
      }

      if (referralCode) {
        message += `\n*Referido:* ${referralCode}\n`;
      }

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");

      clearCart();
      router.push(`/checkout/gracias?order=${orderNumber}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al procesar el pedido",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-black hover:text-white border border-black"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-4xl font-black">CHECKOUT</h1>
      </div>

      {error && (
        <div className="mb-3 p-4 border border-red-600 bg-red-50 text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-black uppercase mb-3">
            Datos del pedido
          </h2>

          {!isLoggedIn ? (
            <div className="border-2 border-black p-6 text-center">
              <Lock className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-black mb-2">
                INICIA SESIÓN PARA CONTINUAR
              </h3>
              <p className="text-gray-600 mb-6">
                Para confirmar tu pedido necesitas iniciar sesión como cliente.
              </p>
              <Button
                onClick={() =>
                  router.push("/login?from=/checkout&action=confirm")
                }
              >
                INICIAR SESIÓN
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                ¿No tienes cuenta?{" "}
                <button
                  onClick={() =>
                    router.push("/registro?from=/checkout&action=confirm")
                  }
                  className="underline"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          ) : !isCustomer ? (
            <div className="border-2 border-black p-6 text-center">
              <h3 className="text-xl font-black mb-2">CUENTA NO AUTORIZADA</h3>
              <p className="text-gray-600">
                Tu cuenta no tiene permisos de cliente. Contacta al
                administrador.
              </p>
            </div>
          ) : (
            <form
              id="checkout-form"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="border border-black p-4 space-y-4">
                <h3 className="text-lg font-black uppercase border-b border-black pb-2">
                  Datos del cliente
                </h3>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">
                      {customerName || "No registrado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <p className="font-medium">
                      {customerPhone || "No registrado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Dirección</p>
                    <p className="font-medium">
                      {customerAddress || "No registrada"}
                    </p>
                  </div>
                </div>

                {(!customerName || !customerPhone || !customerAddress) && (
                  <div className="p-3 bg-yellow-50 border border-yellow-400 text-yellow-800 text-sm">
                    Completa tus datos en tu perfil para poder realizar pedidos.
                    <button
                      type="button"
                      onClick={() => router.push("/perfil")}
                      className="underline ml-1 font-medium"
                    >
                      Ir a mi perfil
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notas (opcional)
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguna instrucción especial para tu pedido..."
                  className="w-full px-4 py-3 border border-black bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-2 resize-none"
                />
              </div>

              {referralCode && (
                <p className="text-sm text-gray-600">
                  Referido: {referralCode}
                </p>
              )}

              {(!customerName || !customerPhone || !customerAddress) && (
                <p className="text-sm text-center text-gray-500">
                  Completa tus datos en tu perfil para poder confirmar el pedido
                </p>
              )}
            </form>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-black uppercase mb-3">Tu pedido</h2>
          <div className="border border-black">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-4 border-b border-black last:border-b-0"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-black uppercase">{item.name}</p>
                  <p className="text-sm">Cantidad: {item.quantity}</p>
                  {bonus && bonus.hasReached && item.isBonusProduct && (
                    <p className="text-xs text-green-600">
                      {formatConvertedPrice(
                        convertPrice(item.price * (1 - bonus.discountPercent), preferredCurrency, rates),
                        preferredCurrency
                      )}{" "}
                      c/u
                    </p>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <p className="text-lg">
                      {formatConvertedPrice(
                        convertPrice(
                          bonus && bonus.hasReached && item.isBonusProduct
                            ? item.price * (1 - bonus.discountPercent)
                            : item.price * item.quantity,
                          preferredCurrency,
                          rates
                        ),
                        preferredCurrency
                      )}
                    </p>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 hover:bg-black hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-0">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.isBonusProduct}
                      className={`p-1.5 border border-black ${item.isBonusProduct ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "hover:bg-black hover:text-white"}`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={item.isBonusProduct}
                      className={`p-1.5 border border-black ${item.isBonusProduct ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "hover:bg-black hover:text-white"}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-4 border-t border-black bg-black text-white">
              {usedBonus ? (
                <>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span>Subtotal</span>
                    <span className="line-through">
                      {formatConvertedPrice(
                        convertPrice(subtotal, preferredCurrency, rates),
                        preferredCurrency
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-green-400 mb-2">
                    <span>
                      Descuento {Math.round(bonus.discountPercent * 100)}%
                    </span>
                    <span>
                      -{formatConvertedPrice(
                        convertPrice(discountAmount, preferredCurrency, rates),
                        preferredCurrency
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-black uppercase">
                    <span>Total</span>
                    <span>
                      {formatConvertedPrice(
                        convertPrice(total, preferredCurrency, rates),
                        preferredCurrency
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-xl font-black uppercase">
                  <span>Total</span>
                  <span>
                    {formatConvertedPrice(
                      convertPrice(total, preferredCurrency, rates),
                      preferredCurrency
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            form="checkout-form"
            size="lg"
            className="w-full mt-6"
            disabled={
              loading || !customerName || !customerPhone || !customerAddress
            }
          >
            {loading ? (
              "Procesando..."
            ) : (
              <>
                <Send className="w-5 h-5 mr-3" />
                CONFIRMAR PEDIDO
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
