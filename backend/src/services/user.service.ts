import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/drizzle/schema";

type SyncSupabaseUserInput = {
  supabaseId: string;
  email: string;
  name?: string | null;
};

export async function registerOrGetUser(email: string, name?: string) {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase())
  });

  if (existingUser) {
    if (name) {
      const result = await db
        .update(users)
        .set({ name })
        .where(eq(users.id, existingUser.id))
        .returning();
      return result[0];
    }
    return existingUser;
  }

  const result = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      name: name || null
    })
    .returning();
  return result[0];
}

export async function syncSupabaseUser(input: SyncSupabaseUserInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedName = input.name?.trim() || null;

  const existingById = await db.query.users.findFirst({
    where: eq(users.id, input.supabaseId)
  });

  if (existingById) {
    const result = await db
      .update(users)
      .set({
        email: normalizedEmail,
        ...(normalizedName ? { name: normalizedName } : {})
      })
      .where(eq(users.id, existingById.id))
      .returning();
    return result[0];
  }

  const existingByEmail = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail)
  });

  if (existingByEmail) {
    const result = await db
      .update(users)
      .set({
        ...(normalizedName ? { name: normalizedName } : {})
      })
      .where(eq(users.id, existingByEmail.id))
      .returning();
    return result[0];
  }

  const result = await db
    .insert(users)
    .values({
      id: input.supabaseId,
      email: normalizedEmail,
      name: normalizedName
    })
    .returning();
  return result[0];
}
