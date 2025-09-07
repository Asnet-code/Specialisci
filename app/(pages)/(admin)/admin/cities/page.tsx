import prisma from "@/lib/prismadb";
import { requireAdmin } from "../_lib/admin";
import { createCityAction, geocodeCityByNameAction, updateCityCoordsAction } from "../_actions/cities";

export default async function AdminCitiesPage({
  searchParams,
}: {
  searchParams: { q?: string; sort?: string; dir?: "asc" | "desc" };
}) {
  await requireAdmin();

  const q = (searchParams?.q ?? "").trim();
  const sort = (searchParams?.sort ?? "name") as "name" | "slug";
  const dir = (searchParams?.dir ?? "asc") as "asc" | "desc";

  const cities = await prisma.city.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { [sort]: dir },
    select: {
      id: true,
      name: true,
      slug: true,
      lat: true,
      lng: true,
    },
    take: 300,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Miasta / Lokalizacje</h2>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form className="flex items-center gap-2" action="/admin/cities" method="get">
          <input
            name="q"
            placeholder="Szukaj (nazwa/slug)"
            className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 placeholder-neutral-400"
          />
          <button className="rounded-xl bg-white text-black px-3 py-2">Szukaj</button>
        </form>

        <form action={createCityAction} className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <input name="name" placeholder="Nazwa miasta" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
          <input name="slug" placeholder="Slug (opcjonalnie)" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
          <input name="lat" placeholder="Szer. geogr. (opcjonalnie)" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
          <input name="lng" placeholder="Dł. geogr. (opcjonalnie)" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
          <div className="col-span-2 flex items-center">
            <span className="text-xs text-neutral-400">Puste lat/lng &rarr; auto-geokodowanie (OSM)</span>
          </div>
          <button className="rounded bg-white text-black px-3 py-1">Dodaj</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="px-3 py-2">#</th>
              <Th label="Nazwa" field="name" searchParams={searchParams} />
              <Th label="Slug" field="slug" searchParams={searchParams} />
              <th className="px-3 py-2">Lat</th>
              <th className="px-3 py-2">Lng</th>
              <th className="px-3 py-2">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((c, idx) => (
              <tr key={c.id} className="border-t border-white/10">
                <td className="px-3 py-2 text-neutral-400">{idx + 1}</td>
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2 text-neutral-300">{c.slug}</td>
                <td className="px-3 py-2">{c.lat?.toFixed(6)}</td>
                <td className="px-3 py-2">{c.lng?.toFixed(6)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <form action={updateCityCoordsAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      <input name="lat" defaultValue={c.lat ?? ""} placeholder="Lat" className="w-28 rounded bg-white/10 border border-white/10 px-2 py-1" />
                      <input name="lng" defaultValue={c.lng ?? ""} placeholder="Lng" className="w-28 rounded bg-white/10 border border-white/10 px-2 py-1" />
                      <button className="text-xs rounded bg-white/10 border border-white/10 px-2 py-1 hover:bg-white/20">Zapisz</button>
                    </form>
                    <form action={geocodeCityByNameAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-xs rounded bg-white/10 border border-white/10 px-2 py-1 hover:bg-white/20">Autogeocode</button>
                    </form>
                  </div>
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
