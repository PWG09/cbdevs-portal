"use client";

import { useEffect, useState } from "react";
import { Save, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    async function load() {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) {
        setError("No se pudo verificar tu sesión. Vuelve a iniciar sesión.");
        setLoading(false);
        return;
      }
      const [{ data: profile }, { data: client }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", auth.user.id).maybeSingle(),
        supabase.from("cbdevs_clients").select("name").eq("linked_user_id", auth.user.id).eq("active", true).limit(1).maybeSingle(),
      ]);
      if (!active) return;
      setName(profile?.display_name?.trim() || client?.name?.trim() || String(auth.user.user_metadata?.display_name ?? "") || "");
      setEmail(auth.user.email ?? "");
      setLoading(false);
    }
    void load().catch(() => {
      if (active) { setError("No se pudo cargar tu perfil."); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      setError("El nombre debe tener entre 2 y 100 caracteres.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError("");
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
      setSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
    if (authError) {
      setError("No se pudo guardar el nombre. Inténtalo de nuevo.");
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: auth.user.id,
      display_name: trimmed,
      email: auth.user.email ?? email,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (profileError) {
      console.error("[Settings] Profile row update failed:", profileError.code);
      // Auth metadata is already saved. Keep the success truthful but explain profile sync.
      setError("El nombre se guardó en tu cuenta, pero no se pudo sincronizar el perfil del portal.");
      setSaving(false);
      return;
    }

    setName(trimmed);
    setSaved(true);
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-[800px] space-y-5">
      <div><div className="mono-label">ACCOUNT / SETTINGS</div><h1 className="mt-1 text-3xl font-bold">Perfil y configuración</h1><p className="mt-1 text-sm text-cb-muted">Actualiza tu nombre visible. Los permisos de la cuenta solo los puede cambiar el equipo autorizado.</p></div>
      <section className="panel p-6">
        {loading ? <p className="text-sm text-cb-muted">Cargando perfil...</p> : <form onSubmit={save}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm"><span className="mb-2 block text-slate-300">Nombre visible</span><input className="input" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required /></label>
            <label className="text-sm"><span className="mb-2 block text-slate-300">Correo</span><input className="input opacity-60" value={email} readOnly aria-readonly="true" /></label>
            <label className="text-sm"><span className="mb-2 block text-slate-300">Rol</span><input className="input opacity-60" value="Cliente" readOnly aria-readonly="true" /></label>
          </div>
          {error && <p className="mt-4 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200" role="alert"><AlertTriangle size={16} className="shrink-0"/>{error}</p>}
          <div className="mt-6 flex items-center gap-3"><button className="btn-primary" disabled={saving}><Save size={16}/>{saving ? "Guardando..." : "Guardar cambios"}</button>{saved && <span className="text-sm text-emerald-300" role="status">Cambios guardados.</span>}</div>
        </form>}
      </section>
    </div>
  );
}