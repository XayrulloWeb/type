import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcrypt";
import { clearFailedLogins, recordFailedLogin } from "./rate-limit";

async function rejectFailedLogin(username: string) {
  const delay = recordFailedLogin(username);
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  return null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = credentials.username.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { username },
          include: { class: true },
        });

        if (!user || !user.isActive) {
          return rejectFailedLogin(username);
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return rejectFailedLogin(username);
        }

        clearFailedLogins(username);

        return {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          className: user.class?.name ?? null,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.className = user.className;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      }
      if (trigger === "update" && typeof session?.mustChangePassword === "boolean") {
        token.mustChangePassword = session.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.className = (token.className as string | null) ?? null;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === "development" ? "nova-type-local-development-secret" : undefined),
};
