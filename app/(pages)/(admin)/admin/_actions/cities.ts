"use server";

import prisma from "@/lib/prismadb";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../_lib/admin";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function geocodeCity(name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${name}, Polska`);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "pl");
    url.searchParams.set("countrycodes", "pl");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "SpecialisciApp/1.0 (admin geocoding)",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data || !data.length) return null;
    const { lat, lon } = data[0];
    const latNum = Number(lat);
    const lngNum = Number(lon);
    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) return { lat: latNum, lng: lngNum };
    return null;
  } catch (e) {
    return null;
  }
}

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  lat: z.union([z.string(), z.number()]).optional(),
  lng: z.union([z.string(), z.number()]).optional(),
});

export async function createCityAction(formData: FormData) {
  await requireAdmin();
  const parsed = createSchema.parse({
    name: formData.get("name")?.toString(),
    slug: formData.get("slug")?.toString() || undefined,
    lat: formData.get("lat")?.toString() || undefined,
    lng: formData.get("lng")?.toString() || undefined,
  });

  const slug = parsed.slug ?? slugify(parsed.name);

  let latNum: number | null = parsed.lat != null ? Number(parsed.lat) : null;
  let lngNum: number | null = parsed.lng != null ? Number(parsed.lng) : null;

  if (!(Number.isFinite(latNum as number) && Number.isFinite(lngNum as number))) {
    const geo = await geocodeCity(parsed.name);
    if (!geo) throw new Error("Nie udało się pobrać współrzędnych dla podanego miasta.");
    latNum = geo.lat;
    lngNum = geo.lng;
  }

  await prisma.city.create({
    data: {
      name: parsed.name,
      slug,
      lat: latNum as number,
      lng: lngNum as number,
    },
  });

  revalidatePath("/admin/cities");
}

const updateCoordsSchema = z.object({ id: z.string(), lat: z.coerce.number(), lng: z.coerce.number() });
export async function updateCityCoordsAction(formData: FormData) {
  await requireAdmin();
  const { id, lat, lng } = updateCoordsSchema.parse({
    id: formData.get("id")?.toString(),
    lat: formData.get("lat")?.toString(),
    lng: formData.get("lng")?.toString(),
  });

  await prisma.city.update({ where: { id }, data: { lat, lng } });
  revalidatePath("/admin/cities");
}

const geocodeSchema = z.object({ id: z.string() });
export async function geocodeCityByNameAction(formData: FormData) {
  await requireAdmin();
  const { id } = geocodeSchema.parse({ id: formData.get("id")?.toString() });

  const city = await prisma.city.findUnique({ where: { id }, select: { name: true } });
  if (!city) throw new Error("City not found");

  const geo = await geocodeCity(city.name);
  if (!geo) throw new Error("Nie udało się pobrać współrzędnych.");

  await prisma.city.update({ where: { id }, data: { lat: geo.lat, lng: geo.lng } });
  revalidatePath("/admin/cities");
}
