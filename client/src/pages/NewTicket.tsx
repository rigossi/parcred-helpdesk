import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Paperclip, PlusCircle, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type AttachmentItem = {
  file: File;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploading: boolean;
  error?: string;
};

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewTicket() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [departmentId, setDepartmentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCorrespondentId, setSelectedCorrespondentId] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: departments = [] } = trpc.departments.list.useQuery({ activeOnly: true });
  const { data: myProfile } = trpc.correspondents.myProfile.useQuery();
  const { data: correspondents = [] } = trpc.correspondents.listForTicket.useQuery(undefined, {
    enabled: user?.role === "admin" || user?.role === "agent",
  });

  const createMut = trpc.tickets.create.useMutation({
    onSuccess: (ticket) => {
      toast.success(`Chamado ${ticket?.ticketNumber ?? ""} aberto com sucesso!`);
      setLocation("/tickets");
    },
    onError: (err) => toast.error("Erro ao abrir chamado: " + err.message),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Limite de 5 anexos e 10MB por arquivo
    const remaining = 5 - attachments.length;
    const toAdd = files.slice(0, remaining);

    for (const file of toAdd) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Arquivo "${file.name}" excede o limite de 10 MB.`);
        continue;
      }

      const tempItem: AttachmentItem = {
        file,
        fileName: file.name,
        fileKey: "",
        fileUrl: "",
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        uploading: true,
      };

      setAttachments((prev) => [...prev, tempItem]);

      try {
        // Upload via FormData para o endpoint de storage
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Falha no upload");
        const { key, url } = await res.json();

        setAttachments((prev) =>
          prev.map((a) =>
            a.file === file ? { ...a, fileKey: key, fileUrl: url, uploading: false } : a
          )
        );
      } catch {
        setAttachments((prev) =>
          prev.map((a) =>
            a.file === file ? { ...a, uploading: false, error: "Falha no upload" } : a
          )
        );
        toast.error(`Falha ao enviar "${file.name}"`);
      }
    }

    // Limpar o input para permitir reenvio do mesmo arquivo
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    if (!departmentId || !title.trim() || !description.trim()) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }

    let correspondentId: number | undefined;
    if (user?.role === "correspondent") {
      if (!myProfile) return toast.error("Seu perfil de correspondente não foi encontrado. Contate o administrador.");
      correspondentId = myProfile.id;
    } else {
      if (!selectedCorrespondentId) return toast.error("Selecione o correspondente.");
      correspondentId = Number(selectedCorrespondentId);
    }

    const pendingUploads = attachments.filter((a) => a.uploading);
    if (pendingUploads.length > 0) {
      return toast.error("Aguarde o envio dos arquivos antes de abrir o chamado.");
    }

    const validAttachments = attachments
      .filter((a) => !a.error && a.fileKey)
      .map(({ fileName, fileKey, fileUrl, mimeType, fileSize }) => ({
        fileName,
        fileKey,
        fileUrl,
        mimeType,
        fileSize,
      }));

    createMut.mutate({
      correspondentId: correspondentId!,
      departmentId: Number(departmentId),
      title: title.trim(),
      description: description.trim(),
      attachments: validAttachments.length > 0 ? validAttachments : undefined,
    });
  }

  const isStaff = user?.role === "admin" || user?.role === "agent";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/tickets")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Abrir Chamado
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Descreva sua demanda para que nossa equipe possa atendê-la</p>
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Dados do chamado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Correspondente — staff seleciona, correspondente vê o próprio perfil */}
            {isStaff && (
              <div className="space-y-1.5">
                <Label>Correspondente *</Label>
                <Select value={selectedCorrespondentId} onValueChange={setSelectedCorrespondentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o correspondente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(correspondents as any[]).map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {user?.role === "correspondent" && myProfile && (
              <div className="p-3 bg-muted/40 rounded-lg border">
                <p className="text-xs text-muted-foreground">Correspondente</p>
                <p className="font-medium text-sm mt-0.5">{myProfile.name}</p>
              </div>
            )}

            {/* Departamento */}
            <div className="space-y-1.5">
              <Label>Departamento *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  {(departments as any[]).map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <Label>Título do chamado *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Descreva brevemente o problema ou solicitação"
                maxLength={256}
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label>Descrição detalhada *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o problema com o máximo de detalhes possível: o que aconteceu, quando ocorreu, qual o impacto..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Quanto mais detalhes, mais rápido conseguimos resolver.</p>
            </div>

            {/* Anexos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Anexos <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <span className="text-xs text-muted-foreground">{attachments.length}/5 arquivos · máx. 10 MB cada</span>
              </div>

              {attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map((att, idx) => (
                    <li key={idx} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                      <span className="shrink-0">{fileIcon(att.mimeType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(att.fileSize)}
                          {att.uploading && " · Enviando..."}
                          {att.error && <span className="text-destructive"> · {att.error}</span>}
                          {!att.uploading && !att.error && att.fileKey && " · Enviado"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAttachment(idx)}
                        disabled={att.uploading}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {attachments.length < 5 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 w-full border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                    Adicionar arquivo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: imagens, PDF, Word, Excel, TXT, CSV, ZIP
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setLocation("/tickets")}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={createMut.isPending || attachments.some((a) => a.uploading)}
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                {createMut.isPending ? "Abrindo chamado..." : "Abrir chamado"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
