import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDesigner } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { fmt } from "@/lib/format";
import { deleteProject, moveItem, removeItem, updateItem } from "@/lib/actions/designer";
import { Flash } from "@/lib/ui";
import ConfirmButton from "@/components/ConfirmButton";

type SP = Promise<Record<string, string | string[] | undefined>>;

type Item = {
  id: number; product_id: number; zone: string | null; note: string | null;
  name: string; manufacturer_name: string; type: string; power_w: string | null; lumen: number | null; approved: boolean;
};

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const user = await requireDesigner();
  const { id } = await params;
  const sp = await searchParams;
  const pid = Number(id);
  if (!Number.isInteger(pid) || pid < 1) notFound();

  const project = await queryOne<{ id: number; name: string; client: string | null; description: string | null }>(
    "SELECT id, name, client, description FROM projects WHERE id = $1 AND owner_id = $2",
    [pid, user.id]
  );
  if (!project) notFound();

  const items = await query<Item>(
    `SELECT i.id, i.product_id, i.zone, i.note, p.name, c.name AS manufacturer_name, p.type, p.power_w, p.lumen, c.approved
       FROM project_items i JOIN products p ON p.id = i.product_id JOIN companies c ON c.id = p.manufacturer_id
      WHERE i.project_id = $1 ORDER BY i.zone NULLS LAST, p.name`,
    [pid]
  );
  const others = await query<{ id: number; name: string }>(
    "SELECT id, name FROM projects WHERE owner_id = $1 AND id <> $2 ORDER BY name",
    [user.id, pid]
  );
  const compareQs = items.slice(0, 4).map((i) => `id=${i.product_id}`).join("&");
  const totalWatt = items.reduce((s, i) => s + (i.power_w ? Number(i.power_w) : 0), 0);

  return (
    <>
      <Link className="back" href="/projekt">← Tillbaka till projekt</Link>
      <div className="row between">
        <div>
          <h1>{project.name}</h1>
          {project.client && <div className="muted">Beställare: {project.client}</div>}
          {project.description && <p>{project.description}</p>}
        </div>
        <form action={deleteProject}>
          <input type="hidden" name="id" value={project.id} />
          <ConfirmButton message="Ta bort projektet? Armaturlistan försvinner (förfrågningar du redan skickat finns kvar).">Ta bort projekt</ConfirmButton>
        </form>
      </div>
      <Flash sp={sp} />
      <div className="row" style={{ margin: ".75rem 0" }}>
        <Link href="/sok" className="btn">Lägg till armatur</Link>
        {items.length >= 2 && <Link href={`/jamfor?${compareQs}`} className="btn secondary">Jämför de {Math.min(4, items.length)} första</Link>}
        <span className="muted small">{items.length} armaturer · summa effekt per styck: {fmt(totalWatt, "W")}</span>
      </div>

      {items.length === 0 ? (
        <div className="notice info">Projektet är tomt. Sök en armatur och välj &quot;Lägg i projekt&quot;.</div>
      ) : (
        <div className="stack">
          {items.map((i) => (
            <div key={i.id} className="card">
              <div className="row between">
                <div>
                  <Link href={`/armatur/${i.product_id}`}><strong>{i.name}</strong></Link>{" "}
                  <span className="muted small">{i.manufacturer_name} · {i.type} · {fmt(i.power_w, "W")} · {fmt(i.lumen, "lm")}</span>
                </div>
                <div className="row">
                  <Link className="btn secondary small" href={`/armatur/${i.product_id}`}>Begär offert / prov</Link>
                  <form action={removeItem}>
                    <input type="hidden" name="item_id" value={i.id} />
                    <ConfirmButton message="Ta bort armaturen från projektet?">Ta bort</ConfirmButton>
                  </form>
                </div>
              </div>
              <div className="grid cols-2" style={{ marginTop: ".5rem" }}>
                <form action={updateItem}>
                  <input type="hidden" name="item_id" value={i.id} />
                  <div className="grid cols-2">
                    <div><label htmlFor={`z${i.id}`}>Zon / rum</label><input id={`z${i.id}`} name="zone" type="text" maxLength={100} defaultValue={i.zone ?? ""} /></div>
                    <div><label htmlFor={`n${i.id}`}>Anteckning</label><input id={`n${i.id}`} name="note" type="text" maxLength={1000} defaultValue={i.note ?? ""} /></div>
                  </div>
                  <div style={{ marginTop: ".5rem" }}><button className="secondary small" type="submit">Spara</button></div>
                </form>
                {others.length > 0 && (
                  <form action={moveItem}>
                    <input type="hidden" name="item_id" value={i.id} />
                    <label htmlFor={`m${i.id}`}>Flytta till annat projekt</label>
                    <div className="row">
                      <select id={`m${i.id}`} name="target_project" defaultValue="" style={{ flex: 1 }}>
                        <option value="">Välj projekt…</option>
                        {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                      <button className="secondary small" type="submit">Flytta</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
