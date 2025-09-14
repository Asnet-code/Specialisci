// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prismadb";
import bcrypt from "bcrypt";

/**
 * Uproszczone założenia:
 * - Nie ma kroku /oauth/after ani /api/oauth/complete.
 * - Po zalogowaniu przez Google/Facebook używamy callbackUrl wskazującego na
 *   /api/oauth/finalize?role=CLIENT|SPECIALIST, gdzie finalizujemy dane w DB.
 * - Dla kont OAuth zakładamy automatyczną akceptację polityki prywatności
 *   (bo link jest w Google Console).
 */

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Zły e-mail lub hasło");
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) {
          throw new Error("Zły e-mail lub hasło");
        }
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) throw new Error("Zły e-mail lub hasło");

        return {
          id: user.id,
          email: user.email!,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],

  pages: { signIn: "/login" },
  session: { strategy: "jwt" },

  callbacks: {
    // Wstrzykujemy id/role/status/acceptedPrivacyPolicy do tokena
    async jwt({ token, user, trigger }) {
      const email = user?.email ?? (token.email as string | undefined);

      if (email) {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            role: true,
            status: true,
            email: true,
            acceptedPrivacyPolicy: true,
          },
        });
        if (dbUser) {
          (token as any).id = dbUser.id;
          (token as any).role = dbUser.role;
          (token as any).status = dbUser.status;
          (token as any).acceptedPrivacyPolicy =
            dbUser.acceptedPrivacyPolicy ?? true; // traktuj jako true dla UX
          token.email = dbUser.email ?? token.email;
        }
      }

      if (trigger === "update" && token?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: {
            role: true,
            status: true,
            acceptedPrivacyPolicy: true,
          },
        });
        if (dbUser) {
          (token as any).role = dbUser.role;
          (token as any).status = dbUser.status;
          (token as any).acceptedPrivacyPolicy =
            dbUser.acceptedPrivacyPolicy ?? true;
        }
      }

      return token;
    },

    // Przepis z tokena do session.user
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id as string;
        (session.user as any).role = (token as any).role as string;
        (session.user as any).status = (token as any).status as string;
        (session.user as any).acceptedPrivacyPolicy = Boolean(
          (token as any).acceptedPrivacyPolicy ?? true
        );
      }
      return session;
    },

    // OAuth: nie nadpisujemy URL — używamy callbackUrl z frontu (na /api/oauth/finalize)
    async signIn({ user, account }) {
      if (account?.provider !== "credentials" && user?.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            emailVerified: true,
            status: true,
            acceptedPrivacyPolicy: true,
            password: true,
          },
        });

        if (existing) {
          const updates: Record<string, any> = {};
          if (!existing.emailVerified) updates.emailVerified = new Date();
          if (existing.status !== "ACTIVE") updates.status = "ACTIVE";
          // Auto-akceptacja dla OAuth (gdy brak hasła / nieakceptowane wcześniej)
          if (!existing.password && !existing.acceptedPrivacyPolicy) {
            updates.acceptedPrivacyPolicy = true;
            updates.acceptedPrivacyAt = new Date();
          }
          if (Object.keys(updates).length) {
            await prisma.user.update({
              where: { id: existing.id },
              data: updates,
            });
          }
          return true;
        }
        return true; // nowy user — adapter go utworzy
      }
      return true;
    },
  },

  events: {
    // Po utworzeniu rekordu (np. przez adapter OAuth)
    async createUser({ user }) {
      const full = await prisma.user.findUnique({
        where: { id: user.id as string },
        select: {
          status: true,
          emailVerified: true,
          password: true,
          acceptedPrivacyPolicy: true,
        },
      });
      if (!full) return;

      const updates: Record<string, any> = {};
      if (!full.emailVerified) updates.emailVerified = new Date();
      if (full.status !== "ACTIVE") updates.status = "ACTIVE";
      // Jeżeli konto jest typowo OAuth (brak hasła) — auto-akceptuj privacy
      if (!full.password && !full.acceptedPrivacyPolicy) {
        updates.acceptedPrivacyPolicy = true;
        updates.acceptedPrivacyAt = new Date();
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: user.id as string },
          data: updates,
        });
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};
