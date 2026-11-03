"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, FileText, Flag, Globe2, ScrollText } from "lucide-react";
import { useClientProjects } from "@/components/useClientProjects";
import NoProjectState from "@/components/NoProjectState";
import { EmptyState, PageHeader, ProgressBar, Skeleton, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney, relativeDays } from "@/lib/format";
import { milestoneSummary, projectProgress } from "@/lib/project-metrics";
import { safeExternalUrl } from "@/lib/safe-url";
import { isCompletedMilestone, normalizeStatus } from "@/lib/status";

const DOC_FILTERS = ["Todos", "Propuesta", "Contrato", "Factura", "Entrega", "Otro"] as const;

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cb-line bg-cb-bg p-4">
      <dt className="text-xs text-cb-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

export default function ProjectsClient() {
  const { currentProject, loading, error, refresh } = useClientProjects();
  const [filter, setFilter] = useState<(typeof DOC_FILTERS)[number]>("Todos");

  const documents = useMemo(() => (currentProject?.documents ?? [])
    .map((doc) => ({ ...doc, safeUrl: safeExternalUrl(doc.url) }))
    .filter((doc): doc is typeof doc & { safeUrl: string } => Boolean(doc.safeUrl)), [currentProject]);

  if (loading) return <div className="mx-auto max-w-[1200px] space-y-5" aria-busy="true"><Skeleton className="h-24" /><Skeleton className="h-96" /></div>;
  if (!currentProject) return <NoProjectState error={error} onRetry={() => void refresh()} />;

  const productionUrl = safeExternalUrl(currentProject.productionUrl);
  const proposalUrl = safeExternalUrl(currentProject.proposalUrl);
  const progress = projectProgress(currentProject);
  const summary = milestoneSummary(currentProject.milestones);
  const milestones = [...(currentProject.milestones ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const visibleDocs = filter === "Todos" ? documents : documents.filter((doc) => doc.type === filter);
  const availableFilters = DOC_FILTERS.filter((type) => type === "Todos" || documents.some((doc) => doc.type === type));

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader eyebrow={`${currentProject.serviceType} · ${currentProject.client}`} title={currentProject.name} description="Avance, plan de trabajo, entregables y documentos de tu proyecto." actions={<StatusBadge status={currentProject.deliveryStatus} className="text-xs" />} />

      <section className="panel p-5 sm:p-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-cb-muted">Avance general</span>
          <span className="font-semibold">{progress === null ? "Por definir" : `${progress}%`}</span>
        </div>
        <ProgressBar value={progress ?? 0} label="Avance del proyecto" />
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Inicio" value={formatDate(currentProject.startDate)} />
          <Detail label="Entrega estimada" value={formatDate(currentProject.estimatedDelivery)} />
          <Detail label="Entrega real" value={formatDate(currentProject.actualDelivery, "Pendiente")} />
          <Detail label="Mantenimiento" value={currentProject.monthlyMaintenance > 0 ? `${formatMoney(currentProject.monthlyMaintenance, currentProject.currency)}/mes` : "No contratado"} />
        </dl>
        {currentProject.notes && <p className="mt-6 whitespace-pre-line rounded-xl border border-cb-line bg-cb-bg p-4 text-sm leading-6 text-slate-300">{currentProject.notes}</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mono-label">Plan de trabajo</div>
              <h2 className="mt-1 text-xl font-semibold">Hitos</h2>
            </div>
            {summary.total > 0 && <span className="text-sm text-cb-muted">{summary.completed} de {summary.total} completados</span>}
          </div>
          {milestones.length === 0 ? (
            <div className="mt-5"><EmptyState icon={Flag} title="Hitos por publicar" description="El equipo publicará aquí las etapas del proyecto y sus fechas objetivo." /></div>
          ) : (
            <ol className="mt-6">
              {milestones.map((milestone, index) => {
                const done = isCompletedMilestone(milestone.status);
                const inProgress = normalizeStatus(milestone.status) === "en progreso";
                const last = index === milestones.length - 1;
                return (
                  <li key={milestone.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {!last && <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px ${done ? "bg-emerald-400/40" : "bg-cb-line"}`} aria-hidden />}
                    <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold ${done ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300" : inProgress ? "border-cb-amber/60 bg-cb-amber/10 text-cb-amber" : "border-cb-line bg-cb-panel2 text-cb-muted"}`} aria-hidden>
                      {done ? <Check size={15} /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className={`font-semibold ${done ? "text-slate-300" : ""}`}>{milestone.title}</div>
                        <StatusBadge status={milestone.status} />
                      </div>
                      {milestone.dueDate && <div className="mt-1 text-xs text-cb-muted">{formatDate(milestone.dueDate)}{!done ? ` · ${relativeDays(milestone.dueDate)}` : ""}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="mono-label">Archivos y enlaces</div>
          <h2 className="mt-1 text-xl font-semibold">Documentos y entregas</h2>

          {(productionUrl || proposalUrl) && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {productionUrl && (
                <a href={productionUrl} target="_blank" rel="noopener noreferrer" className="group rounded-xl border border-cb-amber/30 bg-cb-amber/5 p-4 transition hover:border-cb-amber">
                  <Globe2 className="mb-3 text-cb-amber" size={20} aria-hidden />
                  <div className="font-semibold">Sitio en línea</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-cb-muted">Abrir <ExternalLink size={12} aria-hidden /></div>
                </a>
              )}
              {proposalUrl && (
                <a href={proposalUrl} target="_blank" rel="noopener noreferrer" className="group rounded-xl border border-cb-line bg-cb-bg p-4 transition hover:border-cb-amber/60">
                  <ScrollText className="mb-3 text-cb-amber" size={20} aria-hidden />
                  <div className="font-semibold">Propuesta del proyecto</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-cb-muted">Abrir <ExternalLink size={12} aria-hidden /></div>
                </a>
              )}
            </div>
          )}

          {documents.length > 0 && availableFilters.length > 2 && (
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar documentos por tipo">
              {availableFilters.map((type) => (
                <button key={type} type="button" onClick={() => setFilter(type)} aria-pressed={filter === type}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filter === type ? "border-cb-amber bg-cb-amber/10 text-cb-amber" : "border-cb-line text-cb-muted hover:text-white"}`}>{type}</button>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {documents.length === 0 ? (
              <EmptyState icon={FileText} title="Sin documentos todavía" description="Propuestas, contratos, facturas y entregables aparecerán aquí cuando el equipo los comparta." />
            ) : visibleDocs.map((doc) => (
              <a key={doc.id} href={doc.safeUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-cb-line bg-cb-bg p-3 transition hover:border-cb-amber/60">
                <div className="rounded-lg bg-cb-panel2 p-2 text-cb-amber"><FileText size={16} aria-hidden /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{doc.title}</div>
                  <div className="text-xs text-cb-muted">{doc.type}{doc.createdAt ? ` · ${formatDate(doc.createdAt)}` : ""}</div>
                </div>
                <ExternalLink size={14} className="text-cb-muted transition group-hover:text-cb-amber" aria-hidden />
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
