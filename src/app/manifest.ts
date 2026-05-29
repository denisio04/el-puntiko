import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EL PUNTIKO.",
    short_name: "EL PUNTIKO.",
    description: "Tienda online - Pago contra reembolso",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/logo-app.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/logo-app-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
