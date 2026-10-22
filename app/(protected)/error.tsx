"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ProtectedError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log only a non-sensitive identifier; never the error payload, which may contain data.
    console.error("[Portal] Page error", error.digest ?? "client");
  }, [error]);

  return (
    <div className="mx-auto max-w-lg">
      <section className="panel p-8 text-center" role="alert">
        <AlertTriangle className="mx-auto mb-4 text-red-400" size={30} aria-hidden />
        <h1 className="text-xl font-bold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-cb-muted">No pudimos mostrar esta sección. Tus datos no se modificaron.</p>
        <button type="button" className="btn-primary mt-6" onClick={reset}>Intentar de nuevo</button>
      </section>
    </div>
  );
}
