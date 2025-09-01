"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Role = "CLIENT" | "SPECIALIST";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("CLIENT");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string)?.trim();
    const surname = (form.get("surname") as string)?.trim();
    const email = (form.get("email") as string)?.trim();
    const password = form.get("password") as string;

    if (!email || !password) {
      setErr("Podaj e-mail i hasło.");
      setLoading(false);
      return;
    }
    if (!acceptPrivacy) {
      setErr("Aby założyć konto, musisz zaakceptować politykę prywatności.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setErr("Hasło musi mieć co najmniej 6 znaków.");
      setLoading(false);
      return;
    }

    try {
      // 1) Rejestracja
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          surname,
          email,
          password,
          role,
          acceptPrivacyPolicy: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? "Nie udało się zarejestrować.");
        setLoading(false);
        return;
      }

      // 2) Auto-login (credentials)
      const login = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (login?.error) {
        // konto utworzone, ale logowanie nie przeszło (edge-case)
        setErr(
          "Konto utworzone, ale logowanie nie powiodło się. Zaloguj się ręcznie."
        );
        setLoading(false);
        return;
      }

      // 3) Redirect po zalogowaniu
      router.replace("/");
    } catch {
      setErr("Błąd sieci lub serwera.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 to-neutral-900">
      <div className="w-full max-w-md rounded-2xl shadow-lg bg-white/5 border border-white/10 p-6 backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">Załóż konto</h1>
        <p className="text-sm text-neutral-300 mt-1">
          Wybierz rolę i wypełnij dane, aby rozpocząć.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-200">Imię</label>
              <input
                name="name"
                className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="Jan"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-200">Nazwisko</label>
              <input
                name="surname"
                className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="Kowalski"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-200">E-mail</label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="jan@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-200">Hasło</label>
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="••••••••"
            />
          </div>

          {/* Wybór roli */}
          <fieldset className="mt-2">
            <legend className="text-sm text-neutral-200">Rola konta</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("CLIENT")}
                className={`rounded-xl px-3 py-2 border ${
                  role === "CLIENT"
                    ? "bg-white text-black border-white"
                    : "bg-white/10 text-white border-white/10"
                }`}
              >
                Klient
              </button>
              <button
                type="button"
                onClick={() => setRole("SPECIALIST")}
                className={`rounded-xl px-3 py-2 border ${
                  role === "SPECIALIST"
                    ? "bg-white text-black border-white"
                    : "bg-white/10 text-white border-white/10"
                }`}
              >
                Specjalista
              </button>
            </div>
            <input type="hidden" name="role" value={role} />
          </fieldset>

          {/* Polityka prywatności */}
          <label className="flex items-start gap-2 mt-2">
            <input
              type="checkbox"
              checked={acceptPrivacy}
              onChange={(e) => setAcceptPrivacy(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-neutral-300">
              Akceptuję politykę prywatności
            </span>
          </label>

          {err && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-white text-black font-medium py-2 hover:bg-neutral-100 disabled:opacity-60"
          >
            {loading ? "Tworzenie konta..." : "Zarejestruj się"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 text-white py-2 hover:bg-white/10"
            >
              Kontynuuj z Google
            </button>
          </div>

          <p className="text-center text-sm text-neutral-400 pt-2">
            Masz już konto?{" "}
            <a href="/login" className="underline">
              Zaloguj się
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
