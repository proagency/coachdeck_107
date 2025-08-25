// augment next-auth session/jwt
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: "SUPER_ADMIN" | "COACH" | "STUDENT";
      accessLevel?: "ADMIN" | "USER";
      phone?: string | null;
      status?: "PENDING" | "ACTIVE" | "DISABLED";
      email?: string | null;
      name?: string | null;
      image?: string | null;
    }
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "SUPER_ADMIN" | "COACH" | "STUDENT";
    accessLevel?: "ADMIN" | "USER";
    phone?: string | null;
    status?: "PENDING" | "ACTIVE" | "DISABLED";
  }
}
      