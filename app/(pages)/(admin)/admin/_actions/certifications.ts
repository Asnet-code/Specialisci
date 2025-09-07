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

const createCertificationSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

export async function createCertificationAction(formData: FormData) {
  await requireAdmin();
  const parsed = createCertificationSchema.parse({
    name: formData.get("name")?.toString(),
    slug: formData.get("slug")?.toString() || undefined,
    displayOrder: formData.get("displayOrder")?.toString() || "0",
    isActive: (formData.get("isActive")?.toString() ?? "true") === "true",
  });

  const slug = parsed.slug ?? slugify(parsed.name);

  await prisma.certification.create({
    data: {
      name: parsed.name,
      slug,
      displayOrder: parsed.displayOrder,
      isActive: parsed.isActive,
    },
  });

  revalidatePath("/admin/certifications");
}

const toggleSchema = z.object({ id: z.string() });
export async function toggleCertificationActiveAction(formData: FormData) {
  await requireAdmin();
  const { id } = toggleSchema.parse({ id: formData.get("id")?.toString() });

  const cert = await prisma.certification.findUnique({ where: { id }, select: { isActive: true } });
  if (!cert) throw new Error("Certification not found");

  await prisma.certification.update({ where: { id }, data: { isActive: !cert.isActive } });
  revalidatePath("/admin/certifications");
}

const reorderSchema = z.object({ id: z.string(), displayOrder: z.coerce.number().int().min(0) });
export async function updateCertificationOrderAction(formData: FormData) {
  await requireAdmin();
  const { id, displayOrder } = reorderSchema.parse({
    id: formData.get("id")?.toString(),
    displayOrder: formData.get("displayOrder")?.toString(),
  });

  await prisma.certification.update({ where: { id }, data: { displayOrder } });
  revalidatePath("/admin/certifications");
}
