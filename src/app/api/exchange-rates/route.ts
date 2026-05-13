import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: "global" },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: "global",
        },
      });
    }

    const response = NextResponse.json({
      usdToCup: settings.usdToCupRate,
      zelleToCup: settings.zelleToCupRate,
    });

    response.headers.set("Cache-Control", "no-store, must-revalidate");

    return response;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return NextResponse.json(
      { error: "Error al obtener tasas de cambio" },
      { status: 500 }
    );
  }
}
