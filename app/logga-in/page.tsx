import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { login } from "@/lib/actions/auth";
import AuthForm from "@/components/AuthForm";

export default async function Page() {
  if (await getUser()) redirect("/sok");
  return (
    <>
      <h1>Logga in</h1>
      <p className="muted">Ny här? <Link href="/registrera">Skapa ett konto</Link>.</p>
      <AuthForm action={login} mode="login" />
    </>
  );
}
