import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Code2, Eye, Loader2, Mail, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

// Variáveis disponíveis no template
const TEMPLATE_VARS = [
  { variable: "{{name}}", description: "Nome completo do usuário" },
  { variable: "{{reset_link}}", description: "Link completo para redefinição de senha" },
  { variable: "{{app_name}}", description: "Nome da aplicação (Parcred Help Desk)" },
  { variable: "{{email}}", description: "E-mail do usuário" },
];

function renderPreview(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

const PREVIEW_VARS: Record<string, string> = {
  "{{name}}": "João da Silva",
  "{{reset_link}}": "https://suporte.parcredbrasil.com.br/reset-password?token=exemplo123",
  "{{app_name}}": "Parcred Help Desk",
  "{{email}}": "joao.silva@exemplo.com.br",
};

export default function EmailTemplates() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && user.role !== "admin") setLocation("/dashboard");
  }, [user]);

  const { data: template, isLoading, refetch } = trpc.admin.getEmailTemplate.useQuery(
    { key: "password_reset" },
    { enabled: !!user }
  );

  const updateMut = trpc.admin.updateEmailTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template salvo com sucesso.");
      refetch();
    },
    onError: (err) => toast.error(err.message ?? "Erro ao salvar template."),
  });

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  // Sincronizar estado local quando o template carrega
  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBodyHtml(template.bodyHtml);
    }
  }, [template?.templateKey]); // Só sincroniza quando o template muda de chave (carregamento inicial)

  const isDirty = template
    ? subject !== template.subject || bodyHtml !== template.bodyHtml
    : false;

  function handleSave() {
    if (!subject.trim()) return toast.error("O assunto do e-mail é obrigatório.");
    if (!bodyHtml.trim()) return toast.error("O corpo do e-mail é obrigatório.");
    updateMut.mutate({ key: "password_reset", subject, bodyHtml });
  }

  function handleReset() {
    if (!template) return;
    setSubject(template.subject);
    setBodyHtml(template.bodyHtml);
    toast.info("Alterações descartadas.");
  }

  const previewHtml = renderPreview(bodyHtml, PREVIEW_VARS);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Templates de E-mail</h1>
            <p className="text-sm text-gray-500 mt-1">
              Edite o conteúdo dos e-mails enviados automaticamente pelo sistema.
            </p>
          </div>
          <div className="flex gap-2">
            {isDirty && (
              <Button variant="outline" onClick={handleReset} disabled={updateMut.isPending}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Descartar
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!isDirty || updateMut.isPending}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {updateMut.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando…</>
                : <><Save className="h-4 w-4 mr-2" />Salvar template</>}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Editor + Preview */}
            <div className="xl:col-span-3 space-y-4">
              {/* Assunto */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4 text-emerald-600" />
                    E-mail de Recuperação de Senha
                    {isDirty && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 ml-2 text-xs">
                        Alterações não salvas
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-subject" className="text-gray-700">Assunto do e-mail</Label>
                    <Input
                      id="email-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Recuperação de senha - Parcred Help Desk"
                      className="text-gray-900"
                    />
                    <p className="text-xs text-gray-400">
                      Você pode usar variáveis como <code className="bg-gray-100 px-1 rounded">{"{{name}}"}</code> no assunto.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Editor / Preview */}
              <Card>
                <CardContent className="pt-4">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "editor" | "preview")}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="editor" className="flex items-center gap-1.5">
                        <Code2 className="h-3.5 w-3.5" />
                        Editor HTML
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor">
                      <div className="space-y-1.5">
                        <Label className="text-gray-700">Corpo do e-mail (HTML)</Label>
                        <textarea
                          value={bodyHtml}
                          onChange={(e) => setBodyHtml(e.target.value)}
                          rows={28}
                          className="w-full font-mono text-xs border border-gray-200 rounded-md p-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y"
                          placeholder="Cole aqui o HTML do e-mail..."
                          spellCheck={false}
                        />
                        <p className="text-xs text-gray-400">
                          Use as variáveis listadas ao lado para personalizar o conteúdo dinamicamente.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-xs text-gray-500">
                            Preview com dados de exemplo. As variáveis são substituídas automaticamente.
                          </p>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white" style={{ minHeight: "500px" }}>
                          <iframe
                            srcDoc={previewHtml}
                            className="w-full"
                            style={{ height: "600px", border: "none" }}
                            title="Preview do e-mail"
                            sandbox="allow-same-origin"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar: variáveis disponíveis */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-700">Variáveis disponíveis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Insira estas variáveis no HTML para personalizar o e-mail com os dados do usuário.
                  </p>
                  {TEMPLATE_VARS.map((v) => (
                    <div key={v.variable} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                      <code className="text-xs font-mono text-emerald-700 font-semibold block mb-1">
                        {v.variable}
                      </code>
                      <p className="text-xs text-gray-500">{v.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-700">Dados do preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">
                    Valores usados no preview para simular um e-mail real:
                  </p>
                  {Object.entries(PREVIEW_VARS).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="font-mono text-emerald-700">{key}</span>
                      <span className="text-gray-400 mx-1">→</span>
                      <span className="text-gray-600 break-all">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {template?.updatedAt && template.updatedAt > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-gray-400">
                      Última atualização:{" "}
                      <span className="text-gray-600">
                        {new Date(template.updatedAt).toLocaleString("pt-BR")}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
