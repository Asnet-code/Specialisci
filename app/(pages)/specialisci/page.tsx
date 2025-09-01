"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SpecialistGatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="text-neutral-300">Ładowanie…</div>
      </div>
    );
  }

  const isSpecialist =
    session?.user && (session.user as any).role === "SPECIALIST";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 to-neutral-900">
      <div className="w-full max-w-lg rounded-2xl shadow-lg bg-white/5 border border-white/10 p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">
            Strefa specjalisty
          </h1>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 hover:bg-white/20"
          >
            Wyloguj
          </button>
        </div>

        {isSpecialist ? (
          <div className="mt-6 space-y-3">
            <p className="text-neutral-200">
              Masz dostęp do tej strony, ponieważ Twoja rola to{" "}
              <span className="font-semibold">SPECIALIST</span>.
            </p>
            {/* Tu wstawisz właściwą zawartość panelu specjalisty */}
            <div className="mt-4 rounded-xl bg-white/10 border border-white/10 p-4 text-neutral-100">
              <p>Tu może być panel, statystyki, ogłoszenia itd. ✨</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 px-3 py-2">
              Nie masz uprawnień do tej strony (wymagana rola: <b>SPECIALIST</b>
              ).
            </div>
            <button
              onClick={() => router.push("/")}
              className="rounded-xl bg-white text-black font-medium px-4 py-2 hover:bg-neutral-100"
            >
              Wróć na stronę główną
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
