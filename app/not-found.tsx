import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-cb-bg p-5">
      <section className="panel w-full max-w-md p-8 text-center">
        <BrandMark />
        <div className="mt-6 font-mono text-5xl font-bold text-cb-amber">404</div>
        <h1 className="mt-3 text-xl font-bold">Página no encontrada</h1>
        <p className="mt-2 text-sm text-cb-muted">El enlace que abriste no existe o ya no está disponible.</p>
        <Link href="/dashboard" className="btn-primary mt-6">Volver al portal</Link>
      </section>
    </main>
  );
}
