import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prismadb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Brak/niepoprawne JSON body." },
      { status: 400 }
    );
  }

  const { role } = body;

  if (!["CLIENT", "SPECIALIST"].includes(role)) {
    return NextResponse.json({ error: "Nieprawidłowa rola." }, { status: 400 });
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
    return NextResponse.json(
      { error: "Użytkownik nie istnieje." },
      { status: 404 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role,
      status: "ACTIVE",
      emailVerified: new Date(),
      // Auto-akceptacja polityki prywatności dla OAuth (nie ma dodatkowego kroku)
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

  return NextResponse.json({ ok: true });
}
