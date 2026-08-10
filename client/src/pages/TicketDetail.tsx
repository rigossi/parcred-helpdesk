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
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Download,
  File,
  FileImage,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  Send,
  Timer,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// ─── Helpers de arquivo ───────────────────────────────────────────────────────

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return <File className="h-4 w-4" />;
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4" />;
  if (mimeType.includes("pdf") || mimeType.includes("text")) return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Componente de lista de anexos ────────────────────────────────────────────

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
          className="flex items-center gap-2 text-xs text-primary hover:underline bg-primary/5 border border-primary/20 rounded px-2 py-1.5 w-fit max-w-full"
        >
          {getFileIcon(att.mimeType)}
          <span className="truncate max-w-[200px]">{att.fileName}</span>
          {att.fileSize && <span className="text-muted-foreground shrink-0">{formatFileSize(att.fileSize)}</span>}
          <Download className="h-3 w-3 shrink-0 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TicketDetail() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const ticketId = Number(params.id);

  const { data: ticket, refetch: refetchTicket } = trpc.tickets.byId.useQuery({ id: ticketId }, { enabled: !!ticketId });
  const { data: messages = [], refetch: refetchMessages } = trpc.ticketMessages.list.useQuery({ ticketId }, { enabled: !!ticketId });
  const { data: allAttachments = [], refetch: refetchAttachments } = trpc.ticketAttachments.list.useQuery({ ticketId }, { enabled: !!ticketId });
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
  const [newPriority, setNewPriority] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAgent, setTransferAgent] = useState("");
  const [transferDept, setTransferDept] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const transferMut = trpc.transfer.ticket.useMutation({
    onSuccess: () => {
      toast.success("Chamado transferido com sucesso!");
      setShowTransfer(false);
      setTransferAgent("");
      setTransferDept("");
      setTransferNote("");
      ticketQuery.refetch();
      messagesQuery.refetch();
    },
    onError: (err) => toast.error(err.message ?? "Erro ao transferir chamado."),
  });

  // Estado de upload de anexos na caixa de resposta
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessageMut = trpc.ticketMessages.create.useMutation({
    onSuccess: () => {
      setMessage("");
      setPendingFiles([]);
      refetchMessages();
      refetchAttachments();
      toast.success("Mensagem enviada.");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const utils = trpc.useUtils();

  const updateTicketMut = trpc.tickets.update.useMutation({
    onSuccess: () => {
      refetchTicket();
      utils.tickets.list.invalidate();
      toast.success("Chamado atualizado.");
      setNewStatus("");
    },
    onError: (e) => toast.error("Erro ao atualizar: " + e.message),
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
    if (a?.name) return a.name;
    if (ticket?.assignedUserName) return ticket.assignedUserName;
    return "—";
  };

  const atRisk = isSlaAtRisk(ticket.resolutionDeadline);
  const breached = isSlaBreached(ticket.resolutionDeadline) && ticket.status !== "resolved" && ticket.status !== "closed";
  const staffAgents = (agents as any[]).filter((u: any) => u.role === "agent" || u.role === "admin");

  // Separar anexos: os da abertura (sem messageId) e os vinculados a mensagens
  const openingAttachments = (allAttachments as any[]).filter((a: any) => !a.messageId);
  const attachmentsByMessage = (allAttachments as any[]).reduce((acc: Record<number, any[]>, att: any) => {
    if (att.messageId) {
      if (!acc[att.messageId]) acc[att.messageId] = [];
      acc[att.messageId].push(att);
    }
    return acc;
  }, {} as Record<number, any[]>);

  // Upload de arquivos pendentes
  async function uploadPendingFiles(): Promise<{ fileName: string; fileKey: string; fileUrl: string; mimeType?: string; fileSize?: number }[]> {
    const uploaded: { fileName: string; fileKey: string; fileUrl: string; mimeType?: string; fileSize?: number }[] = [];
    for (const file of pendingFiles) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Falha ao enviar ${file.name}`);
      const data = await res.json();
      uploaded.push({ fileName: file.name, fileKey: data.key, fileUrl: data.url, mimeType: file.type || undefined, fileSize: file.size });
    }
    return uploaded;
  }

  async function handleSendMessage() {
    if (!message.trim() && pendingFiles.length === 0) {
      return toast.error("Escreva uma mensagem ou adicione um anexo.");
    }
    if (!message.trim() && pendingFiles.length > 0) {
      // Permite enviar só anexo com mensagem padrão
    }
    setIsUploading(true);
    try {
      let uploadedAttachments: { fileName: string; fileKey: string; fileUrl: string; mimeType?: string; fileSize?: number }[] = [];
      if (pendingFiles.length > 0) {
        uploadedAttachments = await uploadPendingFiles();
      }
      sendMessageMut.mutate({
        ticketId,
        message: message.trim() || "(Anexo)",
        isInternal,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });
    } catch (err: any) {
      toast.error("Erro ao enviar arquivo: " + (err?.message ?? "Tente novamente."));
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const MAX_SIZE = 10 * 1024 * 1024;
    const oversized = files.filter(f => f.size > MAX_SIZE);
    if (oversized.length > 0) {
      toast.error(`Arquivo(s) muito grande(s): máximo 10 MB por arquivo.`);
      return;
    }
    if (pendingFiles.length + files.length > 5) {
      toast.error("Máximo de 5 anexos por mensagem.");
      return;
    }
    setPendingFiles(prev => [...prev, ...files]);
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingFile(index: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }

  const isSending = sendMessageMut.isPending || isUploading;

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
              <CardContent className="space-y-3">
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                {/* Anexos da abertura do chamado */}
                {openingAttachments.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
                      <Paperclip className="h-3.5 w-3.5" /> Anexos da abertura
                    </p>
                    <AttachmentList attachments={openingAttachments} />
                  </div>
                )}
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
                          <span className="text-sm font-medium">{(msg as any).userName ?? `Usuário #${msg.userId}`}</span>
                          {msg.isInternal && (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              <Lock className="h-3 w-3" /> Nota interna
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(msg.createdAt)}</span>
                        </div>
                        <div className={`p-3 rounded-lg text-sm leading-relaxed ${msg.isInternal ? "bg-amber-50 border border-amber-200" : "bg-muted/40 border"}`}>
                          {msg.message}
                          {/* Anexos vinculados a esta mensagem */}
                          <AttachmentList attachments={attachmentsByMessage[msg.id] ?? []} />
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

                    {/* Arquivos pendentes */}
                    {pendingFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {pendingFiles.map((file, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs bg-muted border rounded px-2 py-1 max-w-[200px]">
                            {getFileIcon(file.type)}
                            <span className="truncate">{file.name}</span>
                            <span className="text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                            <button
                              type="button"
                              onClick={() => removePendingFile(i)}
                              className="text-muted-foreground hover:text-destructive shrink-0 ml-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {isStaff && (
                          <div className="flex items-center gap-2">
                            <Switch id="internal" checked={isInternal} onCheckedChange={setIsInternal} />
                            <Label htmlFor="internal" className="text-sm text-muted-foreground cursor-pointer">
                              Nota interna
                            </Label>
                          </div>
                        )}
                        {/* Botão de anexar arquivo */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                          onChange={handleFileSelect}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-8 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSending || pendingFiles.length >= 5}
                          title="Adicionar anexo (máx. 5 arquivos, 10 MB cada)"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          Anexar
                          {pendingFiles.length > 0 && (
                            <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                              {pendingFiles.length}
                            </span>
                          )}
                        </Button>
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={isSending}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {isSending ? "Enviando..." : "Enviar"}
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={() => setShowTransfer(true)}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                    Transferir chamado
                  </Button>
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
                      <Select
                        value={newStatus || ticket.status}
                        onValueChange={(val) => setNewStatus(val)}
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue />
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
                        disabled={!newStatus || newStatus === ticket.status || updateTicketMut.isPending}
                        onClick={() => updateTicketMut.mutate({ id: ticketId, status: newStatus as any })}
                        title="Salvar status"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Definir prioridade</Label>
                    <div className="flex gap-2">
                      <Select value={newPriority} onValueChange={setNewPriority}>
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder={PRIORITY_LABELS[ticket.priority] ?? "Selecione"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="critical">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        disabled={!newPriority || updateTicketMut.isPending}
                        onClick={() => {
                          updateTicketMut.mutate({ id: ticketId, priority: newPriority as any });
                          setNewPriority("");
                        }}
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
      </div>

      {/* Modal de Transferência */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir chamado {ticket?.ticketNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Transferir para atendente</Label>
              <Select value={transferAgent} onValueChange={v => { setTransferAgent(v); setTransferDept(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um atendente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (remover atribuição)</SelectItem>
                  {staffAgents.map((a: any) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name ?? a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ou transferir para departamento</Label>
              <Select value={transferDept} onValueChange={v => { setTransferDept(v); setTransferAgent(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um departamento (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {(departments as any[]).map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nota interna (opcional)</Label>
              <Input
                placeholder="Ex: Cliente solicita retorno urgente..."
                value={transferNote}
                onChange={e => setTransferNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransfer(false)}>Cancelar</Button>
            <Button
              disabled={transferMut.isPending || (!transferAgent && !transferDept)}
              onClick={() => transferMut.mutate({
                ticketId,
                assignedToUserId: transferAgent && transferAgent !== "none" ? Number(transferAgent) : transferAgent === "none" ? null : undefined,
                departmentId: transferDept ? Number(transferDept) : undefined,
                note: transferNote || undefined,
              })}
            >
              {transferMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
