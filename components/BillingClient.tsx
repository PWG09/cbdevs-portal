"use client";

import { CircleDollarSign, CreditCard, ExternalLink, Info, ReceiptText, Wallet, Wrench } from "lucide-react";
import { useClientProjects } from "@/components/useClientProjects";
import { useBilling } from "@/components/useBilling";
import NoProjectState from "@/components/NoProjectState";
import { EmptyState, ErrorBanner, PageHeader, ProgressBar, Skeleton, StatCard, StatusBadge } from "@/components/ui";
import { billingSummary } from "@/lib/project-metrics";
import { formatDate, formatMoney } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/status";

export default function BillingClient() {
  const { projects, currentProject, loading: projectsLoading, error: projectError, refresh } = useClientProjects();
  const { payments, links, loading, error } = useBilling(projects, !projectsLoading);

  if (projectsLoading) return <div className="mx-auto max-w-[1100px] space-y-5" aria-busy="true"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  if (!currentProject) return <NoProjectState error={projectError} onRetry={() => void refresh()} />;

  const summary = billingSummary(currentProject, payments);
  const paidPercent = summary.total > 0 ? (summary.paid / summary.total) * 100 : 0;
  const projectPayments = payments.filter((p) => p.projectId === currentProject.id);
  const accountPayments = payments.filter((p) => !p.projectId);
  const projectLinks = links.filter((l) => l.projectId === currentProject.id || !l.projectId);
  const shownPayments = [...projectPayments, ...accountPayments];

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader eyebrow={`Pagos · ${currentProject.name}`} title="Pagos y facturación" description="Saldo del proyecto, historial de pagos registrados y enlaces de pago activos." />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {projectLinks.length > 0 && (
        <section className="panel border-cb-amber/40 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-cb-amber"><CreditCard size={18} aria-hidden /><span className="mono-label">Pago pendiente</span></div>
          <div className="mt-4 divide-y divide-cb-line">
            {projectLinks.map((link) => (
              <div key={link.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-2xl font-bold tracking-tight">{formatMoney(link.amount, link.currency)}</div>
                  <div className="mt-1 text-xs text-cb-muted">Enviado el {formatDate(link.createdAt)}{link.expiresAt ? ` · Vence el ${formatDate(link.expiresAt)}` : ""}</div>
                </div>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="btn-primary w-full sm:w-fit">Pagar de forma segura <ExternalLink size={14} aria-hidden /></a>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-cb-muted">El pago se procesa en la plataforma del proveedor. Su confirmación puede tardar unos minutos en reflejarse aquí.</p>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Total del proyecto" value={formatMoney(summary.total, summary.currency)} />
        <StatCard icon={ReceiptText} label="Pagado" value={loading ? "…" : formatMoney(summary.paid, summary.currency)} note={loading ? undefined : `${summary.paidCount} pago${summary.paidCount === 1 ? "" : "s"} registrado${summary.paidCount === 1 ? "" : "s"}`} />
        <StatCard icon={CircleDollarSign} label="Saldo pendiente" value={loading ? "…" : formatMoney(summary.balance, summary.currency)} note={currentProject.paymentStatus} />
        <StatCard icon={Wrench} label="Mantenimiento" value={currentProject.monthlyMaintenance > 0 ? `${formatMoney(currentProject.monthlyMaintenance, currentProject.currency)}/mes` : "No contratado"} note={currentProject.nextMaintenanceDate ? `Próximo cobro: ${formatDate(currentProject.nextMaintenanceDate)}` : undefined} />
      </div>

      {summary.total > 0 && !loading && (
        <section className="panel p-5">
          <div className="mb-2 flex justify-between text-sm"><span className="text-cb-muted">Pagado del total</span><span className="font-semibold">{Math.round(paidPercent)}%</span></div>
          <ProgressBar value={paidPercent} label="Porcentaje pagado del proyecto" />
          <div className="mt-3 flex items-start gap-2 text-xs text-cb-muted">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Calculado con los pagos confirmados por CBDEVS. {currentProject.initialPayment > 0 && `Anticipo acordado: ${formatMoney(currentProject.initialPayment, currentProject.currency)}.`}
              {summary.hasMixedCurrency && " Hay pagos en otra moneda que no se suman a este total."}
              {summary.pending > 0 && ` Pagos en proceso: ${formatMoney(summary.pending, summary.currency)}.`}
            </span>
          </div>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="border-b border-cb-line p-5"><div className="mono-label">Historial</div><h2 className="mt-1 text-xl font-semibold">Pagos registrados</h2></div>
        {loading ? (
          <div className="space-y-2 p-5" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : shownPayments.length === 0 ? (
          <div className="p-5"><EmptyState icon={ReceiptText} title="Sin pagos registrados" description="Cuando CBDEVS confirme un pago para este proyecto aparecerá aquí con su fecha y estado." /></div>
        ) : (
          <>
            <div className="scrollbar hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Historial de pagos</caption>
                <thead className="bg-cb-panel2 text-xs uppercase tracking-wider text-slate-400">
                  <tr><th scope="col" className="p-4 font-medium">Concepto</th><th scope="col" className="p-4 font-medium">Fecha</th><th scope="col" className="p-4 font-medium">Estado</th><th scope="col" className="p-4 text-right font-medium">Monto</th></tr>
                </thead>
                <tbody>
                  {shownPayments.map((payment) => (
                    <tr key={payment.id} className="border-t border-cb-line">
                      <td className="p-4"><div className="font-semibold">{payment.description}</div>{!payment.projectId && <div className="text-xs text-cb-muted">Pago general de la cuenta</div>}{payment.reference && <div className="font-mono text-[11px] text-slate-500">Ref. {payment.reference}</div>}</td>
                      <td className="p-4 text-cb-muted">{formatDate(payment.paidAt ?? payment.createdAt, "Sin fecha")}</td>
                      <td className="p-4"><StatusBadge status={payment.status} label={paymentStatusLabel(payment.status)} /></td>
                      <td className="p-4 text-right font-semibold tabular-nums">{formatMoney(payment.amount, payment.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-cb-line sm:hidden">
              {shownPayments.map((payment) => (
                <li key={payment.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="font-semibold">{payment.description}</div>
                    <div className="mt-1 text-xs text-cb-muted">{formatDate(payment.paidAt ?? payment.createdAt, "Sin fecha")}</div>
                    <StatusBadge status={payment.status} label={paymentStatusLabel(payment.status)} className="mt-2" />
                  </div>
                  <div className="font-semibold tabular-nums">{formatMoney(payment.amount, payment.currency)}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
