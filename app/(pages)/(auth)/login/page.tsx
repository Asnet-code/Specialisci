"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string)?.trim();
    const password = form.get("password") as string;

    if (!email || !password) {
      setErr("Podaj e-mail i hasło.");
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setErr("Zły e-mail lub hasło.");
      setLoading(false);
      return;
    }

    router.replace("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 to-neutral-900">
      <div className="w-full max-w-md rounded-2xl shadow-lg bg-white/5 border border-white/10 p-6 backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">Zaloguj się</h1>
        <p className="text-sm text-neutral-300 mt-1">
          Użyj e-maila i hasła lub zaloguj się przez Google.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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

          {err && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-white text-black font-medium py-2 hover:bg-neutral-100 disabled:opacity-60"
          >
            {loading ? "Logowanie..." : "Zaloguj się"}
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
            Nie masz konta?{" "}
            <a href="/register" className="underline">
              Zarejestruj się
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
