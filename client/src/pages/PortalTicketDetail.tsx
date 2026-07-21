// Portal do Cliente — Detalhe do Chamado v2
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Send, Paperclip, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open:        { label: "Aberto",       color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Em andamento", color: "bg-yellow-100 text-yellow-700" },
  waiting:     { label: "Aguardando",   color: "bg-purple-100 text-purple-700" },
  resolved:    { label: "Resolvido",    color: "bg-green-100 text-green-700" },
  closed:      { label: "Fechado",      color: "bg-gray-100 text-gray-600" },
};

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentList({ attachments }: { attachments: any[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {attachments.map((att: any) => (
        <a
          key={att.id}
          href={att.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{att.fileName}</span>
          {att.fileSize && <span className="text-gray-400 shrink-0">{formatFileSize(att.fileSize)}</span>}
        </a>
      ))}
    </div>
  );
}

export default function PortalTicketDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const ticketId = parseInt(params.id ?? "0");
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const [message, setMessage] = useState("");

  const ticketQuery = trpc.clientPortal.getTicket.useQuery(
    { ticketId },
    { enabled: !!user && !!ticketId, retry: false }
  );

  const messagesQuery = trpc.ticketMessages.list.useQuery(
    { ticketId },
    { enabled: !!user && !!ticketId, retry: false }
  );

  const attachmentsQuery = trpc.tickets.getAttachments.useQuery(
    { ticketId },
    { enabled: !!user && !!ticketId, retry: false }
  );

  const replyMutation = trpc.clientPortal.replyTicket.useMutation();

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await replyMutation.mutateAsync({ ticketId, message });
      setMessage("");
      messagesQuery.refetch();
      toast.success("Resposta enviada!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar resposta.");
    }
  }

  if (loading || ticketQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const ticket = ticketQuery.data;
  const messages = (messagesQuery.data ?? []).filter(m => !m.isInternal);
  const allAttachments = attachmentsQuery.data ?? [];

  // Agrupa anexos por messageId (null = anexo do ticket em si)
  const attachmentsByMessage = allAttachments.reduce((acc: Record<string, any[]>, att: any) => {
    const key = att.messageId ?? "ticket";
    if (!acc[key]) acc[key] = [];
    acc[key].push(att);
    return acc;
  }, {});

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chamado não encontrado.
      </div>
    );
  }

  const status = STATUS_MAP[ticket.status] ?? { label: ticket.status, color: "bg-gray-100 text-gray-600" };
  const isClosed = ["resolved", "closed"].includes(ticket.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/portal")} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.png" alt="Parcred" className="w-8 h-auto shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{ticket.title}</p>
            <p className="text-xs text-gray-500">{ticket.ticketNumber}</p>
          </div>
        </div>
        <Badge className={`${status.color} border-0 ml-auto shrink-0 text-xs`}>
          {status.label}
        </Badge>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Descrição original */}
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-400 mb-1">
              Aberto em {format(new Date(ticket.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            {attachmentsByMessage["ticket"]?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                  <Paperclip className="h-3 w-3" /> Anexos do chamado
                </p>
                <AttachmentList attachments={attachmentsByMessage["ticket"]} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de mensagens */}
        {messages.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Histórico</h2>
            {messages.map((msg) => {
              const isMe = msg.userId === user?.id;
              const msgAttachments = attachmentsByMessage[msg.id] ?? [];
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    {msgAttachments.length > 0 && (
                      <div className={`mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-gray-100"}`}>
                        <AttachmentList attachments={msgAttachments} />
                      </div>
                    )}
                    <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/70" : "text-gray-400"}`}>
                      {format(new Date(msg.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Responder */}
        {!isClosed ? (
          <form onSubmit={handleReply} className="space-y-2">
            <Textarea
              placeholder="Digite sua resposta..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={replyMutation.isPending}
              rows={3}
            />
            <Button type="submit" className="w-full" disabled={replyMutation.isPending || !message.trim()}>
              {replyMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Send className="h-4 w-4 mr-2" />}
              Enviar resposta
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-gray-400 py-4">
            Este chamado está {status.label.toLowerCase()}. Abra um novo chamado se precisar de mais ajuda.
          </p>
        )}
      </main>
    </div>
  );
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open:        { label: "Aberto",       color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Em andamento", color: "bg-yellow-100 text-yellow-700" },
  waiting:     { label: "Aguardando",   color: "bg-purple-100 text-purple-700" },
  resolved:    { label: "Resolvido",    color: "bg-green-100 text-green-700" },
  closed:      { label: "Fechado",      color: "bg-gray-100 text-gray-600" },
};

export default function PortalTicketDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const ticketId = parseInt(params.id ?? "0");
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const [message, setMessage] = useState("");

  const ticketQuery = trpc.clientPortal.getTicket.useQuery(
    { ticketId },
    { enabled: !!user && !!ticketId, retry: false }
  );

  const messagesQuery = trpc.ticketMessages.list.useQuery(
    { ticketId },
    { enabled: !!user && !!ticketId, retry: false }
  );

  const replyMutation = trpc.clientPortal.replyTicket.useMutation();

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await replyMutation.mutateAsync({ ticketId, message });
      setMessage("");
      messagesQuery.refetch();
      toast.success("Resposta enviada!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar resposta.");
    }
  }

  if (loading || ticketQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const ticket = ticketQuery.data;
  const messages = (messagesQuery.data ?? []).filter(m => !m.isInternal);

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chamado não encontrado.
      </div>
    );
  }

  const status = STATUS_MAP[ticket.status] ?? { label: ticket.status, color: "bg-gray-100 text-gray-600" };
  const isClosed = ["resolved", "closed"].includes(ticket.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/portal")} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.png" alt="Parcred" className="w-8 h-auto shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{ticket.title}</p>
            <p className="text-xs text-gray-500">{ticket.ticketNumber}</p>
          </div>
        </div>
        <Badge className={`${status.color} border-0 ml-auto shrink-0 text-xs`}>
          {status.label}
        </Badge>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Descrição original */}
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-400 mb-1">
              Aberto em {format(new Date(ticket.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </CardContent>
        </Card>

        {/* Histórico de mensagens */}
        {messages.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Histórico</h2>
            {messages.map((msg) => {
              const isMe = msg.userId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/70" : "text-gray-400"}`}>
                      {format(new Date(msg.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Responder */}
        {!isClosed ? (
          <form onSubmit={handleReply} className="space-y-2">
            <Textarea
              placeholder="Digite sua resposta..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={replyMutation.isPending}
              rows={3}
            />
            <Button type="submit" className="w-full" disabled={replyMutation.isPending || !message.trim()}>
              {replyMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Send className="h-4 w-4 mr-2" />}
              Enviar resposta
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-gray-400 py-4">
            Este chamado está {status.label.toLowerCase()}. Abra um novo chamado se precisar de mais ajuda.
          </p>
        )}
      </main>
    </div>
  );
}
