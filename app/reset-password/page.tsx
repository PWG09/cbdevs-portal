"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setReady(Boolean(data.session));
        if (!data.session) setMessage("El enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de inicio de sesión.");
      }
    });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password.length < 12) {
      setMessage("La contraseña debe tener al menos 12 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage("No se pudo actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.");
      return;
    }
    await supabase.auth.signOut();
    setMessage("Contraseña actualizada. Ya puedes iniciar sesión.");
    setTimeout(() => router.replace("/login"), 1200);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cb-bg p-4">
      <section className="panel w-full max-w-md p-6">
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl border border-cb-line bg-cb-panel2 text-cb-amber"><KeyRound /></div>
        <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
        <p className="mt-2 text-sm text-cb-muted">Usa una contraseña única de al menos 12 caracteres.</p>
        {ready ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm"><span className="mb-2 block">Nueva contraseña</span><input className="input" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <label className="block text-sm"><span className="mb-2 block">Confirmar contraseña</span><input className="input" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
            <button className="btn-primary w-full" disabled={loading}><ShieldCheck size={16} />{loading ? "Actualizando..." : "Guardar contraseña"}</button>
          </form>
        ) : null}
        {message && <p className="mt-4 rounded-xl border border-cb-line bg-cb-bg p-3 text-sm text-cb-muted" role="status">{message}</p>}
      </section>
    </main>
  );
}