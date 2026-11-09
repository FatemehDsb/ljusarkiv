import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Ljusarkiv",
  description: "Plattformen för ljusdesigners: sök, jämför och begär offert och provarmatur.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="sv">
      <body>
        <header className="top">
          <div className="inner">
            <Link href="/" className="brand">Ljusarkiv</Link>
            <nav aria-label="Huvudmeny">
              {user?.role === "designer" && (
                <>
                  <Link href="/sok">Sök armaturer</Link>
                  <Link href="/projekt">Projekt</Link>
                  <Link href="/forfragningar">Mina förfrågningar</Link>
                </>
              )}
              {user?.role === "manufacturer" && (
                <>
                  <Link href="/tillverkare">Översikt</Link>
                  <Link href="/tillverkare/produkter">Produkter</Link>
                  <Link href="/tillverkare/offerter">Offertförfrågningar</Link>
                  <Link href="/tillverkare/prov">Provarmaturer</Link>
                </>
              )}
            </nav>
            <div className="who">
              {user ? (
                <>
                  <span>{user.name}{user.company_name ? ` · ${user.company_name}` : ""}</span>
                  <form action={logout}><button type="submit" className="small">Logga ut</button></form>
                </>
              ) : (
                <>
                  <Link href="/logga-in" style={{ color: "#fff" }}>Logga in</Link>
                  <Link href="/registrera" className="btn small secondary">Skapa konto</Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
