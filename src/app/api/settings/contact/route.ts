import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "global" },
    });

    if (settings?.contactPhone) {
      return NextResponse.json({ phone: settings.contactPhone });
    }

    if (settings?.contactStaffId) {
      const staffUser = await prisma.user.findUnique({
        where: { id: settings.contactStaffId },
        select: { phone: true },
      });
      if (staffUser?.phone) {
        return NextResponse.json({ phone: staffUser.phone });
      }
    }

    return NextResponse.json({ phone: "5355417265" });
  } catch (error) {
    console.error("Error fetching contact settings:", error);
    return NextResponse.json(
      { error: "Error al obtener número de contacto" },
      { status: 500 },
    );
  }
}
