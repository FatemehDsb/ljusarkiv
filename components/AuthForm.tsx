"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "@/lib/actions/auth";

export default function AuthForm({
  action,
  mode,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  mode: "login" | "register";
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      className="card stack"
      style={{ maxWidth: 460 }}
      onSubmit={(e) => {
        // startTransition hindrar React från att tömma fälten vid fel.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {state?.error && <div className="notice err" role="alert">{state.error}</div>}
      {mode === "register" && <Register />}
      <div>
        <label htmlFor="email">E-postadress</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label htmlFor="password">Lösenord{mode === "register" ? " (minst 8 tecken)" : ""}</label>
        <input id="password" name="password" type="password" required minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "register" ? "new-password" : "current-password"} />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? "Vänta…" : mode === "login" ? "Logga in" : "Skapa konto"}
      </button>
    </form>
  );
}

function Register() {
  return (
    <>
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: ".85rem" }}>Jag är</legend>
        <label className="inline"><input type="radio" name="role" value="designer" defaultChecked /> Ljusdesigner</label>
        <label className="inline"><input type="radio" name="role" value="manufacturer" /> Tillverkare eller leverantör</label>
      </fieldset>
      <div>
        <label htmlFor="name">Ditt namn</label>
        <input id="name" name="name" type="text" required autoComplete="name" />
      </div>
      <div>
        <label htmlFor="company">Företag (krävs för tillverkare)</label>
        <input id="company" name="company" type="text" autoComplete="organization" />
      </div>
      <div>
        <label htmlFor="website">Företagets webbplats (valfritt)</label>
        <input id="website" name="website" type="text" placeholder="https://" />
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Tillverkarkonton granskas av oss innan era produkter blir synliga för designers.
      </p>
    </>
  );
}
