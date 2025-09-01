import bcrypt from "bcrypt";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, surname, email, password, role, acceptPrivacyPolicy } =
      body || {};

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Brak wymaganych pól: email, password, role" },
        { status: 400 }
      );
    }

    if (!["CLIENT", "SPECIALIST"].includes(role)) {
      return NextResponse.json(
        { error: "Nieprawidłowa rola. Dozwolone: CLIENT, SPECIALIST" },
        { status: 400 }
      );
    }

    if (
      typeof acceptPrivacyPolicy !== "boolean" ||
      acceptPrivacyPolicy !== true
    ) {
      return NextResponse.json(
        { error: "Musisz zaakceptować politykę prywatności" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Hasło musi mieć co najmniej 6 znaków" },
        { status: 400 }
      );
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "E-mail jest już zajęty" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name ?? null,
        surname: surname ?? null,
        email,
        role,
        status: "PENDING_EMAIL_VERIFY",
        password: hashed,
        acceptedPrivacyPolicy: true,
        acceptedPrivacyAt: new Date(),
        ...(role === "SPECIALIST"
          ? { specialistProfile: { create: {} } }
          : { clientProfile: { create: {} } }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err) {
    console.error("[REGISTER_POST]", err);
    return NextResponse.json(
      { error: "Błąd serwera podczas rejestracji" },
      { status: 500 }
    );
  }
}
