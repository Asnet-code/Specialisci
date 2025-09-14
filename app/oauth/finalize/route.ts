// app/api/oauth/finalize/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prismadb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  if (!role || !["CLIENT", "SPECIALIST"].includes(role)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      specialistProfile: { select: { id: true } },
      clientProfile: { select: { id: true } },
    },
  });

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: role as "CLIENT" | "SPECIALIST",
      status: "ACTIVE",
      emailVerified: new Date(),
      acceptedPrivacyPolicy: true,
      acceptedPrivacyAt: new Date(),
      ...(role === "SPECIALIST" && !user.specialistProfile
        ? { specialistProfile: { create: {} } }
        : {}),
      ...(role === "CLIENT" && !user.clientProfile
        ? { clientProfile: { create: {} } }
        : {}),
    },
  });

  return NextResponse.redirect(new URL("/", req.url));
}
