"use client";

import { Phone, MessageSquare, MessageCircle, ClipboardCopy, ArrowLeft } from "lucide-react";
import { useState } from "react";

interface ContactSubmenuProps {
  contactNumber: string | null;
  onBack: () => void;
}

export function ContactSubmenu({ contactNumber, onBack }: ContactSubmenuProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (index: number) => {
    if (!contactNumber) return;
    try {
      await navigator.clipboard.writeText(`+${contactNumber}`);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {}
  };

  if (!contactNumber) {
    return (
      <div className="flex flex-col">
        <div className="px-4 py-3 text-sm text-gray-400 italic">
          Contacto no disponible
        </div>
        <div className="border-t border-black">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm w-full text-left"
          >
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </button>
        </div>
      </div>
    );
  }

  const options: Array<{
    icon: React.ReactNode;
    label: string;
    href: string;
    target?: string;
    rel?: string;
  }> = [
    {
      icon: <Phone className="w-4 h-4" />,
      label: "Llamar",
      href: `tel:+${contactNumber}`,
    },
    {
      icon: <MessageSquare className="w-4 h-4" />,
      label: "Mensaje",
      href: `sms:+${contactNumber}`,
    },
    {
      icon: <MessageCircle className="w-4 h-4" />,
      label: "WhatsApp",
      href: `https://wa.me/${contactNumber}`,
      target: "_blank",
      rel: "noopener noreferrer",
    },
  ];

  return (
    <div className="flex flex-col">
      {options.map((option, i) => (
        <div key={i} className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm group">
          <a
            href={option.href}
            target={option.target}
            rel={option.rel}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            {option.icon}
            <span>{option.label}</span>
          </a>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleCopy(i);
            }}
            className="ml-auto p-1 hover:bg-gray-200 transition-colors relative"
            aria-label="Copiar número"
          >
            <ClipboardCopy className="w-3 h-3" />
            {copiedIndex === i && (
              <span className="absolute -top-6 right-0 text-[10px] bg-black text-white px-1 py-0.5 whitespace-nowrap">
                ¡Copiado!
              </span>
            )}
          </button>
        </div>
      ))}
      <div className="border-t border-black">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm w-full text-left"
        >
          <ArrowLeft className="w-4 h-4" />
          Atrás
        </button>
      </div>
    </div>
  );
}
