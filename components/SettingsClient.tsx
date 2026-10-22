"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Save, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useViewer } from "@/components/ViewerContext";
import { ErrorBanner, PageHeader, Skeleton } from "@/components/ui";

const MIN_PASSWORD = 12;

function ProfileForm() {
  const viewer = useViewer();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!viewer) return;
    let active = true;
    const supabase = createClient();
    void Promise.all([
      supabase.from("profiles").select("display_name").eq("id", viewer.userId).maybeSingle(),
      supabase.from("cbdevs_clients").select("name").eq("linked_user_id", viewer.userId).eq("active", true).limit(1).maybeSingle(),
    ]).then(([{ data: profile }, { data: client }]) => {
      if (active) setName(profile?.display_name?.trim() || client?.name?.trim() || "");
    }).catch(() => {
      if (active) setError("No se pudo cargar tu perfil.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [viewer]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim().replace(/\s+/g, " ");
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
    // Only the display name is editable. Role, organization and client links are staff-managed.
    // Upsert covers the rare case where the profile trigger has not created the row yet.
    const { error: profileError } = await supabase.from("profiles")
      .upsert({ id: auth.user.id, display_name: trimmed, email: auth.user.email ?? null, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (profileError) {
      console.error("[Settings] Profile update failed:", profileError.code);
      setError("No se pudo guardar el nombre. Inténtalo de nuevo.");
      setSaving(false);
      return;
    }
    await supabase.auth.updateUser({ data: { display_name: trimmed } });
    setName(trimmed);
    setSaved(true);
    setSaving(false);
  }

  return (
    <section className="panel p-6">
      <h2 className="text-lg font-semibold">Datos de la cuenta</h2>
      <p className="mt-1 text-sm text-cb-muted">Tu nombre visible aparece en los mensajes al equipo. El correo y los permisos los administra CBDEVS.</p>
      {loading ? <Skeleton className="mt-5 h-40" /> : (
        <form onSubmit={save} className="mt-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm"><span className="mb-2 block text-slate-300">Nombre visible</span><input className="input" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} minLength={2} maxLength={100} required /></label>
            <label className="text-sm"><span className="mb-2 block text-slate-300">Correo</span><input className="input cursor-not-allowed opacity-60" value={viewer?.email ?? ""} readOnly aria-readonly="true" /></label>
          </div>
          {error && <div className="mt-4"><ErrorBanner>{error}</ErrorBanner></div>}
          <div className="mt-6 flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}><Save size={16} aria-hidden />{saving ? "Guardando…" : "Guardar cambios"}</button>
            {saved && <span className="text-sm text-emerald-300" role="status">Cambios guardados.</span>}
          </div>
        </form>
      )}
    </section>
  );
}

function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (password.length < MIN_PASSWORD) return setMessage({ kind: "error", text: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` });
    if (password !== confirmation) return setMessage({ kind: "error", text: "Las contraseñas no coinciden." });
    setSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    setSaving(false);
    if (error) {
      const reauth = error.code === "reauthentication_needed" || /reauthenticat/i.test(error.message);
      const weak = error.code === "weak_password" || /weak|pwned|leaked/i.test(error.message);
      setMessage({ kind: "error", text: reauth ? "Por seguridad, cierra sesión y usa “¿Olvidaste tu contraseña?” para cambiarla." : weak ? "Esa contraseña es demasiado débil o aparece en filtraciones conocidas. Elige otra." : error.code === "same_password" ? "La nueva contraseña debe ser distinta de la actual." : "No se pudo actualizar la contraseña. Inténtalo de nuevo." });
      return;
    }
    setPassword("");
    setConfirmation("");
    setMessage({ kind: "ok", text: "Contraseña actualizada." });
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center gap-2"><KeyRound size={18} className="text-cb-amber" aria-hidden /><h2 className="text-lg font-semibold">Contraseña</h2></div>
      <p className="mt-1 text-sm text-cb-muted">Usa una contraseña única de al menos {MIN_PASSWORD} caracteres.</p>
      <form onSubmit={submit} className="mt-5">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm"><span className="mb-2 block text-slate-300">Nueva contraseña</span><input className="input" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <label className="text-sm"><span className="mb-2 block text-slate-300">Confirmar contraseña</span><input className="input" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
        </div>
        {message && (message.kind === "error" ? <div className="mt-4"><ErrorBanner>{message.text}</ErrorBanner></div> : <p className="mt-4 text-sm text-emerald-300" role="status">{message.text}</p>)}
        <button type="submit" className="btn-ghost mt-6" disabled={saving}><ShieldCheck size={16} aria-hidden />{saving ? "Actualizando…" : "Cambiar contraseña"}</button>
      </form>
    </section>
  );
}

export default function SettingsClient() {
  return (
    <div className="mx-auto max-w-[820px] space-y-5">
      <PageHeader eyebrow="Cuenta" title="Perfil y seguridad" description="Actualiza tu nombre visible y tu contraseña. Los permisos de la cuenta solo los puede cambiar el equipo autorizado." />
      <ProfileForm />
      <PasswordForm />
    </div>
  );
}
