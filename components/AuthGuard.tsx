"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ViewerContext, type Viewer } from "@/components/ViewerContext";
import BrandMark from "@/components/BrandMark";

// Explicit allowlist for the CBDEVS Portal global administrator.
// Use the immutable Supabase Auth user ID, never an email-only check. This is a UX gate only:
// row-level security still decides which records the account can read.
const GLOBAL_ADMIN_USER_IDS = new Set([
  "ec735f4c-fdb8-4d6b-b672-c2574ff34832",
]);

type GuardState = "checking" | "allowed" | "unlinked" | "error";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("checking");
  const [viewer, setViewer] = useState<Viewer | null>(null);

  // Verification runs once per mounted session, not on every navigation.
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
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!active) return;

        if (error || !data.user) {
          router.replace(`/login?next=${encodeURIComponent(window.location.pathname || "/dashboard")}`);
          return;
        }

        const isGlobalAdmin = GLOBAL_ADMIN_USER_IDS.has(data.user.id);
        setViewer({ userId: data.user.id, email: data.user.email ?? "", isGlobalAdmin });

        // Global admin accounts are staff accounts, not customer records.
        if (isGlobalAdmin) {
          setState("allowed");
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
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || event === "SIGNED_OUT") {
        router.replace("/login");
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void verify();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (state === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-cb-bg" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4 text-sm text-cb-muted">
          <BrandMark />
          <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-cb-amber" />Verificando sesión segura…</span>
        </div>
      </div>
    );
  }

  if (state === "unlinked") {
    return (
      <main className="grid min-h-screen place-items-center bg-cb-bg p-5">
        <section className="panel w-full max-w-lg p-8 text-center">
          <ShieldCheck className="mx-auto mb-4 text-cb-amber" size={32} aria-hidden />
          <h1 className="text-2xl font-bold">Cuenta pendiente de vinculación</h1>
          <p className="mt-3 text-sm leading-6 text-cb-muted">Tu sesión es válida, pero esta cuenta todavía no está vinculada a un cliente activo de CBDEVS. Por seguridad, no mostramos proyectos ni pagos hasta que el equipo vincule tu cuenta.</p>
          <p className="mt-3 text-sm text-cb-muted">Si ya contrataste un proyecto, escríbenos indicando el correo con el que iniciaste sesión.</p>
          <button type="button" className="btn-primary mt-6" onClick={async () => { await createClient().auth.signOut(); router.replace("/login"); }}>
            <LogOut size={16} aria-hidden /> Cerrar sesión
          </button>
        </section>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-cb-bg p-5">
        <section className="panel w-full max-w-lg p-8 text-center" role="alert">
          <AlertTriangle className="mx-auto mb-4 text-red-400" size={30} aria-hidden />
          <h1 className="text-xl font-bold">No se pudo verificar el acceso</h1>
          <p className="mt-3 text-sm text-cb-muted">No pudimos confirmar los permisos de esta cuenta. No se cargaron datos privados. Intenta nuevamente en unos minutos.</p>
          <button type="button" className="btn-ghost mt-5" onClick={() => window.location.reload()}>Reintentar</button>
        </section>
      </main>
    );
  }

  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

