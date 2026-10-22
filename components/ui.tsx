import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { statusTone, toneClasses } from "@/lib/status";

export function StatusBadge({ status, label, className = "" }: { status: string; label?: string; className?: string }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses[statusTone(status)]} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label ?? status}
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-cb-panel2" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped}>
      <div className="h-full rounded-full bg-gradient-to-r from-cb-amber to-amber-300 transition-[width] duration-700" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="mono-label">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-cb-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-cb-line px-6 py-10 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-cb-panel2 text-cb-amber"><Icon size={20} aria-hidden /></div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-cb-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note?: string }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-cb-panel2 p-2.5 text-cb-amber"><Icon size={18} aria-hidden /></div>
        <div className="text-sm text-cb-muted">{label}</div>
      </div>
      <div className="mt-4 truncate text-2xl font-bold tracking-tight">{value}</div>
      {note && <div className="mt-1.5 truncate text-xs text-cb-muted">{note}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl border border-cb-line bg-cb-panel ${className}`} aria-hidden />;
}
