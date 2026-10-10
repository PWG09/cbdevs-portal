"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Hash, Send, MessageSquare, AlertTriangle } from "lucide-react";
import { useClientProjects } from "@/components/useClientProjects";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/types";

type MessageRow = { id: string; channel_id: string; sender_id: string; text: string; created_at: string };

export default function ChatClient() {
  const { currentProject, loading: projectsLoading } = useClientProjects();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [channelId, setChannelId] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (projectId: string) => {
    const supabase = createClient();
    const { data: channel, error: channelError } = await supabase
      .from("cbdevs_channels")
      .select("id")
      .eq("project_id", projectId)
      .limit(1)
      .maybeSingle();

    if (channelError) {
      console.error("[Chat] Channel lookup failed:", channelError.code);
      setError("No se pudo cargar el canal de mensajes.");
      return;
    }
    if (!channel) {
      setChannelId(null);
      setMessages([]);
      return;
    }

    setChannelId(channel.id);
    const { data, error: messageError } = await supabase
      .from("cbdevs_messages")
      .select("id, channel_id, sender_id, text, created_at")
      .eq("channel_id", channel.id)
      .order("created_at", { ascending: true })
      .limit(150);

    if (messageError) {
      console.error("[Chat] Message query failed:", messageError.code);
      setError("No se pudieron cargar los mensajes. Comprueba que la migración del portal esté aplicada.");
      return;
    }

    setMessages(((data ?? []) as MessageRow[]).map((row) => ({
      id: row.id,
      channelId: row.channel_id,
      senderId: row.sender_id,
      senderName: row.sender_id === (createClient().auth.getUser as unknown as string) ? "Tú" : "CBDEVS",
      text: row.text,
      createdAt: row.created_at,
    })));
  }, []);

  useEffect(() => {
    if (projectsLoading) return;
    if (!currentProject) {
      setMessages([]);
      setChannelId(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
    const supabase = createClient();

    const run = async () => {
      await loadMessages(currentProject.id);
      if (active) setLoading(false);
    };
    void run();
    const interval = window.setInterval(() => { void loadMessages(currentProject.id); }, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
      void supabase.removeAllChannels();
    };
  }, [currentProject?.id, loadMessages, projectsLoading]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();
    if (!value || value.length > 4000 || !currentProject || !channelId || sending) return;

    setSending(true);
    setError("");
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
      setSending(false);
      return;
    }

    const { error: insertError } = await supabase.from("cbdevs_messages").insert({
      organization_id: currentProject.organizationId,
      channel_id: channelId,
      sender_id: auth.user.id,
      text: value,
    });

    if (insertError) {
      console.error("[Chat] Message insert failed:", insertError.code);
      setError("No se pudo enviar el mensaje. Comprueba tu conexión e inténtalo otra vez.");
    } else {
      setText("");
      await loadMessages(currentProject.id);
    }
    setSending(false);
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div><div className="mono-label">PROJECT / MESSAGES</div><h1 className="mt-1 text-3xl font-bold">Mensajes</h1><p className="mt-1 text-sm text-cb-muted">Comunicación privada con CBDEVS sobre tu proyecto.</p></div>
      <div className="panel flex h-[calc(100dvh-230px)] min-h-[420px] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-cb-line bg-cb-panel2 px-5 py-4">
          <div className="rounded-lg bg-cb-amber/10 p-2 text-cb-amber"><Hash size={17}/></div>
          <div><div className="font-semibold">{currentProject?.name || "Proyecto"}</div><div className="text-xs text-slate-500">{projectsLoading ? "Cargando proyecto..." : "Canal privado del proyecto"}</div></div>
        </div>
        <div className="scrollbar flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
          {projectsLoading || loading ? <p className="text-sm text-cb-muted">Cargando mensajes...</p> : null}
          {!projectsLoading && !currentProject && <p className="text-sm text-cb-muted">Todavía no tienes un proyecto vinculado.</p>}
          {!projectsLoading && currentProject && !channelId && <p className="text-sm text-cb-muted">El canal del proyecto todavía no está configurado. El equipo de CBDEVS debe aplicar la migración del portal.</p>}
          {messages.length === 0 && channelId && !loading && <div className="grid h-full place-items-center text-center text-slate-600"><MessageSquare className="mx-auto mb-3"/><p>Aún no hay mensajes.</p><p className="text-xs">Puedes iniciar la conversación aquí.</p></div>}
          {messages.map((message) => {
            const mine = message.senderName === "Tú";
            return (
              <div key={message.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cb-panel2 font-mono text-xs text-cb-amber">{mine ? "TÚ" : "CB"}</div>
                <div className={`max-w-[85%] min-w-0 sm:max-w-[75%] ${mine ? "text-right" : ""}`}>
                  <div className="flex items-baseline gap-2"><span className="text-sm font-semibold">{message.senderName}</span><span className="text-[10px] text-slate-600">{message.createdAt ? new Date(message.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : ""}</span></div>
                  <div className={`mt-1 whitespace-pre-wrap break-words rounded-2xl border border-cb-line px-3 py-2 text-left text-sm text-slate-200 ${mine ? "rounded-tr-sm bg-cb-amber/10" : "rounded-tl-sm bg-cb-panel2"}`}>{message.text}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottom}/>
        </div>
        {error && <div className="flex items-start gap-2 border-t border-red-500/20 bg-red-500/5 p-3 text-sm text-red-200" role="alert"><AlertTriangle size={16} className="mt-0.5 shrink-0"/>{error}</div>}
        <form onSubmit={send} className="border-t border-cb-line bg-cb-panel2 p-3">
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="portal-message">Escribe un mensaje</label>
            <input id="portal-message" className="input min-w-0" value={text} onChange={(event) => setText(event.target.value)} placeholder="Escribe un mensaje..." maxLength={4000} disabled={!channelId || sending} />
            <button className="btn-primary shrink-0 px-3" disabled={!text.trim() || !channelId || sending} aria-label="Enviar mensaje"><Send size={17}/></button>
          </div>
        </form>
      </div>
    </div>
  );
}