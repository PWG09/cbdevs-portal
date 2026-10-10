"use client";

import { ArrowUpRight, CalendarClock, CheckCircle2, CircleDollarSign, FolderKanban, MessageSquare, Wrench } from "lucide-react";
import Link from "next/link";
import { useClientProjects } from "@/components/useClientProjects";
import type { Project } from "@/lib/types";

const money = (n: number, c: string) => new Intl.NumberFormat("es-MX", { style: "currency", currency: c }).format(n);

function progressFor(project: Project) {
  const milestones = project.milestones ?? [];
  if (milestones.length > 0) {
    return Math.round((milestones.filter(m => m.status === "Completado").length / milestones.length) * 100);
  }

  const fallback: Record<string, number> = {
    Cotizado: 10,
    "En desarrollo": 55,
    "En revisión": 82,
    Entregado: 100,
    "En mantenimiento": 100,
    "Pausado/Cancelado": 25,
  };

  return fallback[project.deliveryStatus] ?? 0;
}

function statusClass(status: string) {
  if (status === "Completado" || status === "Entregado" || status === "Pagado completo" || status === "Mantenimiento al día") return "bg-emerald-500/10 text-emerald-300";
  if (status === "En progreso" || status === "En desarrollo" || status === "En revisión") return "bg-cb-amber/10 text-cb-amber";
  if (status.includes("atrasado") || status.includes("Pausado")) return "bg-red-500/10 text-red-300";
  return "bg-cb-panel2 text-cb-muted";
}

export default function DashboardClient() {
  const { projects, currentProject, loading, live, error } = useClientProjects();

  if (loading) {
    return <div className="mx-auto max-w-[1300px] space-y-4"><div className="panel h-32 animate-pulse" /><div className="grid gap-4 md:grid-cols-3"><div className="panel h-36 animate-pulse" /><div className="panel h-36 animate-pulse" /><div className="panel h-36 animate-pulse" /></div></div>;
  }

  if (!currentProject) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="panel p-8">
          <div className="mono-label">CLIENT PORTAL</div>
          <h1 className="mt-2 text-3xl font-bold">{error ? "No se pudieron cargar los proyectos" : "Aún no hay proyectos vinculados"}</h1>
          <p className="mt-3 text-sm leading-6 text-cb-muted">{error || "Tu cuenta está activa, pero CBDEVS todavía no ha vinculado un proyecto a esta cuenta. Cuando esté listo, aquí verás avances, entregas, documentos y mensajes."}</p>
        </div>
      </div>
    );
  }

  const progress = progressFor(currentProject);
  const balance = Math.max(currentProject.amount - currentProject.initialPayment, 0);
  const completed = currentProject.milestones?.filter(m => m.status === "Completado").length ?? 0;
  const totalMilestones = currentProject.milestones?.length ?? 0;

  const cards = [
    { label: "Avance del proyecto", value: `${progress}%`, icon: FolderKanban, note: live ? "Datos de Supabase" : "Conexión no disponible" },
    { label: "Siguiente entrega", value: currentProject.estimatedDelivery, icon: CalendarClock, note: currentProject.deliveryStatus },
    { label: "Saldo estimado", value: money(balance, currentProject.currency), icon: CircleDollarSign, note: currentProject.paymentStatus },
    { label: "Hitos completados", value: `${completed}/${totalMilestones || 1}`, icon: CheckCircle2, note: "Checklist de trabajo" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="panel overflow-hidden p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mono-label">PROJECT / {currentProject.client}</div>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">{currentProject.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-cb-muted">{currentProject.notes || "Seguimiento centralizado del proyecto, entregas y comunicacion con CBDEVS."}</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(currentProject.deliveryStatus)}`}>{currentProject.deliveryStatus}</span>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs text-cb-muted">
              <span>Progreso general</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-cb-panel2">
              <div className="h-full rounded-full bg-cb-amber transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {currentProject.productionUrl && <a href={currentProject.productionUrl} target="_blank" className="btn-primary">Ver entrega <ArrowUpRight size={16} /></a>}
            <Link href="/chat" className="btn-ghost"><MessageSquare size={16} /> Mensajes</Link>
            {currentProject.nextMaintenanceDate && <Link href="/billing" className="btn-ghost"><Wrench size={16} /> Mantenimiento</Link>}
          </div>
        </section>

        <section className="panel p-5">
          <div className="mono-label">NEXT STEPS</div>
          <h2 className="mt-1 text-xl font-semibold">Proximos hitos</h2>
          <div className="mt-5 space-y-3">
            {(currentProject.milestones ?? []).map(milestone => (
              <div key={milestone.id} className="rounded-xl border border-cb-line bg-cb-bg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{milestone.title}</div>
                    {milestone.dueDate && <div className="mt-1 text-xs text-cb-muted">Fecha objetivo: {milestone.dueDate}</div>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${statusClass(milestone.status)}`}>{milestone.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="panel p-5">
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-cb-panel2 p-2.5 text-cb-amber"><Icon size={19} /></div>
                <ArrowUpRight size={16} className="text-slate-700" />
              </div>
              <div className="mt-5 text-2xl font-bold">{card.value}</div>
              <div className="mt-1 text-sm text-slate-300">{card.label}</div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-600">{card.note}</div>
            </div>
          );
        })}
      </div>

      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mono-label">ALL PROJECTS / {projects.length}</div>
            <h2 className="mt-1 text-xl font-semibold">Proyectos vinculados</h2>
          </div>
          <Link href="/projects" className="btn-ghost">Ver detalle</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map(project => (
            <article key={project.id} className="rounded-xl border border-cb-line bg-cb-bg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="mt-1 text-xs text-cb-muted">{project.serviceType}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] ${statusClass(project.deliveryStatus)}`}>{project.deliveryStatus}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
