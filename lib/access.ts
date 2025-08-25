import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const id = (session?.user as any)?.id ?? null;
  const role = (session?.user as any)?.role ?? null;
  const accessLevel = (session?.user as any)?.accessLevel ?? null;
  const status = (session?.user as any)?.status ?? null;
  return { session, email, id, role, accessLevel, status };
}

export const isSuperAdmin = (u: any) => u?.role === "SUPER_ADMIN" || u?.accessLevel === "ADMIN";
export const isCoach = (u: any) => u?.role === "COACH";
export const isStudent = (u: any) => u?.role === "STUDENT";
      