import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import {
  accounts,
  authenticators,
  passwordCredentials,
  sessions,
  users,
  verificationTokens,
} from "@/drizzle/schema";

function buildAdapter() {
  return DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  });
}

if (!process.env.NEXTAUTH_SECRET) {
  console.error("NEXTAUTH_SECRET is missing. Set it in your environment.");
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: buildAdapter(),
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) {
      console.error("[NextAuth][error]", code, metadata);
    },
    warn(code) {
      console.warn("[NextAuth][warn]", code);
    },
    debug(code, metadata) {
      console.debug("[NextAuth][debug]", code, metadata);
    },
  },
  pages: {
    signIn: "/login", // placeholder route (UI to be implemented)
  },
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const result = await db
          .select({
            userId: passwordCredentials.userId,
            hashedPassword: passwordCredentials.hashedPassword,
            user: users,
          })
          .from(passwordCredentials)
          .innerJoin(users, eq(users.id, passwordCredentials.userId))
          .where(
            and(
              eq(passwordCredentials.provider, "credentials"),
              eq(passwordCredentials.identifier, normalizedEmail),
            ),
          )
          .limit(1);

        if (result.length === 0) {
          return null;
        }

        const { hashedPassword, user } = result[0];
        const valid = await bcrypt.compare(credentials.password, hashedPassword);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}

export type SessionWithUser = Awaited<ReturnType<typeof auth>>;
