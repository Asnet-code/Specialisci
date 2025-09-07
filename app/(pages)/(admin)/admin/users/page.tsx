import prisma from "@/lib/prismadb";
import { requireAdmin } from "../_lib/admin";
import { createUserAction, toggleUserSuspensionAction, updateUserRoleAction } from "../_actions/users";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; sort?: string; dir?: "asc" | "desc" };
}) {
  await requireAdmin();

  const q = (searchParams?.q ?? "").trim();
  const sort = (searchParams?.sort ?? "createdAt") as
    | "createdAt"
    | "email"
    | "role"
    | "status";
  const dir = (searchParams?.dir ?? "desc") as "asc" | "desc";

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { surname: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { [sort]: dir },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      role: true,
      status: true,
      createdAt: true,
    },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Użytkownicy</h2>

      <SearchAndCreate />

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <Th label="E-mail" field="email" searchParams={searchParams} />
              <Th label="Imię i nazwisko" />
              <Th label="Rola" field="role" searchParams={searchParams} />
              <Th label="Status" field="status" searchParams={searchParams} />
              <Th label="Utworzono" field="createdAt" searchParams={searchParams} />
              <th className="px-3 py-2">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  {(u.name ?? "").trim()} {(u.surname ?? "").trim()}
                </td>
                <td className="px-3 py-2">
                  <form action={updateUserRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={u.role} className="bg-white/10 border border-white/10 rounded px-2 py-1">
                      <option value="CLIENT">CLIENT</option>
                      <option value="SPECIALIST">SPECIALIST</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button className="text-xs rounded bg-white/10 border border-white/10 px-2 py-1 hover:bg-white/20">
                      Zapisz
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">{u.status}</td>
                <td className="px-3 py-2">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <form action={toggleUserSuspensionAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="text-xs rounded bg-white/10 border border-white/10 px-2 py-1 hover:bg-white/20">
                      {u.status === "SUSPENDED" ? "Odbanuj" : "Banuj"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ label, field, searchParams }: { label: string; field?: string; searchParams?: { [k: string]: string | string[] | undefined } }) {
  if (!field) return <th className="px-3 py-2">{label}</th>;
  const currentSort = (searchParams?.sort as string) || undefined;
  const currentDir = (searchParams?.dir as string) || "asc";
  const nextDir = currentSort === field && currentDir === "asc" ? "desc" : "asc";
  const q = (searchParams?.q as string) || "";
  const href = `?q=${encodeURIComponent(q)}&sort=${field}&dir=${nextDir}`;
  return (
    <th className="px-3 py-2">
      <a href={href} className="hover:underline">{label}</a>
    </th>
  );
}

function SearchAndCreate() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <form className="flex items-center gap-2" action="/admin/users" method="get">
        <input
          name="q"
          placeholder="Szukaj (email, imię, nazwisko)"
          className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 placeholder-neutral-400"
        />
        <button className="rounded-xl bg-white text-black px-3 py-2">Szukaj</button>
      </form>

      <form action={createUserAction} className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <input name="name" placeholder="Imię" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
        <input name="surname" placeholder="Nazwisko" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
        <input name="email" type="email" placeholder="E-mail" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
        <input name="password" type="password" placeholder="Hasło" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
        <select name="role" className="rounded bg-white/10 border border-white/10 px-2 py-1">
          <option value="CLIENT">CLIENT</option>
          <option value="SPECIALIST">SPECIALIST</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button className="rounded bg-white text-black px-3 py-1">Dodaj</button>
      </form>
    </div>
  );
}
