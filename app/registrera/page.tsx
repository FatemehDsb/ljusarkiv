import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { register } from "@/lib/actions/auth";
import AuthForm from "@/components/AuthForm";

export default async function Page() {
  if (await getUser()) redirect("/sok");
  return (
    <>
      <h1>Skapa konto</h1>
      <p className="muted">Har du redan ett konto? <Link href="/logga-in">Logga in</Link>.</p>
      <AuthForm action={register} mode="register" />
    </>
  );
}
