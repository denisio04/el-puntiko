export function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

export function generateWhatsAppLink(
  phone: string,
  message?: string
): string {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const base = `https://wa.me/${cleanPhone}`;
  if (message) {
    const encoded = encodeURIComponent(message);
    return `${base}?text=${encoded}`;
  }
  return base;
}

interface OrderData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}

export function generateOrderMessage(order: OrderData): string {
  const itemsList = order.items
    .map((item) => `${item.quantity}x ${item.name} - $${item.price}`)
    .join("\n");

  return `🛒 Nuevo Pedido #${order.orderNumber}

👤 Cliente: ${order.customerName}
📱 Teléfono: ${order.customerPhone}
📍 Dirección: ${order.customerAddress}

${itemsList}

💰 Total: $${order.total}

Pago: Contra reembolso`;
}