import bcrypt from "bcrypt";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      surname,
      email,
      password,
      passwordConfirmation,
      role,
      acceptPrivacyPolicy,
    } = body || {};

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

    if (acceptPrivacyPolicy !== true) {
      return NextResponse.json(
        { error: "Musisz zaakceptować politykę prywatności" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return NextResponse.json(
        { error: "Imię musi zawierać co najmniej 3 znaki" },
        { status: 400 }
      );
    }
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { error: "Imię może zawierać tylko litery, spacje i myślnik" },
        { status: 400 }
      );
    }

    if (!surname || typeof surname !== "string" || surname.trim().length < 2) {
      return NextResponse.json(
        { error: "Nazwisko musi zawierać co najmniej 2 znaki" },
        { status: 400 }
      );
    }
    if (!nameRegex.test(surname)) {
      return NextResponse.json(
        { error: "Nazwisko może zawierać tylko litery, spacje i myślnik" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Hasło musi mieć co najmniej 8 znaków" },
        { status: 400 }
      );
    }
    if (password !== passwordConfirmation) {
      return NextResponse.json(
        { error: "Hasła nie są takie same" },
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
        name: name.trim(),
        surname: surname.trim(),
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
      select: { id: true, email: true, role: true, status: true },
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
