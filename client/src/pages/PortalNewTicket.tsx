// Portal do Cliente — Novo Chamado v3
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Paperclip, X, FileText } from "lucide-react";
import { toast } from "sonner";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalNewTicket() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const departmentsQuery = trpc.departments.list.useQuery({});
  const openTicket = trpc.clientPortal.openTicket.useMutation();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPendingFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...files.filter(f => !existing.has(f.name + f.size))];
    });
    e.target.value = "";
  }

  function removeFile(index: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function uploadFiles() {
    const uploaded = [];
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      let attachments: any[] = [];
      if (pendingFiles.length > 0) attachments = await uploadFiles();
      await openTicket.mutateAsync({
        subject,
        description,
        departmentId: departmentId ? Number(departmentId) : undefined,
        attachments,
      });
      toast.success("Chamado aberto com sucesso!");
      navigate("/portal");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao abrir chamado.");
    } finally {
      setUploading(false);
    }
  }

  const isPending = uploading || openTicket.isPending;
  const departments = (departmentsQuery.data ?? []) as any[];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/portal")} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Parcred" className="w-8 h-auto" />
          <p className="text-sm font-semibold text-gray-900">Novo Chamado</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Abrir novo chamado</CardTitle>
            <CardDescription>Descreva sua solicitação com o máximo de detalhes possível.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Departamento */}
              {departments.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Sua dúvida é referente a assuntos: <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <Select value={departmentId} onValueChange={setDepartmentId} disabled={isPending}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma área (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  placeholder="Resumo da sua solicitação"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isPending}
                  required
                  minLength={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva em detalhes o que aconteceu ou o que você precisa..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  required
                  minLength={10}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Anexos <span className="text-gray-400 font-normal">(opcional)</span></Label>
                {pendingFiles.length > 0 && (
                  <div className="space-y-2">
                    {pendingFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                        <span className="text-xs text-gray-400 shrink-0">{formatFileSize(file.size)}</span>
                        <button type="button" onClick={() => removeFile(i)} disabled={isPending} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isPending} className="flex items-center gap-2 text-sm text-primary hover:underline disabled:opacity-50">
                  <Paperclip className="h-4 w-4" />
                  Adicionar arquivo
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} disabled={isPending} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/portal")} disabled={isPending}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {uploading ? "Enviando arquivos…" : "Abrir chamado"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
