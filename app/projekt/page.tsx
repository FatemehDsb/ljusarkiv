import Link from "next/link";
import { requireDesigner } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { createProject } from "@/lib/actions/designer";
import { Flash } from "@/lib/ui";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requireDesigner();
  const sp = await searchParams;
  const projects = await query<{ id: number; name: string; client: string | null; created_at: string; n: string }>(
    `SELECT pr.id, pr.name, pr.client, pr.created_at, count(i.id) AS n
       FROM projects pr LEFT JOIN project_items i ON i.project_id = pr.id
      WHERE pr.owner_id = $1 GROUP BY pr.id ORDER BY pr.created_at DESC`,
    [user.id]
  );
  return (
    <>
      <h1>Projekt</h1>
      <Flash sp={sp} />
      <div className="grid cols-2" style={{ alignItems: "start", marginTop: "1rem" }}>
        <div>
          {projects.length === 0 ? (
            <div className="notice info">Du har inga projekt ännu. Skapa ett till höger, eller lägg en armatur i ett nytt projekt från armaturens sida.</div>
          ) : (
            <div className="tablewrap">
              <table>
                <thead><tr><th>Projekt</th><th>Beställare</th><th>Armaturer</th><th>Skapat</th></tr></thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td><Link href={`/projekt/${p.id}`}>{p.name}</Link></td>
                      <td>{p.client ?? "–"}</td>
                      <td>{p.n}</td>
                      <td>{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <form action={createProject} className="card">
          <h3>Nytt projekt</h3>
          <label htmlFor="name">Projektnamn</label>
          <input id="name" name="name" type="text" required maxLength={120} />
          <label htmlFor="client">Beställare (valfritt)</label>
          <input id="client" name="client" type="text" maxLength={120} />
          <label htmlFor="description">Beskrivning (valfritt)</label>
          <textarea id="description" name="description" maxLength={1000} />
          <div style={{ marginTop: ".75rem" }}><button type="submit">Skapa projekt</button></div>
        </form>
      </div>
    </>
  );
}
