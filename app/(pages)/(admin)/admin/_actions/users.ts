"use server";

import prisma from "@/lib/prismadb";
import { z } from "zod";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../_lib/admin";

const createUserSchema = z.object({
  name: z.string().trim().optional(),
  surname: z.string().trim().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CLIENT", "SPECIALIST", "ADMIN"]).default("CLIENT"),
});

export async function createUserAction(formData: FormData) {
  await requireAdmin();
  const data = createUserSchema.parse({
    name: formData.get("name")?.toString(),
    surname: formData.get("surname")?.toString(),
    email: formData.get("email")?.toString(),
    password: formData.get("password")?.toString(),
    role: formData.get("role")?.toString() as any,
  });

  const hash = await bcrypt.hash(data.password, 10);

  // Utwórz użytkownika
  await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      surname: data.surname,
      role: data.role,
      password: hash,
      emailVerified: new Date(),
      status: "ACTIVE",
      acceptedPrivacyPolicy: true,
      acceptedPrivacyAt: new Date(),
      ...(data.role === "SPECIALIST"
        ? { specialistProfile: { create: {} } }
        : { clientProfile: { create: {} } }),
    },
  });

  revalidatePath("/admin/users");
}

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["CLIENT", "SPECIALIST", "ADMIN"]),
});

export async function updateUserRoleAction(formData: FormData) {
  await requireAdmin();
  const data = updateRoleSchema.parse({
    userId: formData.get("userId")?.toString(),
    role: formData.get("role")?.toString(),
  });

  await prisma.user.update({
    where: { id: data.userId },
    data: { role: data.role },
  });

  revalidatePath("/admin/users");
}

const toggleSuspendSchema = z.object({ userId: z.string() });

export async function toggleUserSuspensionAction(formData: FormData) {
  await requireAdmin();
  const data = toggleSuspendSchema.parse({
    userId: formData.get("userId")?.toString(),
  });

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { status: true },
  });

  if (!user) throw new Error("User not found");

  const nextStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

  await prisma.user.update({
    where: { id: data.userId },
    data: { status: nextStatus },
  });

  revalidatePath("/admin/users");
}
