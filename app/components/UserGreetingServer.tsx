import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  const map: Record<string, string> = {
    ADMIN: "bg-red-500/15 text-red-300 border-red-500/30",
    SPECIALIST: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    CLIENT: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };
  const cls =
    map[role] ?? "bg-neutral-500/15 text-neutral-300 border-neutral-500/30";
  return (
    <span className={`px-2 py-0.5 text-[11px] rounded border ${cls}`}>
      {role}
    </span>
  );
}

export default async function UserGreetingServer() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-600">
          Użytkownik niezalogowany
        </span>
        <Link
          href="/login"
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-sm text-white hover:bg-white/10"
        >
          Zaloguj się
        </Link>
      </div>
    );
  }

  const user = session.user as typeof session.user & {
    role?: "CLIENT" | "SPECIALIST" | "ADMIN";
    surname?: string | null;
  };

  const displayName =
    (user.name || "").trim() ||
    (user.surname || "").trim() ||
    user.email ||
    "Użytkownik";

  const email = user.email ?? "";

  const role = user.role;
  const avatar = user.image || "/images/default.png";

  return (
    <div className="flex items-center gap-3">
      <img
        src={avatar}
        alt={displayName}
        width={128}
        height={128}
        className="h-32 w-32 rounded-full ring-1 ring-slate/50 object-cover"
      />
      <div className="flex flex-col leading-tight">
        <span className="text-sm text-white">
          Cześć, <strong className="text-rose-500">{displayName}</strong>
        </span>
        <span className="text-xs text-rose-500">{email}</span>
        <div className="mt-0.5">
          <RoleBadge role={role} />
        </div>
      </div>
    </div>
  );
}
