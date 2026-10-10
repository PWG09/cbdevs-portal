"use client";

import { CalendarClock, CheckCircle2, ExternalLink, FileText, Globe2 } from "lucide-react";
import { useClientProjects } from "@/components/useClientProjects";

function badge(status: string) {
  if (status === "Completado" || status === "Entregado" || status === "Pagado completo" || status === "Mantenimiento al dia") return "bg-emerald-500/10 text-emerald-300";
  if (status === "En progreso" || status === "En desarrollo" || status === "En revision") return "bg-cb-amber/10 text-cb-amber";
  if (status.includes("atrasado") || status.includes("Pausado")) return "bg-red-500/10 text-red-300";
  return "bg-cb-panel2 text-cb-muted";
}

export default function ProjectsClient() {
  const { currentProject, projects, loading, error } = useClientProjects();

  if (loading) return <div className="mx-auto max-w-[1200px]"><div className="panel h-80 animate-pulse" /></div>;

  if (!currentProject) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="panel p-8">
          <div className="mono-label">PROJECTS</div>
          <h1 className="mt-2 text-3xl font-bold">{error ? "No se pudieron cargar los proyectos" : "Sin proyectos vinculados"}</h1>
          <p className="mt-3 text-sm text-cb-muted">{error || "Cuando CBDEVS te asigne un proyecto, aquí aparecerá su avance detallado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mono-label">CLIENT WORK / {projects.length}</div>
          <h1 className="mt-1 text-3xl font-bold">Mi proyecto</h1>
          <p className="mt-1 text-sm text-cb-muted">Avance, entregables y enlaces importantes.</p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${badge(currentProject.deliveryStatus)}`}>{currentProject.deliveryStatus}</span>
      </div>

      <section className="panel p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <h2 className="text-2xl font-bold">{currentProject.name}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-cb-muted">{currentProject.notes}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-cb-line bg-cb-bg p-4">
                <CalendarClock className="mb-3 text-cb-amber" size={20} />
                <div className="text-sm text-cb-muted">Inicio</div>
                <div className="mt-1 font-semibold">{currentProject.startDate}</div>
              </div>
              <div className="rounded-xl border border-cb-line bg-cb-bg p-4">
                <CheckCircle2 className="mb-3 text-cb-amber" size={20} />
                <div className="text-sm text-cb-muted">Entrega estimada</div>
                <div className="mt-1 font-semibold">{currentProject.estimatedDelivery}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-cb-line bg-cb-bg p-4">
            <div className="mono-label">MILESTONES</div>
            <div className="mt-4 space-y-3">
              {(currentProject.milestones ?? []).map((milestone, index) => (
                <div key={milestone.id} className="flex gap-3">
                  <div className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs ${milestone.status === "Completado" ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-cb-line bg-cb-panel2 text-cb-muted"}`}>{index + 1}</div>
                  <div className="min-w-0 flex-1 border-b border-cb-line pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">{milestone.title}</div>
                      <span className={`rounded-full px-2 py-1 text-[11px] ${badge(milestone.status)}`}>{milestone.status}</span>
                    </div>
                    {milestone.dueDate && <div className="mt-1 text-xs text-cb-muted">{milestone.dueDate}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="mono-label">FILES & LINKS</div>
        <h2 className="mt-1 text-xl font-semibold">Documentos y entregas</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {currentProject.productionUrl && (
            <a href={currentProject.productionUrl} target="_blank" className="rounded-xl border border-cb-line bg-cb-bg p-4 transition hover:border-cb-amber">
              <Globe2 className="mb-3 text-cb-amber" size={20} />
              <div className="font-semibold">Sitio en produccion</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-cb-muted">Abrir enlace <ExternalLink size={12} /></div>
            </a>
          )}
          {(currentProject.documents ?? []).map(doc => (
            <a key={doc.id} href={doc.url} target="_blank" className="rounded-xl border border-cb-line bg-cb-bg p-4 transition hover:border-cb-amber">
              <FileText className="mb-3 text-cb-amber" size={20} />
              <div className="font-semibold">{doc.title}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-cb-muted">{doc.type} <ExternalLink size={12} /></div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
