import prisma from "@/lib/prismadb";
import { requireAdmin } from "../_lib/admin";
import { deleteAdAction, extendAdExpiryAction, updateAdStatusAction } from "../_actions/ads";

export default async function AdminSpecialistAdsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    status?: "ACTIVE" | "CLOSED" | "ARCHIVED" | string;
    remote?: "true" | "false" | string;
    sort?: string;
    dir?: "asc" | "desc" | string;
    page?: string;
    pageSize?: string;
  };
}) {
  await requireAdmin();

  const q = (searchParams?.q ?? "").trim();
  const status = (searchParams?.status ?? "").trim();
  const remote = (searchParams?.remote ?? "").trim();
  const sort = (searchParams?.sort ?? "createdAt") as
    | "createdAt"
    | "expiresAt"
    | "status"
    | "salaryFrom"
    | "salaryTo";
  const dir = (searchParams?.dir ?? "desc") as "asc" | "desc";
  const page = Math.max(1, Number(searchParams?.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams?.pageSize ?? 20)));
  const skip = (page - 1) * pageSize;

  const where = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { status: status as any } : {}),
    ...(remote === "true" ? { isRemote: true } : remote === "false" ? { isRemote: false } : {}),
  } as any;

  const [items, total] = await Promise.all([
    prisma.specialistAd.findMany({
      where,
      orderBy: { [sort]: dir },
      include: {
        city: { select: { name: true } },
        specialization: { select: { name: true, category: true } },
        user: { select: { email: true } },
      },
      skip,
      take: pageSize,
    }),
    prisma.specialistAd.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Ogłoszenia specjalistów</h2>

      <Filters basePath="/admin/specialist-ads" searchParams={searchParams} />

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <Th label="Tytuł" />
              <Th label="Miasto" />
              <Th label="Wynagrodzenie" field="salaryFrom" searchParams={searchParams} />
              <Th label="Status" field="status" searchParams={searchParams} />
              <Th label="Utworzono" field="createdAt" searchParams={searchParams} />
              <Th label="Wygasa" field="expiresAt" searchParams={searchParams} />
              <th className="px-3 py-2">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {items.map((ad) => (
              <tr key={ad.id} className="border-t border-white/10">
                <td className="px-3 py-2">
                  <div className="font-medium">{ad.title}</div>
                  <div className="text-xs text-neutral-400 line-clamp-1">{ad.description}</div>
                  <div className="text-xs text-neutral-500">{ad.user?.email}</div>
                </td>
                <td className="px-3 py-2">{ad.city?.name ?? (ad.isRemote ? "Zdalnie" : "-")}</td>
                <td className="px-3 py-2">
                  {ad.salaryFrom ?? "-"}
                  {ad.salaryTo ? ` - ${ad.salaryTo}` : ""} zł
                </td>
                <td className="px-3 py-2">{ad.status}</td>
                <td className="px-3 py-2">{new Date(ad.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{ad.expiresAt ? new Date(ad.expiresAt).toLocaleString() : "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <form action={updateAdStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="adType" value="specialist" />
                      <input type="hidden" name="id" value={ad.id} />
                      <select name="status" defaultValue={ad.status} className="bg-white/10 border border-white/10 rounded px-2 py-1">
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="CLOSED">CLOSED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                      <button className="text-xs rounded bg-white/10 border border-white/10 px-2 py-1 hover:bg-white/20">Zmień</button>
                    </form>
                    <form action={extendAdExpiryAction} className="flex items-center gap-2">
                      <input type="hidden" name="adType" value="specialist" />
                      <input type="hidden" name="id" value={ad.id} />
                      <input name="days" type="number" min={1} max={180} defaultValue={30} className="w-20 rounded bg-white/10 border border-white/10 px-2 py-1" />
                      <button className="text-xs rounded bg-white/10 border border-white/10 px-2 py-1 hover:bg-white/20">Przedłuż</button>
                    </form>
                    <form action={deleteAdAction}>
                      <input type="hidden" name="adType" value="specialist" />
                      <input type="hidden" name="id" value={ad.id} />
                      <button className="text-xs rounded bg-red-500/20 border border-red-500/40 px-2 py-1 hover:bg-red-500/30">Usuń</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/specialist-ads" searchParams={searchParams} page={page} totalPages={totalPages} />
    </div>
  );
}

function Th({ label, field, searchParams }: { label: string; field?: string; searchParams?: { [k: string]: string | string[] | undefined } }) {
  if (!field) return <th className="px-3 py-2">{label}</th>;
  const currentSort = (searchParams?.sort as string) || undefined;
  const currentDir = (searchParams?.dir as string) || "asc";
  const nextDir = currentSort === field && currentDir === "asc" ? "desc" : "asc";
  const q = (searchParams?.q as string) || "";
  const status = (searchParams?.status as string) || "";
  const remote = (searchParams?.remote as string) || "";
  const href = `?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&remote=${encodeURIComponent(remote)}&sort=${field}&dir=${nextDir}`;
  return (
    <th className="px-3 py-2">
      <a href={href} className="hover:underline">{label}</a>
    </th>
  );
}

function Filters({ basePath, searchParams }: { basePath: string; searchParams: { [k: string]: string | string[] | undefined } }) {
  const q = (searchParams?.q as string) || "";
  const status = (searchParams?.status as string) || "";
  const remote = (searchParams?.remote as string) || "";
  const sort = (searchParams?.sort as string) || "createdAt";
  const dir = (searchParams?.dir as string) || "desc";
  return (
    <form action={basePath} method="get" className="grid grid-cols-2 md:grid-cols-6 gap-2">
      <input name="q" defaultValue={q} placeholder="Szukaj (tytuł/opis)" className="rounded bg-white/10 border border-white/10 px-2 py-1" />
      <select name="status" defaultValue={status} className="rounded bg-white/10 border border-white/10 px-2 py-1">
        <option value="">Status: Wszystkie</option>
        <option value="ACTIVE">Aktywne</option>
        <option value="CLOSED">Zamknięte</option>
        <option value="ARCHIVED">Zarchiwizowane</option>
      </select>
      <select name="remote" defaultValue={remote} className="rounded bg-white/10 border border-white/10 px-2 py-1">
        <option value="">Tryb: dowolny</option>
        <option value="true">Zdalne</option>
        <option value="false">Stacjonarne</option>
      </select>
      <select name="sort" defaultValue={sort} className="rounded bg-white/10 border border-white/10 px-2 py-1">
        <option value="createdAt">Sortuj: Utworzono</option>
        <option value="expiresAt">Sortuj: Wygasa</option>
        <option value="status">Sortuj: Status</option>
        <option value="salaryFrom">Sortuj: Wynagrodzenie od</option>
        <option value="salaryTo">Sortuj: Wynagrodzenie do</option>
      </select>
      <select name="dir" defaultValue={dir} className="rounded bg-white/10 border border-white/10 px-2 py-1">
        <option value="desc">DESC</option>
        <option value="asc">ASC</option>
      </select>
      <button className="rounded bg-white text-black px-3 py-1">Filtruj</button>
    </form>
  );
}

function Pagination({ basePath, searchParams, page, totalPages }: { basePath: string; searchParams: { [k: string]: string | string[] | undefined }; page: number; totalPages: number }) {
  const q = (searchParams?.q as string) || "";
  const status = (searchParams?.status as string) || "";
  const remote = (searchParams?.remote as string) || "";
  const sort = (searchParams?.sort as string) || "createdAt";
  const dir = (searchParams?.dir as string) || "desc";
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const prevHref = `${basePath}?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&remote=${encodeURIComponent(remote)}&sort=${sort}&dir=${dir}&page=${prev}`;
  const nextHref = `${basePath}?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&remote=${encodeURIComponent(remote)}&sort=${sort}&dir=${dir}&page=${next}`;
  return (
    <div className="flex items-center justify-between text-sm text-neutral-300">
      <div>
        Strona {page} z {totalPages}
      </div>
      <div className="flex gap-2">
        <a href={prevHref} className="rounded bg-white/10 border border-white/10 px-3 py-1 hover:bg-white/20">Poprzednia</a>
        <a href={nextHref} className="rounded bg-white/10 border border-white/10 px-3 py-1 hover:bg-white/20">Następna</a>
      </div>
    </div>
  );
}
