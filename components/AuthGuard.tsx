"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GuardState = "checking" | "allowed" | "unlinked" | "error";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GuardState>("checking");

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setState("error");
      return;
    }

    async function verify() {
      setState("checking");
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!active) return;

        if (error || !data.user) {
          router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
          return;
        }

        const { data: clients, error: clientError } = await supabase
          .from("cbdevs_clients")
          .select("id")
          .eq("linked_user_id", data.user.id)
          .eq("active", true)
          .limit(1);

        if (!active) return;
        if (clientError) {
          console.error("[AuthGuard] Client authorization lookup failed:", clientError.code);
          setState("error");
          return;
        }
        setState(clients?.length ? "allowed" : "unlinked");
      } catch {
        if (active) setState("error");
      }
    }

    void verify();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
      else void verify();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (state === "checking") {
    return <div className="grid min-h-screen place-items-center bg-cb-bg text-sm text-cb-muted" role="status">Verificando sesión segura...</div>;
  }

  if (state === "unlinked") {
    return (
      <main className="grid min-h-screen place-items-center bg-cb-bg p-5">
        <section className="panel w-full max-w-lg p-8 text-center">
          <ShieldCheck className="mx-auto mb-4 text-cb-amber" size={32} />
          <h1 className="text-2xl font-bold">Cuenta pendiente de vinculación</h1>
          <p className="mt-3 text-sm leading-6 text-cb-muted">Tu sesión es válida, pero esta cuenta todavía no está vinculada a un cliente activo de CBDEVS. Por seguridad, no mostramos proyectos ni pagos hasta que el equipo vincule tu cuenta.</p>
          <button className="btn-primary mt-6" onClick={async () => { await createClient().auth.signOut(); router.replace("/login"); }}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </section>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-cb-bg p-5">
        <section className="panel w-full max-w-lg p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-400" size={30} />
          <h1 className="text-xl font-bold">No se pudo verificar el acceso</h1>
          <p className="mt-3 text-sm text-cb-muted">No pudimos confirmar los permisos de esta cuenta. No se cargaron datos privados. Intenta nuevamente más tarde.</p>
          <button className="btn-ghost mt-5" onClick={() => window.location.reload()}>Reintentar</button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}