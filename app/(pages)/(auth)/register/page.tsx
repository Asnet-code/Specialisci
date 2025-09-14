// app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Role = "CLIENT" | "SPECIALIST";
type HoverSide = Role | null;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hoverSide, setHoverSide] = useState<HoverSide>(null);

  function chooseRole(r: Role) {
    setRole(r);
    setStep(2);
    setErr(null);
  }

  async function registerWithEmail(form: FormData) {
    setErr(null);
    setLoading(true);

    const name = (form.get("name") as string)?.trim();
    const surname = (form.get("surname") as string)?.trim();
    const email = (form.get("email") as string)?.trim();
    const password = (form.get("password") as string) || "";
    const password2 = (form.get("password2") as string) || "";

    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]+$/;

    if (!role) return stop("Wybierz rolę.");
    if (!name || name.length < 3)
      return stop("Imię musi zawierać co najmniej 3 znaki.");
    if (!nameRegex.test(name))
      return stop("Imię może zawierać tylko litery, spacje i myślnik.");
    if (!surname || surname.length < 2)
      return stop("Nazwisko musi zawierać co najmniej 2 znaki.");
    if (!nameRegex.test(surname))
      return stop("Nazwisko może zawierać tylko litery, spacje i myślnik.");
    if (!email) return stop("Podaj e-mail.");
    if (!acceptPrivacy)
      return stop(
        "Aby założyć konto, musisz zaakceptować politykę prywatności."
      );
    if (!password || password.length < 8)
      return stop("Hasło musi mieć co najmniej 8 znaków.");
    if (password !== password2) return stop("Hasła nie są takie same.");

    function stop(message: string) {
      setErr(message);
      setLoading(false);
      return;
    }

    try {
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
          passwordConfirmation: password2,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? "Nie udało się zarejestrować.");
        setLoading(false);
        return;
      }

      const login = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (login?.error) {
        setErr(
          "Konto utworzone, ale logowanie nie powiodło się. Zaloguj się ręcznie."
        );
        setLoading(false);
        return;
      }

      router.replace("/");
    } catch {
      setErr("Błąd sieci lub serwera.");
      setLoading(false);
    }
  }

  function googleSignUp() {
    if (!role) {
      setErr("Najpierw wybierz rolę.");
      return;
    }
    // Bezpośrednio na finalizację OAuth
    signIn("google", {
      callbackUrl: `/api/oauth/finalize?role=${role}`,
    });
  }

  const leftIsActive = hoverSide === "CLIENT";
  const rightIsActive = hoverSide === "SPECIALIST";
  const dimBlurClasses = "blur-[2px] brightness-75 opacity-70";
  const activeClasses = "blur-0 brightness-100 opacity-100";
  const neutralClasses = "blur-0 opacity-100";

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 to-neutral-900" />

      <div aria-hidden className="absolute inset-0 z-0 overflow-hidden">
        <div className="grid grid-cols-2 h-full">
          <div
            className={[
              "h-full bg-cover bg-center transition-all duration-300",
              hoverSide
                ? leftIsActive
                  ? activeClasses
                  : dimBlurClasses
                : neutralClasses,
            ].join(" ")}
            style={{ backgroundImage: "url('/images/sp.png')" }}
          />
          <div
            className={[
              "h-full bg-cover bg-center transition-all duration-300",
              hoverSide
                ? rightIsActive
                  ? activeClasses
                  : dimBlurClasses
                : neutralClasses,
            ].join(" ")}
            style={{ backgroundImage: "url('/images/specialista.png')" }}
          />
        </div>
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-2xl rounded-2xl shadow-lg p-6 md:p-8 backdrop-blur">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Załóż konto
        </h1>
        <p className="text-sm text-neutral-300 mt-1">
          Najpierw wybierz typ konta, potem wypełnij formularz.
        </p>

        {step === 1 && (
          <div className="relative mt-10">
            <div className="relative mx-auto w-full max-w-3xl border border-white/15 bg-neutral-900/70 backdrop-blur rounded-2xl shadow-lg">
              <div className="absolute left-1/2 -top-5 -translate-x-1/2">
                <div className="rounded-xl px-4 py-2 bg-white text-black text-sm font-semibold shadow">
                  Załóż konto
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 relative">
                <button
                  onMouseEnter={() => setHoverSide("CLIENT")}
                  onMouseLeave={() => setHoverSide(null)}
                  onFocus={() => setHoverSide("CLIENT")}
                  onBlur={() => setHoverSide(null)}
                  onClick={() => chooseRole("CLIENT")}
                  className="group p-6 md:p-8 text-left rounded-2xl md:rounded-none hover:bg-white/5 transition outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <div className="text-white text-lg font-medium">Klient</div>
                  <p className="mt-2 text-sm text-neutral-300">
                    Szukaj specjalistów, dodawaj ogłoszenia i kontaktuj się
                    bezpośrednio.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-xs text-neutral-300 group-hover:text-white">
                    <span className="h-2 w-2 rounded-full bg-white/40 group-hover:bg-white" />
                    Wybierz
                  </div>
                </button>

                <div
                  className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px bg-white/15"
                  aria-hidden
                />

                <button
                  onMouseEnter={() => setHoverSide("SPECIALIST")}
                  onMouseLeave={() => setHoverSide(null)}
                  onFocus={() => setHoverSide("SPECIALIST")}
                  onBlur={() => setHoverSide(null)}
                  onClick={() => chooseRole("SPECIALIST")}
                  className="group p-6 md:p-8 text-left rounded-2xl md:rounded-none hover:bg-white/5 transition outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <div className="text-white text-lg font-medium">
                    Specjalista
                  </div>
                  <p className="mt-2 text-sm text-neutral-300">
                    Publikuj swoje usługi, ustalaj obszar działania i zdobywaj
                    zlecenia.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-xs text-neutral-300 group-hover:text-white">
                    <span className="h-2 w-2 rounded-full bg-white/40 group-hover:bg-white" />
                    Wybierz
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && role && (
          <div className="mt-6">
            <div className="flex items-center gap-2 text-neutral-300 text-sm">
              <button
                onClick={() => setStep(1)}
                className="underline hover:text-white"
                type="button"
              >
                Zmień rolę
              </button>
              <span>•</span>
              <span>
                Wybrano:{" "}
                <strong className="text-white">
                  {role === "CLIENT" ? "Klient" : "Specjalista"}
                </strong>
              </span>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                registerWithEmail(new FormData(e.currentTarget));
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Imię" name="name" placeholder="Jan" required />
                <Field
                  label="Nazwisko"
                  name="surname"
                  placeholder="Kowalski"
                  required
                />
              </div>

              <Field
                label="E-mail"
                name="email"
                type="email"
                required
                placeholder="jan@example.com"
              />

              <PasswordField
                label="Hasło"
                name="password"
                required
                hint="Minimum 8 znaków."
              />
              <PasswordField
                label="Powtórz hasło"
                name="password2"
                required
                hint="Powtórz to samo hasło."
              />

              <label className="flex items-start gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  className="mt-1"
                  aria-describedby="privacy-desc"
                />
                <span id="privacy-desc" className="text-sm text-neutral-300">
                  Akceptuję{" "}
                  <a
                    href="/polityka-prywatnosci.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    politykę prywatności
                  </a>{" "}
                  oraz{" "}
                  <a
                    href="/regulamin.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    warunki korzystania z
                  </a>
                  .
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
              {/* 
              <div className="relative py-2 text-center text-neutral-400 text-sm select-none">
                <span className="px-2 bg-transparent">lub</span>
              </div>

              <button
                type="button"
                onClick={googleSignUp}
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 text-white py-2 hover:bg-white/10"
              >
                Kontynuuj z Google
              </button> */}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: number | string;
}) {
  const { label, name, type = "text", placeholder, required, min } = props;
  return (
    <div>
      <label className="block text-sm text-neutral-200">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        min={min as any}
        className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
        placeholder={placeholder}
      />
    </div>
  );
}

function PasswordField(props: {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
}) {
  const { label, name, required, hint } = props;
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="block text-sm text-neutral-200">{label}</label>
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          required={required}
          className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 pr-20 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder="••••••••"
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
          aria-pressed={show}
          aria-label={show ? "Ukryj hasło" : "Pokaż hasło"}
        >
          {show ? "Ukryj" : "Pokaż"}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
