"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const [contactPhone, setContactPhone] = useState("5355417265");

  useEffect(() => {
    fetch("/api/settings/contact")
      .then((r) => (r.ok ? r.json() : { phone: "5355417265" }))
      .then((data) => setContactPhone(data.phone))
      .catch(() => {});
  }, []);

  const whatsappMessage = encodeURIComponent(
    `Hola, mi pedido ${orderNumber ? `#${orderNumber}` : ""} fue confirmado. ¿Cuándo realizan la entrega?`
  );
  const cleanPhone = contactPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${whatsappMessage}&type=phone_number&app_absent=0`;

  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <div className="border border-black p-12">
        <div className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8" />
        </div>
        
        <h1 className="text-4xl font-black mb-6">PEDIDO CONFIRMADO</h1>
        
        <p className="text-xl mb-4">Gracias por tu compra</p>
        
        {orderNumber && (
          <p className="text-lg mb-8">Número de pedido: <span className="font-bold">{orderNumber}</span></p>
        )}
        
        <p className="text-lg mb-12">
          El pago se realiza en efectivo al recibir el producto. 
          Te contactaremos para coordinar la entrega.
        </p>
        
        <div className="space-y-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button size="lg" className="w-full">
              <MessageCircle className="w-5 h-5 mr-3" />
              CONTACTAR POR WHATSAPP
            </Button>
          </a>
          
          <Link href="/" className="block">
            <Button variant="outline" size="lg" className="w-full">
              VOLVER A EL PUNTIKO.
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutThanksPage() {
  return (
    <Suspense fallback={<div className="text-center py-24">Cargando...</div>}>
      <ThankYouContent />
    </Suspense>
  );
}