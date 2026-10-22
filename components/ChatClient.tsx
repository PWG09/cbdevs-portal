"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Hash, MessageSquare, Send } from "lucide-react";
import { useClientProjects } from "@/components/useClientProjects";
import { useViewer } from "@/components/ViewerContext";
import NoProjectState from "@/components/NoProjectState";
import { ErrorBanner, PageHeader, Skeleton } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { dayKey, formatDayHeading, formatTime } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";

type MessageRow = { id: string; channel_id: string; sender_id: string; text: string; created_at: string };

const MAX_LENGTH = 4000;
const PAGE_SIZE = 200;
const FALLBACK_POLL_MS = 30_000;

function toMessage(row: MessageRow, userId: string | undefined): ChatMessage {
  const mine = row.sender_id === userId;
  return { id: row.id, channelId: row.channel_id, senderId: row.sender_id, senderName: mine ? "Tú" : "Equipo CBDEVS", mine, text: row.text, createdAt: row.created_at };
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
}

export default function ChatClient() {
  const { currentProject, loading: projectsLoading, error: projectError, refresh } = useClientProjects();
  const viewer = useViewer();
  const userId = viewer?.userId;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [channelId, setChannelId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const projectId = currentProject?.id;

  const fetchMessages = useCallback(async (channel: string) => {
    const supabase = createClient();
    const { data, error: messageError } = await supabase
      .from("cbdevs_messages")
      .select("id, channel_id, sender_id, text, created_at")
      .eq("channel_id", channel)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (messageError) throw messageError;
    return ((data ?? []) as MessageRow[]).reverse().map((row) => toMessage(row, userId));
  }, [userId]);

  // Resolve the project's channel and load its history.
  useEffect(() => {
    if (projectsLoading) return;
    setMessages([]);
    setChannelId(null);
    setError("");
    if (!projectId) { setLoading(false); return; }

    let active = true;
    setLoading(true);
    (async () => {
      const supabase = createClient();
      const { data: channel, error: channelError } = await supabase
        .from("cbdevs_channels").select("id").eq("project_id", projectId).limit(1).maybeSingle();
      if (!active) return;
      if (channelError) {
        console.error("[Chat] Channel lookup failed:", channelError.code);
        setError("No se pudo cargar el canal de mensajes.");
        return;
      }
      if (!channel) return;
      setChannelId(channel.id);
      const history = await fetchMessages(channel.id);
      if (active) { stickToBottom.current = true; setMessages(history); }
    })().catch((cause: { code?: string }) => {
      console.error("[Chat] Message query failed:", cause?.code);
      if (active) setError("No se pudieron cargar los mensajes. Intenta nuevamente.");
    }).finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [projectId, projectsLoading, fetchMessages]);

  // Realtime: new messages arrive instantly. RLS also applies to realtime change events.
  // A slower poll covers dropped sockets and environments where realtime is unavailable.
  useEffect(() => {
    if (!channelId) return;
    const supabase = createClient();
    const subscription = supabase
      .channel(`portal-messages-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cbdevs_messages", filter: `channel_id=eq.${channelId}` }, (payload) => {
        const row = payload.new as MessageRow;
        if (row?.id && row.channel_id === channelId) setMessages((current) => mergeMessages(current, [toMessage(row, userId)]));
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    const poll = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchMessages(channelId).then((history) => setMessages((current) => mergeMessages(current, history))).catch(() => undefined);
    }, FALLBACK_POLL_MS);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(subscription);
      setLive(false);
    };
  }, [channelId, fetchMessages, userId]);

  // Grow the composer with its content up to the CSS max height.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  // Keep the view pinned to the newest message unless the client scrolled up to read history.
  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = scroller.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const value = text.trim();
    if (!value || value.length > MAX_LENGTH || !currentProject || !channelId || sending) return;

    setSending(true);
    setError("");
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
      setSending(false);
      return;
    }

    // organization_id/channel_id are validated against the client's own project by RLS.
    const { data, error: insertError } = await supabase.from("cbdevs_messages")
      .insert({ organization_id: currentProject.organizationId, channel_id: channelId, sender_id: auth.user.id, text: value })
      .select("id, channel_id, sender_id, text, created_at")
      .single();

    if (insertError || !data) {
      console.error("[Chat] Message insert failed:", insertError?.code);
      setError("No se pudo enviar el mensaje. Comprueba tu conexión e inténtalo otra vez.");
    } else {
      setText("");
      stickToBottom.current = true;
      setMessages((current) => mergeMessages(current, [toMessage(data as MessageRow, auth.user.id)]));
    }
    setSending(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  if (projectsLoading) return <div className="mx-auto max-w-[1000px] space-y-5"><Skeleton className="h-20" /><Skeleton className="h-[480px]" /></div>;
  if (!currentProject) return <NoProjectState error={projectError} onRetry={() => void refresh()} />;

  const remaining = MAX_LENGTH - text.length;

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <PageHeader eyebrow="Mensajes" title="Conversación con CBDEVS" description="Canal privado de tu proyecto. Solo tú y el equipo asignado pueden leerlo." />
      <div className="panel flex h-[calc(100dvh-240px)] min-h-[440px] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-cb-line bg-cb-panel2 px-5 py-4">
          <div className="rounded-lg bg-cb-amber/10 p-2 text-cb-amber"><Hash size={17} aria-hidden /></div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{currentProject.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-cb-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-slate-500"}`} aria-hidden />
              {live ? "En tiempo real" : "Sincronización periódica"}
            </div>
          </div>
        </div>

        <div ref={scroller} onScroll={onScroll} className="scrollbar flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite" aria-label="Mensajes">
          {loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className={`h-14 ${i % 2 ? "ml-auto w-2/3" : "w-3/4"}`} />)}</div>}
          {!loading && !channelId && !error && <p className="text-sm text-cb-muted">El canal de este proyecto todavía no está disponible. El equipo de CBDEVS lo activará pronto.</p>}
          {!loading && channelId && messages.length === 0 && (
            <div className="grid h-full place-items-center text-center text-cb-muted">
              <div><MessageSquare className="mx-auto mb-3 text-cb-amber" aria-hidden /><p className="font-medium text-slate-200">Aún no hay mensajes</p><p className="mt-1 text-sm">Escribe tus dudas, comentarios o solicitudes de cambio.</p></div>
            </div>
          )}
          {messages.map((message, index) => {
            const showDay = index === 0 || dayKey(messages[index - 1].createdAt) !== dayKey(message.createdAt);
            return (
              <Fragment key={message.id}>
                {showDay && (
                  <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-wider text-slate-500">
                    <span className="h-px flex-1 bg-cb-line" /><span>{formatDayHeading(message.createdAt)}</span><span className="h-px flex-1 bg-cb-line" />
                  </div>
                )}
                <div className={`flex gap-3 ${message.mine ? "flex-row-reverse" : ""}`}>
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[10px] ${message.mine ? "bg-cb-amber/15 text-cb-amber" : "bg-cb-panel2 text-cb-teal"}`} aria-hidden>{message.mine ? "TÚ" : "CB"}</div>
                  <div className={`min-w-0 max-w-[85%] sm:max-w-[72%] ${message.mine ? "text-right" : ""}`}>
                    <div className={`flex items-baseline gap-2 ${message.mine ? "justify-end" : ""}`}><span className="text-xs font-semibold">{message.senderName}</span><time className="text-[10px] text-slate-500" dateTime={message.createdAt}>{formatTime(message.createdAt)}</time></div>
                    <div className={`mt-1 whitespace-pre-wrap break-words rounded-2xl border px-3.5 py-2.5 text-left text-sm leading-relaxed text-slate-100 ${message.mine ? "rounded-tr-sm border-cb-amber/20 bg-cb-amber/10" : "rounded-tl-sm border-cb-line bg-cb-panel2"}`}>{message.text}</div>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>

        {error && <div className="border-t border-cb-line p-3"><ErrorBanner>{error}</ErrorBanner></div>}

        <form onSubmit={send} className="border-t border-cb-line bg-cb-panel2 p-3">
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="portal-message">Escribe un mensaje</label>
            <textarea ref={input} id="portal-message" rows={1} className="input max-h-40 min-h-[44px] resize-none" value={text} onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))} onKeyDown={onKeyDown}
              placeholder={channelId ? "Escribe un mensaje…" : "Canal no disponible"} maxLength={MAX_LENGTH} disabled={!channelId || sending} aria-describedby="message-help" />
            <button type="submit" className="btn-primary h-11 shrink-0 px-3.5" disabled={!text.trim() || !channelId || sending} aria-label="Enviar mensaje"><Send size={17} aria-hidden /></button>
          </div>
          <div id="message-help" className="mt-1.5 flex min-h-4 justify-between gap-3 text-[11px] text-slate-500">
            <span className="hidden sm:inline">Enter para enviar · Shift+Enter para nueva línea</span>
            <span className={`ml-auto ${remaining < 200 ? "text-cb-amber" : ""}`}>{remaining < 500 ? `${remaining} caracteres restantes` : ""}</span>
          </div>
        </form>
      </div>
    </div>
  );
}
