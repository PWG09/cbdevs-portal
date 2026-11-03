"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ChevronDown, CreditCard, FolderKanban, LogOut, Menu, MessageSquare, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { initialsFrom } from "@/lib/format";
import { useClientProjects } from "@/components/useClientProjects";
import { useViewer } from "@/components/ViewerContext";
import BrandMark from "@/components/BrandMark";

const items = [
  { href: "/dashboard", label: "Resumen", icon: BarChart3 },
  { href: "/projects", label: "Proyecto", icon: FolderKanban },
  { href: "/billing", label: "Pagos", icon: CreditCard },
  { href: "/chat", label: "Mensajes", icon: MessageSquare },
  { href: "/settings", label: "Perfil", icon: Settings },
];

function ProjectSwitcher() {
  const { projects, currentProject, selectProject } = useClientProjects();
  if (projects.length < 2 || !currentProject) return null;
  return (
    <label className="relative flex min-w-0 items-center">
      <span className="sr-only">Proyecto activo</span>
      <select
        className="max-w-[220px] appearance-none truncate rounded-xl border border-cb-line bg-cb-panel py-2 pl-3 pr-9 text-sm font-medium text-slate-100 outline-none transition hover:border-slate-500 focus-visible:border-cb-amber sm:max-w-[280px]"
        value={currentProject.id}
        onChange={(event) => selectProject(event.target.value)}
      >
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 text-cb-muted" aria-hidden />
    </label>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/dashboard";
  const router = useRouter();
  const viewer = useViewer();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!viewer) return;
    let active = true;
    const supabase = createClient();
    void Promise.all([
      supabase.from("profiles").select("display_name").eq("id", viewer.userId).maybeSingle(),
      supabase.from("cbdevs_clients").select("name").eq("linked_user_id", viewer.userId).eq("active", true).limit(1).maybeSingle(),
    ]).then(([{ data: profile }, { data: client }]) => {
      if (!active) return;
      setName(profile?.display_name?.trim() || client?.name?.trim() || viewer.email.split("@")[0] || "Cliente");
    }).catch(() => {
      if (active) setName(viewer.email.split("@")[0] || "Cliente");
    });
    return () => { active = false; };
  }, [viewer]);

  // Close the mobile drawer on navigation and with Escape.
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const displayName = name || "Cliente";
  const initials = initialsFrom(displayName);
  const roleLabel = viewer?.isGlobalAdmin ? "Equipo CBDEVS" : "Cliente";
  const current = items.find((item) => path === item.href || path.startsWith(`${item.href}/`));

  return (
    <div className="min-h-screen bg-cb-bg">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-cb-amber focus:px-3 focus:py-2 focus:text-black">Saltar al contenido</a>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-cb-line bg-cb-panel p-4 transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Menú lateral"
      >
        <div className="flex items-center justify-between px-2 py-3">
          <Link href="/dashboard"><BrandMark /></Link>
          <button type="button" className="rounded-lg p-2 text-cb-muted hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={18} /></button>
        </div>
        <div className="my-5 h-px bg-cb-line" />
        <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[.2em] text-slate-500">Portal cliente</div>
        <nav className="space-y-1" aria-label="Navegación principal">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item === current;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-cb-amber/10 text-cb-amber" : "text-slate-400 hover:bg-cb-panel2 hover:text-white"}`}>
                <Icon size={18} aria-hidden />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-cb-line bg-cb-bg p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cb-amber/15 font-mono text-xs text-cb-amber" aria-hidden>{initials}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{displayName}</div>
              <div className="text-xs text-cb-muted">{roleLabel}</div>
            </div>
            <button type="button" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión" className="ml-auto rounded-lg p-2 text-slate-500 transition hover:bg-cb-panel2 hover:text-white"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {open && <button type="button" className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-cb-line bg-cb-bg/85 px-4 backdrop-blur lg:px-8">
          <button type="button" className="rounded-lg p-2 text-slate-300 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open}><Menu /></button>
          <div className="hidden font-mono text-xs uppercase tracking-wider text-slate-500 sm:block">Portal / {current?.label ?? "Resumen"}</div>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <ProjectSwitcher />
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-cb-line bg-cb-panel font-mono text-xs text-cb-amber" title={displayName} aria-hidden>{initials}</div>
          </div>
        </header>
        <main id="contenido" className="p-4 pb-16 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
