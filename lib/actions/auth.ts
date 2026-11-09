"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { pool, queryOne } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { FormError, reqStr, str, url } from "@/lib/validate";

export type FormState = { error?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = (str(fd.get("email"), 200) ?? "").toLowerCase();
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  const user = await queryOne<{ id: number; password_hash: string; role: string }>(
    "SELECT id, password_hash, role FROM users WHERE email = $1",
    [email]
  );
  // Samma felmeddelande oavsett om kontot finns, och alltid en hash-jämförelse.
  const hash = user?.password_hash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) return { error: "Fel e-postadress eller lösenord." };
  await createSession(user.id);
  redirect(user.role === "manufacturer" ? "/tillverkare" : "/sok");
}

export async function register(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const role = fd.get("role") === "manufacturer" ? "manufacturer" : "designer";
    const name = reqStr(fd.get("name"), 100);
    const email = reqStr(fd.get("email"), 200).toLowerCase();
    const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
    const companyName = role === "manufacturer" ? reqStr(fd.get("company"), 120) : str(fd.get("company"), 120);
    const website = url(fd.get("website"));

    if (!EMAIL_RE.test(email)) return { error: "Ange en giltig e-postadress." };
    if (password.length < 8) return { error: "Lösenordet måste vara minst 8 tecken." };
    if (password.length > 200) return { error: "Lösenordet är för långt." };

    const exists = await queryOne("SELECT 1 FROM users WHERE email = $1", [email]);
    if (exists) return { error: "Det finns redan ett konto med den e-postadressen." };

    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    let userId: number;
    try {
      await client.query("BEGIN");
      let companyId: number | null = null;
      if (companyName) {
        const c = await client.query(
          "INSERT INTO companies (name, kind, website) VALUES ($1, $2, $3) RETURNING id",
          [companyName, role, website]
        );
        companyId = c.rows[0].id;
      }
      const u = await client.query(
        "INSERT INTO users (email, password_hash, name, role, company_id) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [email, hash, name, role, companyId]
      );
      userId = u.rows[0].id;
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    await createSession(userId);
  } catch (e) {
    if (e instanceof FormError) return { error: e.message };
    throw e;
  }
  redirect(fd.get("role") === "manufacturer" ? "/tillverkare" : "/sok");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
