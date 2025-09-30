import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { passwordCredentials, users } from "@/drizzle/schema";

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  const body = RegisterBody.parse(await request.json());
  const email = body.email.trim().toLowerCase();

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 },
    );
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);

  const insertedUsers = await db
    .insert(users)
    .values({
      email,
      name: body.name ?? null,
    })
    .returning({ id: users.id });

  const userId = insertedUsers[0]?.id;
  if (!userId) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  await db.insert(passwordCredentials).values({
    userId,
    identifier: email,
    hashedPassword,
  });

  return NextResponse.json({ ok: true, userId });
}
