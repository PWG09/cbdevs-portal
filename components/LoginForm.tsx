"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Terminal, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError("Correo o contraseña incorrectos. Si no puedes entrar, solicita restablecer tu contraseña.");
        return;
      }

      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(safeNext);
      router.refresh();
    } catch (cause) {
      console.error("[Login] Supabase sign-in failed.");
      setError(cause instanceof Error && cause.message.includes("Falta configurar")
        ? "El portal no está configurado correctamente. Contacta al equipo de CBDEVS."
        : "No fue posible iniciar sesión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError("");
    if (!email.trim()) {
      setError("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (resetError) {
        setError("No se pudo solicitar la recuperación. Revisa el correo e inténtalo de nuevo.");
      } else {
        setError("Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.");
      }
    } catch {
      setError("No fue posible solicitar la recuperación en este momento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cb-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cb-line bg-cb-panel">
            <Terminal className="text-cb-amber" />
          </div>
          <div className="font-mono text-2xl font-bold tracking-tight">CB<span className="text-cb-amber">|</span>DEVS</div>
          <div className="mt-2 text-sm text-cb-muted">Portal de Cliente</div>
        </div>

        <form onSubmit={submit} className="panel p-6">
          <div className="mb-6">
            <div className="mono-label">AUTH / CLIENT</div>
            <h1 className="mt-2 text-2xl font-bold">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-cb-muted">Consulta el avance, las entregas y los mensajes de tu proyecto.</p>
          </div>

          <label className="mb-4 block text-sm">
            <span className="mb-2 block text-slate-300">Correo</span>
            <input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
          </label>

          <label className="mb-2 block text-sm">
            <span className="mb-2 block text-slate-300">Contraseña</span>
            <span className="relative block">
              <input className="input pr-12" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={128} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cb-muted" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {error && <div className="my-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200" role="status">{error}</div>}

          <button className="btn-primary mt-4 w-full" disabled={loading}>
            <ShieldCheck size={17} />
            {loading ? "Validando..." : "Entrar al portal"}
          </button>
          <button type="button" className="mt-4 w-full text-sm text-cb-amber hover:underline disabled:opacity-50" onClick={resetPassword} disabled={loading}>
            ¿Olvidaste tu contraseña?
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-600">Acceso privado administrado por CBDEVS · Supabase Auth</p>
      </div>
    </main>
  );
}