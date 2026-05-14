import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type TicketForm = {
  departmentId: string;
  title: string;
  description: string;
  ticketType: string;
  priority: string;
};

const emptyForm: TicketForm = {
  departmentId: "",
  title: "",
  description: "",
  ticketType: "",
  priority: "medium",
};

export default function NewTicket() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<TicketForm>(emptyForm);

  const { data: departments = [] } = trpc.departments.list.useQuery({ activeOnly: true });
  const { data: myProfile } = trpc.correspondents.myProfile.useQuery();
  const { data: correspondents = [] } = trpc.correspondents.listForTicket.useQuery(undefined, {
    enabled: user?.role === "admin" || user?.role === "agent",
  });

  const [selectedCorrespondentId, setSelectedCorrespondentId] = useState<string>("");

  const createMut = trpc.tickets.create.useMutation({
    onSuccess: (ticket) => {
      toast.success(`Chamado ${ticket?.ticketNumber ?? ""} aberto com sucesso!`);
      setLocation("/tickets");
    },
    onError: (err) => toast.error("Erro ao abrir chamado: " + err.message),
  });

  function handleSubmit() {
    if (!form.departmentId || !form.title || !form.description || !form.ticketType || !form.priority) {
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

    createMut.mutate({
      correspondentId: correspondentId!,
      departmentId: Number(form.departmentId),
      title: form.title,
      description: form.description,
      ticketType: form.ticketType as any,
      priority: form.priority as any,
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
                        {c.name} {c.bankCode ? `(${c.bankCode})` : ""}
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
                {myProfile.bankCode && <p className="text-xs text-muted-foreground">Código: {myProfile.bankCode}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Departamento *</Label>
                <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments as any[]).map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de chamado *</Label>
                <Select value={form.ticketType} onValueChange={(v) => setForm({ ...form, ticketType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Técnico</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Prioridade *</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "low", label: "Baixa", color: "border-slate-300 data-[selected=true]:bg-slate-100 data-[selected=true]:border-slate-500" },
                  { value: "medium", label: "Média", color: "border-blue-300 data-[selected=true]:bg-blue-100 data-[selected=true]:border-blue-500" },
                  { value: "high", label: "Alta", color: "border-orange-300 data-[selected=true]:bg-orange-100 data-[selected=true]:border-orange-500" },
                  { value: "critical", label: "Crítica", color: "border-red-300 data-[selected=true]:bg-red-100 data-[selected=true]:border-red-500" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    data-selected={form.priority === p.value}
                    onClick={() => setForm({ ...form, priority: p.value })}
                    className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${p.color} ${form.priority === p.value ? "" : "opacity-60 hover:opacity-80"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Título do chamado *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Descreva brevemente o problema ou solicitação"
                maxLength={256}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição detalhada *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva o problema com o máximo de detalhes possível: o que aconteceu, quando ocorreu, qual o impacto..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Quanto mais detalhes, mais rápido conseguimos resolver.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setLocation("/tickets")}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createMut.isPending} className="gap-2">
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
