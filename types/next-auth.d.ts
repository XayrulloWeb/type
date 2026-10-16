import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      className: string | null;
      role: string;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    className: string | null;
    role: string;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    className: string | null;
    role: string;
    mustChangePassword: boolean;
  }
}
