"use client";

import { FolderKanban } from "lucide-react";
import { useViewer } from "@/components/ViewerContext";
import { ErrorBanner } from "@/components/ui";

/** Shown on every page when the account has no linked project, or projects failed to load. */
export default function NoProjectState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  const viewer = useViewer();
  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <ErrorBanner>{error}</ErrorBanner>
        {onRetry && <button type="button" className="btn-ghost" onClick={onRetry}>Reintentar</button>}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <div className="panel p-8 sm:p-10">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-cb-panel2 text-cb-amber"><FolderKanban aria-hidden /></div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
          {viewer?.isGlobalAdmin ? "Vista de equipo CBDEVS" : "Tu proyecto se está preparando"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-cb-muted">
          {viewer?.isGlobalAdmin
            ? "Esta cuenta es de administración y no está vinculada a un cliente, por lo que no muestra proyectos aquí. Gestiona clientes, proyectos, hitos y pagos desde CBDEVS Admin."
            : "Tu cuenta está activa, pero aún no hay un proyecto vinculado. En cuanto el equipo lo configure verás aquí el avance, las entregas, los documentos, los pagos y los mensajes."}
        </p>
      </div>
    </div>
  );
}
