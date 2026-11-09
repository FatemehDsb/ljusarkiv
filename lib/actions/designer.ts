"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requireDesigner } from "@/lib/auth";
import { FormError, int, reqStr, str } from "@/lib/validate";

function back(path: string, kind: "ok" | "fel", msg: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
}

async function ownProject(userId: number, projectId: number | null) {
  if (projectId === null) return null;
  const p = await queryOne<{ id: number }>("SELECT id FROM projects WHERE id = $1 AND owner_id = $2", [projectId, userId]);
  if (!p) throw new FormError("Projektet hittades inte.");
  return p.id;
}

async function visibleProduct(productId: number) {
  const p = await queryOne<{ id: number; sample_available: boolean }>(
    `SELECT p.id, p.sample_available FROM products p JOIN companies c ON c.id = p.manufacturer_id
      WHERE p.id = $1 AND c.approved = true`,
    [productId]
  );
  if (!p) throw new FormError("Armaturen hittades inte.");
  return p;
}

export async function createProject(fd: FormData) {
  const user = await requireDesigner();
  let id: number;
  try {
    const name = reqStr(fd.get("name"), 120);
    const row = await queryOne<{ id: number }>(
      "INSERT INTO projects (owner_id, name, client, description) VALUES ($1,$2,$3,$4) RETURNING id",
      [user.id, name, str(fd.get("client"), 120), str(fd.get("description"), 1000)]
    );
    id = row!.id;
  } catch (e) {
    if (e instanceof FormError) back("/projekt", "fel", "Ange ett projektnamn.");
    throw e;
  }
  redirect(`/projekt/${id}`);
}

export async function deleteProject(fd: FormData) {
  const user = await requireDesigner();
  const id = int(fd.get("id"), 1, 2147483647);
  await query("DELETE FROM projects WHERE id = $1 AND owner_id = $2", [id, user.id]);
  revalidatePath("/projekt");
  redirect("/projekt?ok=" + encodeURIComponent("Projektet togs bort."));
}

export async function addToProject(fd: FormData) {
  const user = await requireDesigner();
  const productId = int(fd.get("product_id"), 1, 2147483647)!;
  const path = `/armatur/${productId}`;
  let projectId: number;
  try {
    await visibleProduct(productId);
    const existing = int(fd.get("project_id"), 1, 2147483647);
    const newName = str(fd.get("new_project"), 120);
    if (newName) {
      const row = await queryOne<{ id: number }>(
        "INSERT INTO projects (owner_id, name) VALUES ($1,$2) RETURNING id",
        [user.id, newName]
      );
      projectId = row!.id;
    } else if (existing) {
      projectId = (await ownProject(user.id, existing))!;
    } else {
      throw new FormError("Välj ett projekt eller skriv ett nytt projektnamn.");
    }
    await query(
      `INSERT INTO project_items (project_id, product_id, zone, note) VALUES ($1,$2,$3,$4)
       ON CONFLICT (project_id, product_id) DO UPDATE SET zone = EXCLUDED.zone, note = EXCLUDED.note`,
      [projectId, productId, str(fd.get("zone"), 100), str(fd.get("note"), 1000)]
    );
  } catch (e) {
    if (e instanceof FormError) back(path, "fel", e.message);
    throw e;
  }
  redirect(`/projekt/${projectId}?ok=${encodeURIComponent("Armaturen lades till i projektet.")}`);
}

export async function updateItem(fd: FormData) {
  const user = await requireDesigner();
  const itemId = int(fd.get("item_id"), 1, 2147483647);
  const row = await queryOne<{ project_id: number }>(
    `UPDATE project_items i SET zone = $2, note = $3
       FROM projects pr WHERE i.id = $1 AND pr.id = i.project_id AND pr.owner_id = $4
     RETURNING i.project_id`,
    [itemId, str(fd.get("zone"), 100), str(fd.get("note"), 1000), user.id]
  );
  if (!row) redirect("/projekt");
  redirect(`/projekt/${row.project_id}?ok=${encodeURIComponent("Sparat.")}`);
}

export async function removeItem(fd: FormData) {
  const user = await requireDesigner();
  const itemId = int(fd.get("item_id"), 1, 2147483647);
  const row = await queryOne<{ project_id: number }>(
    `DELETE FROM project_items i USING projects pr
      WHERE i.id = $1 AND pr.id = i.project_id AND pr.owner_id = $2 RETURNING i.project_id`,
    [itemId, user.id]
  );
  if (!row) redirect("/projekt");
  redirect(`/projekt/${row.project_id}?ok=${encodeURIComponent("Armaturen togs bort från projektet.")}`);
}

export async function moveItem(fd: FormData) {
  const user = await requireDesigner();
  const itemId = int(fd.get("item_id"), 1, 2147483647);
  const target = int(fd.get("target_project"), 1, 2147483647);
  const item = await queryOne<{ id: number; project_id: number; product_id: number }>(
    `SELECT i.id, i.project_id, i.product_id FROM project_items i
       JOIN projects pr ON pr.id = i.project_id WHERE i.id = $1 AND pr.owner_id = $2`,
    [itemId, user.id]
  );
  if (!item) redirect("/projekt");
  const here = `/projekt/${item.project_id}`;
  try {
    if (!target) throw new FormError("Välj ett projekt att flytta till.");
    await ownProject(user.id, target);
    if (target === item.project_id) throw new FormError("Armaturen ligger redan i det projektet.");
    const dup = await queryOne("SELECT 1 FROM project_items WHERE project_id = $1 AND product_id = $2", [target, item.product_id]);
    if (dup) throw new FormError("Armaturen finns redan i det andra projektet.");
    await query("UPDATE project_items SET project_id = $1 WHERE id = $2", [target, item.id]);
  } catch (e) {
    if (e instanceof FormError) back(here, "fel", e.message);
    throw e;
  }
  back(here, "ok", "Armaturen flyttades.");
}

export async function requestQuote(fd: FormData) {
  const user = await requireDesigner();
  const productId = int(fd.get("product_id"), 1, 2147483647)!;
  const path = `/armatur/${productId}`;
  try {
    await visibleProduct(productId);
    const quantity = int(fd.get("quantity"), 1, 1000000) ?? 1;
    const projectId = await ownProject(user.id, int(fd.get("project_id"), 1, 2147483647));
    await query(
      `INSERT INTO quote_requests (designer_id, product_id, project_id, quantity, message) VALUES ($1,$2,$3,$4,$5)`,
      [user.id, productId, projectId, quantity, str(fd.get("message"), 2000)]
    );
  } catch (e) {
    if (e instanceof FormError) back(path, "fel", e.message);
    throw e;
  }
  redirect(`/forfragningar?ok=${encodeURIComponent("Offertförfrågan skickades till tillverkaren.")}`);
}

export async function requestSample(fd: FormData) {
  const user = await requireDesigner();
  const productId = int(fd.get("product_id"), 1, 2147483647)!;
  const path = `/armatur/${productId}`;
  try {
    const p = await visibleProduct(productId);
    if (!p.sample_available) throw new FormError("Det finns ingen provarmatur för den här armaturen.");
    const address = reqStr(fd.get("delivery_address"), 500);
    const projectId = await ownProject(user.id, int(fd.get("project_id"), 1, 2147483647));
    await query(
      `INSERT INTO sample_requests (designer_id, product_id, project_id, message, delivery_address) VALUES ($1,$2,$3,$4,$5)`,
      [user.id, productId, projectId, str(fd.get("message"), 2000), address]
    );
  } catch (e) {
    if (e instanceof FormError) back(path, "fel", e.message === "Obligatoriskt fält saknas." ? "Ange leveransadress." : e.message);
    throw e;
  }
  redirect(`/forfragningar?ok=${encodeURIComponent("Provarmaturförfrågan skickades till tillverkaren.")}`);
}

export async function cancelRequest(fd: FormData) {
  const user = await requireDesigner();
  const id = int(fd.get("id"), 1, 2147483647);
  const kind = fd.get("kind") === "prov" ? "sample_requests" : "quote_requests";
  await query(`DELETE FROM ${kind} WHERE id = $1 AND designer_id = $2 AND status = 'Ny'`, [id, user.id]);
  redirect(`/forfragningar?ok=${encodeURIComponent("Förfrågan drogs tillbaka.")}`);
}
