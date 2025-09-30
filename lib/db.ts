import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/drizzle/schema";

type NeonClient = ReturnType<typeof neon>;

function assertDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to your environment variables.");
  }
  return url;
}

const client: NeonClient = neon(assertDatabaseUrl());

export const db = drizzle(client, { schema });
export type Database = typeof db;
