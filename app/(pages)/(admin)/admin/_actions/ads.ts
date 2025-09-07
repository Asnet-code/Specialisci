"use server";

import prisma from "@/lib/prismadb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "../_lib/admin";

const statusSchema = z.object({
  adType: z.enum(["client", "specialist"]),
  id: z.string(),
  status: z.enum(["ACTIVE", "CLOSED", "ARCHIVED"]),
});

export async function updateAdStatusAction(formData: FormData) {
  await requireAdmin();
  const data = statusSchema.parse({
    adType: formData.get("adType")?.toString(),
    id: formData.get("id")?.toString(),
    status: formData.get("status")?.toString(),
  });

  if (data.adType === "client") {
    await prisma.clientAd.update({ where: { id: data.id }, data: { status: data.status } });
    revalidatePath("/admin/client-ads");
  } else {
    await prisma.specialistAd.update({ where: { id: data.id }, data: { status: data.status } });
    revalidatePath("/admin/specialist-ads");
  }
}

const deleteSchema = z.object({
  adType: z.enum(["client", "specialist"]),
  id: z.string(),
});

export async function deleteAdAction(formData: FormData) {
  await requireAdmin();
  const data = deleteSchema.parse({
    adType: formData.get("adType")?.toString(),
    id: formData.get("id")?.toString(),
  });

  if (data.adType === "client") {
    await prisma.clientAd.delete({ where: { id: data.id } });
    revalidatePath("/admin/client-ads");
  } else {
    await prisma.specialistAd.delete({ where: { id: data.id } });
    revalidatePath("/admin/specialist-ads");
  }
}

const extendSchema = z.object({
  adType: z.enum(["client", "specialist"]),
  id: z.string(),
  days: z.coerce.number().min(1).max(180).default(30),
});

export async function extendAdExpiryAction(formData: FormData) {
  await requireAdmin();
  const data = extendSchema.parse({
    adType: formData.get("adType")?.toString(),
    id: formData.get("id")?.toString(),
    days: Number(formData.get("days")?.toString() ?? 30),
  });

  const newDate = new Date();
  newDate.setDate(newDate.getDate() + data.days);

  if (data.adType === "client") {
    await prisma.clientAd.update({ where: { id: data.id }, data: { expiresAt: newDate } });
    revalidatePath("/admin/client-ads");
  } else {
    await prisma.specialistAd.update({ where: { id: data.id }, data: { expiresAt: newDate } });
    revalidatePath("/admin/specialist-ads");
  }
}
