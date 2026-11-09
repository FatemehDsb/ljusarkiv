import Link from "next/link";
import { requireManufacturer } from "@/lib/auth";
import ProductEditor from "@/components/ProductEditor";

export default async function Page() {
  await requireManufacturer();
  return (
    <>
      <Link className="back" href="/tillverkare/produkter">← Tillbaka till produkter</Link>
      <h1>Ny produkt</h1>
      <ProductEditor />
    </>
  );
}
