import prisma from "@/lib/prismadb";
import { requireAdmin } from "../_lib/admin";
import {
  createCertificationAction,
  toggleCertificationActiveAction,
  updateCertificationOrderAction,
} from "../_actions/certifications";

export default async function AdminCertificationsPage({
  searchParams,
}: {
  searchParams: { q?: string; sort?: string; dir?: "asc" | "desc" };
}) {
  await requireAdmin();

  const q = (searchParams?.q ?? "").trim();
  const sort = (searchParams?.sort ?? "displayOrder") as "displayOrder" | "name" | "isActive";
  const dir = (searchParams?.dir ?? "asc") as "asc" | "desc";

  const items = await prisma.certification.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { [sort]: dir },
    select: { id: true, name: true, slug: true, isActive: true, displayOrder: true },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Certyfikaty</h2>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form className="flex items-center gap-2" action="/admin/certifications" method="get">
          <input
            name="q"
            placeholder="Szukaj (nazwa/slug)"
            className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 placeholder-neutral-400"
          />
          <button className="rounded-xl bg-white text-black px-3 py-2">Szukaj</button>
        </form>

        <form action={createCertificationAction} className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <input name="name" placeholder="Nazwa" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
          <input name="slug" placeholder="Slug (opcjonalnie)" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
          <input name="displayOrder" type="number" min={0} defaultValue={0} className="rounded bg-white/10 border border-white/10 px-2 py-1" />
          <select name="isActive" defaultValue="true" className="rounded bg-white/10 border border-white/10 px-2 py-1">
            <option value="true">Aktywne</option>
            <option value="false">Nieaktywne</option>
          </select>
          <button className="rounded bg-white text-black px-3 py-1">Dodaj</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="px-3 py-2">#</th>
              <Th label="Nazwa" field="name" searchParams={searchParams} />
              <th className="px-3 py-2">Slug</th>
              <Th label="Kolejność" field="displayOrder" searchParams={searchParams} />
              <Th label="Aktywne" field="isActive" searchParams={searchParams} />
              <th className="px-3 py-2">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, idx) => (
              <tr key={s.id} className="border-t border-white/10">
                <td className="px-3 py-2 text-neutral-400">{idx + 1}</td>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2 text-neutral-300">{s.slug}</td>
                <td className="px-3 py-2">
                  <form action={updateCertificationOrderAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      name="displayOrder"
                      type="number"
                      defaultValue={s.displayOrder}
                      className="w-24 rounded bg-white/10 border border-white/10 px-2 py-1"
                    />
                    <button className="text-xs rounded bg-white/10 border border-white/10 px-2 py-1 hover:bg-white/20">
                      Zapisz
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <span className={s.isActive ? "text-green-400" : "text-red-400"}>
                    {s.isActive ? "TAK" : "NIE"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <form action={toggleCertificationActiveAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="text-xs rounded bg-white/10 border border-white/10 px-2 py-1 hover:bg-white/20">
                      Przełącz aktywność
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
