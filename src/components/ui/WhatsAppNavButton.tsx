"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface ContactResponse {
  contactNumber: string | null;
}

export function WhatsAppNavButton() {
  const [contactNumber, setContactNumber] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/contact")
      .then((res) => res.json())
      .then((data: ContactResponse) => setContactNumber(data.contactNumber))
      .catch(() => setContactNumber(null));
  }, []);

  if (!contactNumber) return null;

  return (
    <a
      href={`https://wa.me/${contactNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="p-2 hover:bg-black hover:text-white transition-colors"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="w-5 md:w-6 h-5 md:h-6" />
    </a>
  );
}