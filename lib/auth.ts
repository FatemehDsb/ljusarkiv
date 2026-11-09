import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { queryOne } from "./db";

const COOKIE = "ljusarkiv_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 dagar

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET saknas eller är för kort (minst 32 tecken).");
  }
  return new TextEncoder().encode(s);
}

export type Role = "designer" | "manufacturer";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  company_id: number | null;
  company_name: string | null;
};

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = Number(payload.uid);
    if (!Number.isInteger(uid)) return null;
    return await queryOne<SessionUser>(
      `SELECT u.id, u.email, u.name, u.role, u.company_id, c.name AS company_name
         FROM users u LEFT JOIN companies c ON c.id = u.company_id
        WHERE u.id = $1`,
      [uid]
    );
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/logga-in");
  return user;
}

export async function requireDesigner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "designer") redirect("/tillverkare");
  return user;
}

export async function requireManufacturer(): Promise<SessionUser & { company_id: number }> {
  const user = await requireUser();
  if (user.role !== "manufacturer" || user.company_id === null) redirect("/sok");
  return user as SessionUser & { company_id: number };
}
