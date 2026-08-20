import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, rows } from "@/lib/db";
import type { HubUser, Role } from "@/lib/types";

const COOKIE = "school-hub-session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "local-school-hub-development-secret-change-me");

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getCurrentUser(): Promise<HubUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const result = await db().execute({ sql: `SELECT u.id,u.email,u.full_name as fullName,u.role,u.department_id as departmentId,d.name as departmentName,u.job_title as jobTitle,u.active FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.id=? LIMIT 1`, args: [String(payload.userId)] });
    const user = rows<HubUser>(result)[0];
    return user && Boolean(user.active) ? { ...user, active: Boolean(user.active), role: user.role as Role } : null;
  } catch { return null; }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/?denied=1");
  return user;
}
