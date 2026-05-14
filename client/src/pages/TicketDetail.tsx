import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDateTime,
  formatRelativeTime,
  getCorrespondentStatusClass,
  getPriorityClass,
  getStatusClass,
  isSlaAtRisk,
  isSlaBreached,
  PRIORITY_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  TICKET_TYPE_LABELS,
} from "@/lib/helpers";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Lock,
  MessageSquare,
  Paperclip,
  Send,
  Timer,
  User,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function TicketDetail() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const ticketId = Number(params.id);

  const { data: ticket, refetch: refetchTicket } = trpc.tickets.byId.useQuery({ id: ticketId }, { enabled: !!ticketId });
  const { data: messages = [], refetch: refetchMessages } = trpc.ticketMessages.list.useQuery({ ticketId }, { enabled: !!ticketId });
  const { data: attachments = [] } = trpc.ticketAttachments.list.useQuery({ ticketId }, { enabled: !!ticketId });
  const { data: departments = [] } = trpc.departments.list.useQuery({});
  const { data: agents = [] } = trpc.admin.users.useQuery(undefined, { enabled: user?.role === "admin" || user?.role === "agent" });
  const { data: correspondent } = trpc.correspondents.byId.useQuery(
    { id: ticket?.correspondentId ?? 0 },
    { enabled: !!ticket?.correspondentId }
  );

  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [assignTo, setAssignTo] = useState("");

  const sendMessageMut = trpc.ticketMessages.create.useMutation({
    onSuccess: () => { setMessage(""); refetchMessages(); toast.success("Mensagem enviada."); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const updateTicketMut = trpc.tickets.update.useMutation({
    onSuccess: () => { refetchTicket(); toast.success("Chamado atualizado."); setNewStatus(""); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const assignMut = trpc.tickets.assign.useMutation({
    onSuccess: () => { refetchTicket(); toast.success("Chamado atribuído."); setAssignTo(""); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  if (!ticket) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando chamado...</p>
        </div>
      </DashboardLayout>
    );
  }

  const isStaff = user?.role === "admin" || user?.role === "agent";
  const getDeptName = (id: number) => (departments as any[]).find((d: any) => d.id === id)?.name ?? "—";
  const getAgentName = (id: number | null | undefined) => {
    if (!id) return "Não atribuído";
    const a = (agents as any[]).find((u: any) => u.id === id);
    return a?.name ?? "—";
  };

  const atRisk = isSlaAtRisk(ticket.resolutionDeadline);
  const breached = isSlaBreached(ticket.resolutionDeadline) && ticket.status !== "resolved" && ticket.status !== "closed";

  const staffAgents = (agents as any[]).filter((u: any) => u.role === "agent" || u.role === "admin");

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/tickets")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-sm font-semibold text-primary">{ticket.ticketNumber}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(ticket.status)}`}>
                {STATUS_LABELS[ticket.status] ?? ticket.status}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityClass(ticket.priority)}`}>
                {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
              </span>
              {(breached || atRisk) && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${breached ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {breached ? "SLA Vencido" : "SLA em Risco"}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground mt-1" style={{ fontFamily: "var(--font-display)" }}>
              {ticket.title}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {TICKET_TYPE_LABELS[ticket.ticketType]} · {getDeptName(ticket.departmentId)} · Aberto em {formatDateTime(ticket.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main: description + messages */}
          <div className="lg:col-span-2 space-y-5">
            {/* Description */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Histórico de interações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(messages as any[]).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhuma mensagem ainda.</p>
                ) : (
                  (messages as any[]).map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.isInternal ? "opacity-80" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">Usuário #{msg.userId}</span>
                          {msg.isInternal && (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              <Lock className="h-3 w-3" /> Nota interna
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(msg.createdAt)}</span>
                        </div>
                        <div className={`p-3 rounded-lg text-sm leading-relaxed ${msg.isInternal ? "bg-amber-50 border border-amber-200" : "bg-muted/40 border"}`}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Reply box */}
                {ticket.status !== "closed" && (
                  <div className="pt-2 space-y-3">
                    <Separator />
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={isInternal ? "Escreva uma nota interna (visível apenas para a equipe)..." : "Escreva uma mensagem..."}
                      rows={4}
                      className={`resize-none ${isInternal ? "border-amber-300 bg-amber-50/50" : ""}`}
                    />
                    <div className="flex items-center justify-between">
                      {isStaff && (
                        <div className="flex items-center gap-2">
                          <Switch id="internal" checked={isInternal} onCheckedChange={setIsInternal} />
                          <Label htmlFor="internal" className="text-sm text-muted-foreground cursor-pointer">
                            Nota interna
                          </Label>
                        </div>
                      )}
                      <Button
                        onClick={() => {
                          if (!message.trim()) return toast.error("Escreva uma mensagem.");
                          sendMessageMut.mutate({ ticketId, message, isInternal });
                        }}
                        disabled={sendMessageMut.isPending}
                        className="gap-2 ml-auto"
                      >
                        <Send className="h-4 w-4" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: info + actions */}
          <div className="space-y-4">
            {/* Correspondent info */}
            {correspondent && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Correspondente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium text-foreground">{correspondent.name}</p>
                  {correspondent.bankCode && <p className="text-xs text-muted-foreground">Código: {correspondent.bankCode}</p>}
                  {correspondent.email && <p className="text-xs text-muted-foreground">{correspondent.email}</p>}
                  {correspondent.phone && <p className="text-xs text-muted-foreground">{correspondent.phone}</p>}
                </CardContent>
              </Card>
            )}

            {/* SLA info */}
            <Card className={`border shadow-sm ${breached ? "border-red-200 bg-red-50/30" : atRisk ? "border-orange-200 bg-orange-50/30" : ""}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Timer className="h-4 w-4" /> SLA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {ticket.responseDeadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prazo de resposta</span>
                    <span className="font-medium">{formatDateTime(ticket.responseDeadline)}</span>
                  </div>
                )}
                {ticket.resolutionDeadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prazo de resolução</span>
                    <span className={`font-medium ${breached ? "text-red-600" : atRisk ? "text-orange-600" : ""}`}>
                      {formatDateTime(ticket.resolutionDeadline)}
                    </span>
                  </div>
                )}
                {ticket.firstResponseAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">1ª resposta em</span>
                    <span className="font-medium text-green-600">{formatDateTime(ticket.firstResponseAt)}</span>
                  </div>
                )}
                {!ticket.responseDeadline && !ticket.resolutionDeadline && (
                  <p className="text-muted-foreground text-xs">Sem SLA configurado para este chamado.</p>
                )}
              </CardContent>
            </Card>

            {/* Agent actions */}
            {isStaff && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Agente responsável</Label>
                    <div className="flex gap-2">
                      <Select value={assignTo} onValueChange={setAssignTo}>
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder={getAgentName(ticket.assignedToUserId)} />
                        </SelectTrigger>
                        <SelectContent>
                          {staffAgents.map((a: any) => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.name ?? a.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        disabled={!assignTo || assignMut.isPending}
                        onClick={() => assignMut.mutate({ id: ticketId, agentId: Number(assignTo) })}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Atualizar status</Label>
                    <div className="flex gap-2">
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Aberto</SelectItem>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="waiting_correspondent">Aguardando Correspondente</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                          <SelectItem value="closed">Encerrado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        disabled={!newStatus || updateTicketMut.isPending}
                        onClick={() => updateTicketMut.mutate({ id: ticketId, status: newStatus as any })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ticket metadata */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Departamento</span>
                  <span className="font-medium">{getDeptName(ticket.departmentId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium">{TICKET_TYPE_LABELS[ticket.ticketType]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responsável</span>
                  <span className="font-medium">{getAgentName(ticket.assignedToUserId)}</span>
                </div>
                {ticket.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolvido em</span>
                    <span className="font-medium text-green-600">{formatDateTime(ticket.resolvedAt)}</span>
                  </div>
                )}
                {ticket.closedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Encerrado em</span>
                    <span className="font-medium">{formatDateTime(ticket.closedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
