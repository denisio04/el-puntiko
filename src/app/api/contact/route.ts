import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "global" },
    });

    if (!settings) {
      return NextResponse.json({ contactNumber: null });
    }

    let contactNumber: string | null = null;

    if (settings.contactStaffId) {
      const staff = await prisma.user.findUnique({
        where: { id: settings.contactStaffId },
        select: { phone: true },
      });
      if (staff?.phone) {
        const clean = staff.phone.replace(/\D/g, "");
        contactNumber = clean.startsWith("53") ? clean : `53${clean}`;
      }
    }

    if (!contactNumber && settings.contactPhone) {
      const clean = settings.contactPhone.replace(/\D/g, "");
      contactNumber = clean.startsWith("53") ? clean : `53${clean}`;
    }

    return NextResponse.json({ contactNumber });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return NextResponse.json({ contactNumber: null });
  }
}