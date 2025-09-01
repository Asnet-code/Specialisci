// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prismadb";
import bcrypt from "bcrypt";

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
    async jwt({ token, user, trigger }) {
      const email = user?.email ?? (token.email as string | undefined);

      if (email) {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            role: true,
            status: true,
            name: true,
            image: true,
            email: true,
          },
        });
        if (dbUser) {
          (token as any).id = dbUser.id;
          (token as any).role = dbUser.role;
          (token as any).status = dbUser.status;
          token.email = dbUser.email ?? token.email;
        }
      }

      if (trigger === "update" && token?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { role: true, status: true, name: true, image: true },
        });
        if (dbUser) {
          (token as any).role = dbUser.role;
          (token as any).status = dbUser.status;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id as string;
        (session.user as any).role = (token as any).role as string;
        (session.user as any).status = (token as any).status as string;
      }
      return session;
    },

    // OAuth: uznaj e-mail za zweryfikowany i ustaw ACTIVE
    async signIn({ user, account }) {
      if (account?.provider !== "credentials" && user?.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            role: true,
            clientProfile: true,
            specialistProfile: true,
            emailVerified: true,
            status: true,
          },
        });

        if (existing) {
          await prisma.user.update({
            where: { email: user.email },
            data: {
              emailVerified: existing.emailVerified ?? new Date(),
              status: "ACTIVE",
              ...(existing.clientProfile || existing.specialistProfile
                ? {}
                : { clientProfile: { create: {} } }),
            },
          });
          return true;
        }

        // Gdyby adapter nie dopiął rekordu (guard)
        await prisma.user.update({
          where: { email: user.email },
          data: {
            role: "CLIENT",
            status: "ACTIVE",
            emailVerified: new Date(),
            clientProfile: { create: {} },
          },
        });
      }
      return true;
    },
  },

  events: {
    async createUser({ user }) {
      const full = await prisma.user.findUnique({
        where: { id: user.id as string },
        select: {
          role: true,
          status: true,
          emailVerified: true,
          clientProfile: true,
          specialistProfile: true,
        },
      });
      if (!full) return;

      const updates: Record<string, any> = {};
      if (!full.emailVerified) updates.emailVerified = new Date();
      if (full.status !== "ACTIVE") updates.status = "ACTIVE";
      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: user.id as string },
          data: updates,
        });
      }

      if (full.role === "SPECIALIST" && !full.specialistProfile) {
        await prisma.user.update({
          where: { id: user.id as string },
          data: { specialistProfile: { create: {} } },
        });
      } else if (!full.clientProfile) {
        await prisma.user.update({
          where: { id: user.id as string },
          data: { clientProfile: { create: {} } },
        });
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};
