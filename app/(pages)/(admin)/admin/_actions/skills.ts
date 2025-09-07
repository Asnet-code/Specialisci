"use server";

import prisma from "@/lib/prismadb";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../_lib/admin";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // usuń diakrytyki
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const createSkillSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

export async function createSkillAction(formData: FormData) {
  await requireAdmin();
  const parsed = createSkillSchema.parse({
    name: formData.get("name")?.toString(),
    slug: formData.get("slug")?.toString() || undefined,
    displayOrder: formData.get("displayOrder")?.toString() || "0",
    isActive: (formData.get("isActive")?.toString() ?? "true") === "true",
  });

  const slug = parsed.slug ?? slugify(parsed.name);

  await prisma.skill.create({
    data: {
      name: parsed.name,
      slug,
      displayOrder: parsed.displayOrder,
      isActive: parsed.isActive,
    },
  });

  revalidatePath("/admin/skills");
}

const toggleSchema = z.object({ id: z.string() });
export async function toggleSkillActiveAction(formData: FormData) {
  await requireAdmin();
  const { id } = toggleSchema.parse({ id: formData.get("id")?.toString() });

  const skill = await prisma.skill.findUnique({ where: { id }, select: { isActive: true } });
  if (!skill) throw new Error("Skill not found");

  await prisma.skill.update({ where: { id }, data: { isActive: !skill.isActive } });
  revalidatePath("/admin/skills");
}

const reorderSchema = z.object({ id: z.string(), displayOrder: z.coerce.number().int().min(0) });
export async function updateSkillOrderAction(formData: FormData) {
  await requireAdmin();
  const { id, displayOrder } = reorderSchema.parse({
    id: formData.get("id")?.toString(),
    displayOrder: formData.get("displayOrder")?.toString(),
  });

  await prisma.skill.update({ where: { id }, data: { displayOrder } });
  revalidatePath("/admin/skills");
}
