"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CreditCard, FolderKanban, MessageSquare, Settings, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const items = [
  { href: "/dashboard", label: "Resumen", icon: BarChart3 },
  { href: "/projects", label: "Mi proyecto", icon: FolderKanban },
  { href: "/billing", label: "Pagos", icon: CreditCard },
  { href: "/chat", label: "Mensajes", icon: MessageSquare },
  { href: "/settings", label: "Perfil", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Cliente");

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadProfile() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || !active) return;

      const [{ data: profile }, { data: client }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", auth.user.id).maybeSingle(),
        supabase.from("cbdevs_clients").select("name").eq("linked_user_id", auth.user.id).eq("active", true).limit(1).maybeSingle(),
      ]);
      if (!active) return;
      const displayName = profile?.display_name?.trim() || client?.name?.trim() || auth.user.email?.split("@")[0] || "Cliente";
      setName(displayName);
    }

    void loadProfile();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void loadProfile(); });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "C";

  return (
    <div className="min-h-screen bg-cb-bg">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-cb-line bg-cb-panel p-4 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2 py-3">
          <Link href="/dashboard" className="font-mono text-lg font-bold">CB<span className="text-cb-amber">|</span>DEVS</Link>
          <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={18}/></button>
        </div>
        <div className="my-5 h-px bg-cb-line" />
        <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[.2em] text-slate-600">Portal cliente</div>
        <nav className="space-y-1" aria-label="Navegación principal">
          {items.map((item) => {
            const Icon = item.icon;
            const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-cb-amber/10 text-cb-amber" : "text-slate-400 hover:bg-cb-panel2 hover:text-white"}`}>
                <Icon size={18}/>{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-cb-line bg-cb-bg p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cb-amber/15 font-mono text-xs text-cb-amber">{initials}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="text-xs text-cb-muted">Cliente</div>
            </div>
            <button type="button" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión" className="ml-auto rounded-lg p-2 text-slate-500 hover:text-white"><LogOut size={16}/></button>
          </div>
        </div>
      </aside>

      {open && <button type="button" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-cb-line bg-cb-bg/90 px-4 backdrop-blur lg:px-8">
          <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu /></button>
          <div className="hidden font-mono text-xs text-slate-600 sm:block">CBDEVS / PORTAL / {path.replace("/", "") || "resumen"}</div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-300 sm:block">{name}</span>
            <div className="grid h-8 w-8 place-items-center rounded-full border border-cb-line bg-cb-panel font-mono text-xs text-cb-amber">{initials}</div>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}