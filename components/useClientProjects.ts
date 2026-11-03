"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

type MilestoneRow = { id: string; project_id: string; title: string; status: string; due_date: string | null; sort_order: number };
type DocumentRow = { id: string; project_id: string; title: string; url: string; document_type: string; created_at: string };

const PROJECT_COLUMNS =
  "id, organization_id, client_id, client_name, name, service_type, delivery_status, payment_status, currency, amount, initial_payment, monthly_maintenance, start_date, estimated_delivery, actual_delivery, next_maintenance_date, responsible_user_ids, notes, repo_url, production_url, proposal_url, updated_at";
const SELECTED_PROJECT_KEY = "cbdevs-portal:selected-project";
const MAX_PROJECTS = 50;

const asNumber = (value: number | string | null | undefined) => {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
    startDate: row.start_date ?? "",
    estimatedDelivery: row.estimated_delivery ?? "",
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

function readStoredSelection(): string | null {
  try {
    return window.localStorage.getItem(SELECTED_PROJECT_KEY);
  } catch {
    return null;
  }
}

function storeSelection(id: string) {
  try {
    window.localStorage.setItem(SELECTED_PROJECT_KEY, id);
  } catch {
    // Storage can be unavailable (private mode); the selection still works for this session.
  }
}

interface ProjectsState {
  projects: Project[];
  /** The project the client is currently viewing (null when no linked projects). */
  currentProject: Project | null;
  selectProject: (id: string) => void;
  loading: boolean;
  /** True when the data came from a successful authorized query (empty lists included). */
  live: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsState | null>(null);

type LoadResult = { projects: Project[]; live: boolean; error: string };

async function fetchClientProjects(): Promise<LoadResult> {
  const supabase = createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) {
    return { projects: [], live: false, error: userError ? "No pudimos verificar tu sesión. Vuelve a iniciar sesión." : "" };
  }

  // Ownership is resolved from the authenticated user ID only; RLS enforces the same rule.
  const { data: clients, error: clientError } = await supabase
    .from("cbdevs_clients")
    .select("id, organization_id, linked_user_id, name, email")
    .eq("linked_user_id", userResult.user.id)
    .eq("active", true);
  if (clientError) {
    console.error("[Portal] Client lookup failed:", clientError.code);
    return { projects: [], live: false, error: "No se pudieron cargar tus datos. Intenta nuevamente más tarde." };
  }

  const clientRows = (clients ?? []) as ClientRow[];
  if (clientRows.length === 0) return { projects: [], live: true, error: "" };

  const clientNames = new Map(clientRows.map((client) => [client.id, client.name]));
  const { data: projectData, error: projectError } = await supabase
    .from("cbdevs_projects")
    .select(PROJECT_COLUMNS)
    .in("client_id", clientRows.map((client) => client.id))
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(MAX_PROJECTS);
  if (projectError) {
    console.error("[Portal] Project query failed:", projectError.code);
    return { projects: [], live: false, error: "No se pudieron cargar los proyectos vinculados a tu cuenta." };
  }

  const rows = (projectData ?? []) as ProjectRow[];
  if (rows.length === 0) return { projects: [], live: true, error: "" };

  const projectIds = rows.map((project) => project.id);
  const [milestoneResult, documentResult] = await Promise.all([
    supabase
      .from("cbdevs_project_milestones")
      .select("id, project_id, title, status, due_date, sort_order")
      .in("project_id", projectIds)
      .order("sort_order", { ascending: true })
      .limit(500),
    supabase
      .from("cbdevs_project_documents")
      .select("id, project_id, title, url, document_type, created_at")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (milestoneResult.error || documentResult.error) {
    console.error("[Portal] Project details query failed:", {
      milestones: milestoneResult.error?.code,
      documents: documentResult.error?.code,
    });
    return { projects: [], live: false, error: "Faltan aplicar cambios de base de datos del portal. Contacta al equipo de CBDEVS." };
  }

  const milestonesByProject = new Map<string, ProjectMilestone[]>();
  for (const row of (milestoneResult.data ?? []) as MilestoneRow[]) {
    const list = milestonesByProject.get(row.project_id) ?? [];
    list.push({ id: row.id, title: row.title, status: row.status, dueDate: row.due_date ?? undefined, sortOrder: row.sort_order });
    milestonesByProject.set(row.project_id, list);
  }

  const documentsByProject = new Map<string, ProjectDocument[]>();
  for (const row of (documentResult.data ?? []) as DocumentRow[]) {
    const list = documentsByProject.get(row.project_id) ?? [];
    list.push({ id: row.id, title: row.title, url: row.url, type: row.document_type, createdAt: row.created_at });
    documentsByProject.set(row.project_id, list);
  }

  return {
    projects: rows.map((row) => ({
      ...mapProject(row, clientNames.get(row.client_id) ?? row.client_name),
      milestones: milestonesByProject.get(row.id) ?? [],
      documents: documentsByProject.get(row.id) ?? [],
    })),
    live: true,
    error: "",
  };
}

/** Loads the signed-in client's projects once for every protected page. */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);
  const lastLoadedAt = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestVersion.current;
    try {
      const result = await fetchClientProjects();
      if (requestVersion.current !== requestId) return;
      setProjects(result.projects);
      setLive(result.live);
      setError(result.error);
      lastLoadedAt.current = Date.now();
      setSelectedId((current) => {
        const ids = new Set(result.projects.map((p) => p.id));
        if (current && ids.has(current)) return current;
        const stored = readStoredSelection();
        if (stored && ids.has(stored)) return stored;
        return result.projects[0]?.id ?? null;
      });
    } catch (cause) {
      if (requestVersion.current !== requestId) return;
      console.error("[Portal] Unexpected project loading failure:", cause instanceof Error ? cause.message : "unknown");
      setProjects([]);
      setLive(false);
      setError("Ocurrió un error inesperado al cargar el portal.");
    } finally {
      if (requestVersion.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "SIGNED_OUT") void load();
    });
    // Refresh when the client returns to the tab, at most once per minute.
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoadedAt.current > 60_000) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      requestVersion.current += 1;
      authListener.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const selectProject = useCallback((id: string) => {
    setSelectedId((current) => {
      if (!projects.some((p) => p.id === id)) return current;
      storeSelection(id);
      return id;
    });
  }, [projects]);

  const value = useMemo<ProjectsState>(() => ({
    projects,
    currentProject: projects.find((p) => p.id === selectedId) ?? projects[0] ?? null,
    selectProject,
    loading,
    live,
    error,
    refresh: load,
  }), [projects, selectedId, selectProject, loading, live, error, load]);

  return createElement(ProjectsContext.Provider, { value }, children);
}

export function useClientProjects(): ProjectsState {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error("useClientProjects must be used inside ProjectsProvider");
  return context;
}
