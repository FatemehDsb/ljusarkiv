export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const fel = typeof sp.fel === "string" ? sp.fel : null;
  return (
    <>
      {ok && <div className="notice ok" role="status">{ok}</div>}
      {fel && <div className="notice err" role="alert">{fel}</div>}
    </>
  );
}

export function StatusTag({ status }: { status: string }) {
  const cls =
    status === "Ny" ? "info" : status === "Avvisad" ? "bad" : status === "Besvarad" || status === "Godkänd" || status === "Återlämnad" ? "ok" : "warm";
  return <span className={`tag ${cls}`}>{status}</span>;
}
