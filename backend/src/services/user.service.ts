import { User } from "@prisma/client";

import { prisma } from "../lib/prisma";

type SyncSupabaseUserInput = {
  supabaseId: string;
  email: string;
  name?: string | null;
};

export async function registerOrGetUser(email: string, name?: string): Promise<User> {
  return prisma.user.upsert({
    where: { email },
    update: {
      ...(name ? { name } : {})
    },
    create: {
      email,
      ...(name ? { name } : {})
    }
  });
}

export async function syncSupabaseUser(input: SyncSupabaseUserInput): Promise<User> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedName = input.name?.trim() || null;

  const existingById = await prisma.user.findUnique({ where: { id: input.supabaseId } });
  if (existingById) {
    return prisma.user.update({
      where: { id: existingById.id },
      data: {
        email: normalizedEmail,
        ...(normalizedName ? { name: normalizedName } : {})
      }
    });
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        ...(normalizedName ? { name: normalizedName } : {})
      }
    });
  }

  return prisma.user.create({
    data: {
      id: input.supabaseId,
      email: normalizedEmail,
      ...(normalizedName ? { name: normalizedName } : {})
    }
  });
}
