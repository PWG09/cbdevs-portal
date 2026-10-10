"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectDocument, ProjectMilestone } from "@/lib/types";

type ClientRow = {
  id: string;
  organization_id: string;
  linked_user_id: string;
  name: string;
  email: string;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  client_id: string;
  client_name: string;
  name: string;
  service_type: string | null;
  delivery_status: string | null;
  payment_status: string | null;
  currency: string | null;
  amount: number | string | null;
  initial_payment: number | string | null;
  monthly_maintenance: number | string | null;
  start_date: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  next_maintenance_date: string | null;
  responsible_user_ids: string[] | null;
  notes: string | null;
  repo_url: string | null;
  production_url: string | null;
  proposal_url: string | null;
  updated_at: string | null;
};

const asNumber = (value: number | string | null | undefined) => {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const dateOrEmpty = (value: string | null | undefined) => value ?? "";

function mapProject(row: ProjectRow, clientName: string): Project {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    name: row.name,
    client: clientName || row.client_name || "Cliente",
    serviceType: row.service_type ?? "Sitio Web",
    deliveryStatus: row.delivery_status ?? "Cotizado",
    paymentStatus: row.payment_status ?? "Pendiente",
    currency: row.currency ?? "MXN",
    amount: asNumber(row.amount),
    initialPayment: asNumber(row.initial_payment),
    monthlyMaintenance: asNumber(row.monthly_maintenance),
    startDate: dateOrEmpty(row.start_date),
    estimatedDelivery: dateOrEmpty(row.estimated_delivery),
    actualDelivery: row.actual_delivery ?? undefined,
    nextMaintenanceDate: row.next_maintenance_date ?? undefined,
    responsibleIds: row.responsible_user_ids ?? [],
    notes: row.notes ?? "",
    repoUrl: row.repo_url ?? undefined,
    productionUrl: row.production_url ?? undefined,
    proposalUrl: row.proposal_url ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    milestones: [],
    documents: [],
  };
}

export function useClientProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  const loadProjects = useCallback(async () => {
    const requestId = ++requestVersion.current;
    const isCurrent = () => requestVersion.current === requestId;
    const supabase = createClient();
    setError("");

    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (!isCurrent()) return;
    if (userError || !userResult.user) {
      setProjects([]);
      setLive(false);
      setLoading(false);
      if (userError) setError("No pudimos verificar tu sesión. Vuelve a iniciar sesión.");
      return;
    }

    const { data: clients, error: clientError } = await supabase
      .from("cbdevs_clients")
      .select("id, organization_id, linked_user_id, name, email")
      .eq("linked_user_id", userResult.user.id)
      .eq("active", true);
    if (!isCurrent()) return;

    if (clientError) {
      console.error("[Portal] Client lookup failed:", clientError.code);
      setProjects([]);
      setLive(false);
      setLoading(false);
      setError("No se pudieron cargar tus datos. Intenta nuevamente más tarde.");
      return;
    }

    const clientRows = (clients ?? []) as ClientRow[];
    if (clientRows.length === 0) {
      setProjects([]);
      setLive(true);
      setLoading(false);
      return;
    }

    const clientIds = clientRows.map((client) => client.id);
    const clientNames = new Map(clientRows.map((client) => [client.id, client.name]));
    const { data: projectData, error: projectError } = await supabase
      .from("cbdevs_projects")
      .select("id, organization_id, client_id, client_name, name, service_type, delivery_status, payment_status, currency, amount, initial_payment, monthly_maintenance, start_date, estimated_delivery, actual_delivery, next_maintenance_date, responsible_user_ids, notes, repo_url, production_url, proposal_url, updated_at")
      .in("client_id", clientIds)
      .order("estimated_delivery", { ascending: true, nullsFirst: false });
    if (!isCurrent()) return;

    if (projectError) {
      console.error("[Portal] Project query failed:", projectError.code);
      setProjects([]);
      setLive(false);
      setLoading(false);
      setError("No se pudieron cargar los proyectos vinculados a tu cuenta.");
      return;
    }

    const rows = (projectData ?? []) as ProjectRow[];
    if (rows.length === 0) {
      setProjects([]);
      setLive(true);
      setLoading(false);
      return;
    }

    const projectIds = rows.map((project) => project.id);
    const [milestoneResult, documentResult] = await Promise.all([
      supabase
        .from("cbdevs_project_milestones")
        .select("id, project_id, title, status, due_date, sort_order")
        .in("project_id", projectIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("cbdevs_project_documents")
        .select("id, project_id, title, url, document_type, created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false }),
    ]);
    if (!isCurrent()) return;

    if (milestoneResult.error || documentResult.error) {
      console.error("[Portal] Project details query failed:", {
        milestones: milestoneResult.error?.code,
        documents: documentResult.error?.code,
      });
      setProjects([]);
      setLive(false);
      setLoading(false);
      setError("Faltan aplicar cambios de base de datos del portal. Contacta al equipo de CBDEVS.");
      return;
    }

    const milestonesByProject = new Map<string, ProjectMilestone[]>();
    for (const row of (milestoneResult.data ?? []) as Array<{
      id: string; project_id: string; title: string; status: string; due_date: string | null; sort_order: number;
    }>) {
      const current = milestonesByProject.get(row.project_id) ?? [];
      current.push({ id: row.id, title: row.title, status: row.status, dueDate: row.due_date ?? undefined, sortOrder: row.sort_order });
      milestonesByProject.set(row.project_id, current);
    }

    const documentsByProject = new Map<string, ProjectDocument[]>();
    for (const row of (documentResult.data ?? []) as Array<{
      id: string; project_id: string; title: string; url: string; document_type: string; created_at: string;
    }>) {
      const current = documentsByProject.get(row.project_id) ?? [];
      current.push({ id: row.id, title: row.title, url: row.url, type: row.document_type, createdAt: row.created_at });
      documentsByProject.set(row.project_id, current);
    }

    setProjects(rows.map((row) => ({
      ...mapProject(row, clientNames.get(row.client_id) ?? row.client_name),
      milestones: milestonesByProject.get(row.id) ?? [],
      documents: documentsByProject.get(row.id) ?? [],
    })));
    setLive(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    const run = async () => {
      if (!mounted) return;
      setLoading(true);
      try {
        await loadProjects();
      } catch (cause) {
        console.error("[Portal] Unexpected project loading failure:", cause);
        if (mounted) {
          setError("Ocurrió un error inesperado al cargar el portal.");
          setProjects([]);
          setLive(false);
          setLoading(false);
        }
      }
    };

    void run();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void run();
    });
    const onFocus = () => { void run(); };
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      requestVersion.current += 1;
      authListener.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [loadProjects]);

  const currentProject = projects[0] ?? null;
  return { projects, currentProject, loading, live, error, refresh: loadProjects };
}