"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarClock, CheckCircle2, CircleDollarSign, FileText, Flag, FolderKanban, MessageSquare, Wrench } from "lucide-react";
import { useClientProjects } from "@/components/useClientProjects";
import { useBilling } from "@/components/useBilling";
import NoProjectState from "@/components/NoProjectState";
import { EmptyState, ProgressBar, Skeleton, StatCard, StatusBadge } from "@/components/ui";
import { billingSummary, milestoneSummary, projectProgress } from "@/lib/project-metrics";
import { formatDate, formatMoney, relativeDays } from "@/lib/format";
import { safeExternalUrl } from "@/lib/safe-url";

export default function DashboardClient() {
  const { projects, currentProject, selectProject, loading, error, refresh } = useClientProjects();
  const billing = useBilling(currentProject ? [currentProject] : [], !loading);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1300px] space-y-5" aria-busy="true">
        <Skeleton className="h-52" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      </div>
    );
  }

  if (!currentProject) return <NoProjectState error={error} onRetry={() => void refresh()} />;

  const productionUrl = safeExternalUrl(currentProject.productionUrl);
  const progress = projectProgress(currentProject);
  const milestones = milestoneSummary(currentProject.milestones);
  const summary = billingSummary(currentProject, billing.payments);
  const recentDocuments = (currentProject.documents ?? []).filter((d) => safeExternalUrl(d.url)).slice(0, 3);
  const deliveryDate = currentProject.actualDelivery || currentProject.estimatedDelivery;
  const deliveryRelative = currentProject.actualDelivery ? "Entregado" : relativeDays(currentProject.estimatedDelivery);

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cb-amber/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="mono-label">{currentProject.serviceType} · {currentProject.client}</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{currentProject.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-cb-muted">{currentProject.notes || "Seguimiento centralizado de tu proyecto: avance, entregas, documentos y comunicación con el equipo de CBDEVS."}</p>
          </div>
          <StatusBadge status={currentProject.deliveryStatus} className="text-xs" />
        </div>

        <div className="relative mt-8 max-w-3xl">
          <div className="mb-2 flex items-center justify-between text-xs text-cb-muted">
            <span>Progreso general{milestones.total > 0 ? ` · ${milestones.completed} de ${milestones.total} hitos` : ""}</span>
            <span className="font-semibold text-slate-200">{progress === null ? "—" : `${progress}%`}</span>
          </div>
          <ProgressBar value={progress ?? 0} label="Progreso del proyecto" />
          {progress === null && <p className="mt-2 text-xs text-cb-muted">El avance se mostrará cuando el equipo publique los hitos del proyecto.</p>}
        </div>

        <div className="relative mt-6 flex flex-wrap gap-3">
          {productionUrl && <a href={productionUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">{currentProject.actualDelivery ? "Ver sitio entregado" : "Ver sitio en línea"} <ArrowUpRight size={16} aria-hidden /></a>}
          <Link href="/chat" className="btn-ghost"><MessageSquare size={16} aria-hidden /> Escribir al equipo</Link>
          <Link href="/projects" className="btn-ghost"><FolderKanban size={16} aria-hidden /> Ver detalle</Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarClock} label={currentProject.actualDelivery ? "Entregado el" : "Entrega estimada"} value={formatDate(deliveryDate)} note={deliveryRelative || undefined} />
        <StatCard icon={CheckCircle2} label="Hitos completados" value={milestones.total ? `${milestones.completed} / ${milestones.total}` : "—"} note={milestones.next ? `Siguiente: ${milestones.next.title}` : milestones.total ? "Todos los hitos completados" : "Hitos por publicar"} />
        <StatCard icon={CircleDollarSign} label="Saldo pendiente" value={billing.loading ? "…" : formatMoney(summary.balance, summary.currency)} note={billing.loading ? undefined : `Pagado: ${formatMoney(summary.paid, summary.currency)} de ${formatMoney(summary.total, summary.currency)}`} />
        <StatCard icon={Wrench} label="Mantenimiento" value={currentProject.monthlyMaintenance > 0 ? `${formatMoney(currentProject.monthlyMaintenance, currentProject.currency)}/mes` : "No contratado"} note={currentProject.nextMaintenanceDate ? `Próximo: ${formatDate(currentProject.nextMaintenanceDate)}` : undefined} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mono-label">Próximos pasos</div>
              <h2 className="mt-1 text-xl font-semibold">Siguientes hitos</h2>
            </div>
            <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-cb-amber hover:underline">Ver todos <ArrowRight size={14} aria-hidden /></Link>
          </div>
          <div className="mt-5 space-y-3">
            {milestones.upcoming.length === 0 ? (
              <EmptyState icon={Flag} title={milestones.total ? "Todo al día" : "Sin hitos publicados"} description={milestones.total ? "Todos los hitos del proyecto están completados." : "Cuando el equipo defina el plan de trabajo, verás aquí los siguientes hitos."} />
            ) : milestones.upcoming.map((milestone) => (
              <div key={milestone.id} className="flex items-start justify-between gap-3 rounded-xl border border-cb-line bg-cb-bg p-4">
                <div className="min-w-0">
                  <div className="font-semibold">{milestone.title}</div>
                  {milestone.dueDate && <div className="mt-1 text-xs text-cb-muted">Fecha objetivo: {formatDate(milestone.dueDate)} · {relativeDays(milestone.dueDate)}</div>}
                </div>
                <StatusBadge status={milestone.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="mono-label">Documentos</div>
          <h2 className="mt-1 text-xl font-semibold">Recientes</h2>
          <div className="mt-5 space-y-2">
            {recentDocuments.length === 0 ? (
              <EmptyState icon={FileText} title="Sin documentos todavía" description="Propuestas, contratos, facturas y entregables aparecerán aquí." />
            ) : recentDocuments.map((doc) => (
              <a key={doc.id} href={safeExternalUrl(doc.url)} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-cb-line bg-cb-bg p-3 transition hover:border-cb-amber/60">
                <div className="rounded-lg bg-cb-panel2 p-2 text-cb-amber"><FileText size={16} aria-hidden /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{doc.title}</div>
                  <div className="text-xs text-cb-muted">{doc.type} · {formatDate(doc.createdAt, "")}</div>
                </div>
                <ArrowUpRight size={15} className="text-cb-muted transition group-hover:text-cb-amber" aria-hidden />
              </a>
            ))}
          </div>
        </section>
      </div>

      {projects.length > 1 && (
        <section className="panel p-5 sm:p-6">
          <div className="mono-label">Tus proyectos · {projects.length}</div>
          <h2 className="mt-1 text-xl font-semibold">Todos los proyectos</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const value = projectProgress(project);
              const selected = project.id === currentProject.id;
              return (
                <button type="button" key={project.id} onClick={() => selectProject(project.id)} aria-pressed={selected}
                  className={`rounded-xl border p-4 text-left transition ${selected ? "border-cb-amber/60 bg-cb-amber/5" : "border-cb-line bg-cb-bg hover:border-slate-500"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{project.name}</h3>
                      <p className="mt-1 text-xs text-cb-muted">{project.serviceType}</p>
                    </div>
                    <StatusBadge status={project.deliveryStatus} />
                  </div>
                  <div className="mt-4"><ProgressBar value={value ?? 0} label={`Progreso de ${project.name}`} /></div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
