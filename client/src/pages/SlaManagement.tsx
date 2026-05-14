import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPriorityClass, PRIORITY_LABELS, TICKET_TYPE_LABELS } from "@/lib/helpers";
import { trpc } from "@/lib/trpc";
import { Clock, Pencil, Plus, Timer, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type SlaForm = {
  departmentId: string;
  name: string;
  ticketType: string;
  priority: string;
  responseTimeHours: string;
  resolutionTimeHours: string;
  active: boolean;
};

const emptyForm: SlaForm = {
  departmentId: "",
  name: "",
  ticketType: "",
  priority: "",
  responseTimeHours: "",
  resolutionTimeHours: "",
  active: true,
};

export default function SlaManagement() {
  const { data: policies = [], refetch } = trpc.sla.list.useQuery({});
  const { data: departments = [] } = trpc.departments.list.useQuery({ activeOnly: true });
  const createMut = trpc.sla.create.useMutation({ onSuccess: () => { refetch(); toast.success("Política de SLA criada."); setOpen(false); } });
  const updateMut = trpc.sla.update.useMutation({ onSuccess: () => { refetch(); toast.success("Política de SLA atualizada."); setOpen(false); } });
  const deleteMut = trpc.sla.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Política desativada."); } });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<SlaForm>(emptyForm);
  const [filterDept, setFilterDept] = useState<string>("all");

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(p: any) {
    setEditing(p.id);
    setForm({
      departmentId: String(p.departmentId),
      name: p.name,
      ticketType: p.ticketType,
      priority: p.priority,
      responseTimeHours: String(p.responseTimeHours),
      resolutionTimeHours: String(p.resolutionTimeHours),
      active: p.active,
    });
    setOpen(true);
  }

  function handleSubmit() {
    if (!form.name || !form.departmentId || !form.ticketType || !form.priority || !form.responseTimeHours || !form.resolutionTimeHours) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }
    const data = {
      departmentId: Number(form.departmentId),
      name: form.name,
      ticketType: form.ticketType as any,
      priority: form.priority as any,
      responseTimeHours: Number(form.responseTimeHours),
      resolutionTimeHours: Number(form.resolutionTimeHours),
      active: form.active,
    };
    if (editing) updateMut.mutate({ id: editing, name: data.name, responseTimeHours: data.responseTimeHours, resolutionTimeHours: data.resolutionTimeHours, active: data.active });
    else createMut.mutate(data);
  }

  const getDeptName = (id: number) => (departments as any[]).find((d) => d.id === id)?.name ?? "—";

  const filtered = filterDept === "all" ? policies : (policies as any[]).filter((p: any) => String(p.departmentId) === filterDept);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Políticas de SLA
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Defina prazos de resposta e resolução por tipo de chamado</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {(departments as any[]).map((d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Política
            </Button>
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nome</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead className="text-center">Resposta</TableHead>
                  <TableHead className="text-center">Resolução</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filtered as any[]).map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{getDeptName(p.departmentId)}</TableCell>
                    <TableCell>{TICKET_TYPE_LABELS[p.ticketType] ?? p.ticketType}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityClass(p.priority)}`}>
                        {PRIORITY_LABELS[p.priority] ?? p.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {p.responseTimeHours}h
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                        {p.resolutionTimeHours}h
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.active ? "default" : "secondary"} className="text-xs">
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("Desativar esta política?")) deleteMut.mutate({ id: p.id }); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhuma política de SLA encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Política de SLA" : "Nova Política de SLA"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Técnico - Crítico" />
            </div>
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label>Departamento *</Label>
                  <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(departments as any[]).map((d: any) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de Chamado *</Label>
                  <Select value={form.ticketType} onValueChange={(v) => setForm({ ...form, ticketType: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Técnico</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Prioridade *</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Prazo de Resposta (horas) *</Label>
              <Input type="number" min="1" value={form.responseTimeHours} onChange={(e) => setForm({ ...form, responseTimeHours: e.target.value })} placeholder="Ex: 4" />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo de Resolução (horas) *</Label>
              <Input type="number" min="1" value={form.resolutionTimeHours} onChange={(e) => setForm({ ...form, resolutionTimeHours: e.target.value })} placeholder="Ex: 24" />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} id="sla-active" />
              <Label htmlFor="sla-active">Política ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? "Salvar alterações" : "Criar política"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
