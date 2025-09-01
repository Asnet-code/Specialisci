import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prismadb";
import bcrypt from "bcrypt";

export const authOptions: AuthOptions = {
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
        if (!ok) {
          throw new Error("Zły e-mail lub hasło");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

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
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.email = dbUser.email;
        }
      }

      if (trigger === "update" && token?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { role: true, status: true, name: true, image: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).status = token.status as string;
      }
      return session;
    },

    // OAuth (Google/Facebook): uznaj e-mail za zweryfikowany i ustaw ACTIVE
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
          // Upewnij się, że verified + ACTIVE
          await prisma.user.update({
            where: { email: user.email },
            data: {
              emailVerified: existing.emailVerified ?? new Date(),
              status: "ACTIVE",
              // jeśli nie ma żadnego profilu, domyślnie utwórz klienta
              ...(existing.clientProfile || existing.specialistProfile
                ? {}
                : { clientProfile: { create: {} } }),
            },
          });
          return true;
        }

        // Zwykle adapter już utworzył usera — ten update to guard
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
    // Po utworzeniu usera (np. przez OAuth) – dopnij verified + ACTIVE oraz profil jeśli brakuje
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

      // Jeśli to konto powstało z OAuth, signIn już to ustawi.
      // Tutaj tylko „domykamy” brakujące pola (bez wymuszania PENDING).
      const updates: any = {};
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
