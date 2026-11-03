"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BrandMark from "@/components/BrandMark";

/**
 * Landing page for invitations sent from CBDEVS Admin.
 * Server-sent invites return tokens in the URL fragment (implicit grant), which the portal's PKCE
 * browser client does not consume automatically. The fragment never reaches the server; it is read
 * here once, exchanged for a session, removed from the address bar, and the client is sent to
 * create a password.
 */
export default function AcceptInvitePage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    window.history.replaceState(null, "", window.location.pathname);
    const description = hash.get("error_description");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (description || !accessToken || !refreshToken) {
      setError(description ? "El enlace de invitación expiró o ya se usó. Pide al equipo de CBDEVS que te envíe uno nuevo." : "El enlace de invitación no es válido.");
      return;
    }

    void createClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error: sessionError }) => {
      if (sessionError) {
        setError("No pudimos validar la invitación. Pide al equipo de CBDEVS que te envíe un enlace nuevo.");
        return;
      }
      router.replace("/reset-password?welcome=1");
    });
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-cb-bg p-5">
      <section className="panel w-full max-w-md p-8 text-center">
        <BrandMark />
        {error ? (
          <div role="alert" className="mt-6">
            <AlertTriangle className="mx-auto mb-3 text-red-400" aria-hidden />
            <h1 className="text-lg font-bold">No se pudo abrir la invitación</h1>
            <p className="mt-2 text-sm text-cb-muted">{error}</p>
            <a href="/login" className="btn-ghost mt-5">Ir a iniciar sesión</a>
          </div>
        ) : (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-cb-muted" role="status"><Loader2 size={16} className="animate-spin" aria-hidden />Validando tu invitación…</p>
        )}
      </section>
    </main>
  );
}
