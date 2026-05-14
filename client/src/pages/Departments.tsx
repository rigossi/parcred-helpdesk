import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DeptForm = { name: string; description: string; active: boolean };
const emptyForm: DeptForm = { name: "", description: "", active: true };

export default function Departments() {
  const { data: departments = [], refetch } = trpc.departments.list.useQuery({});
  const createMut = trpc.departments.create.useMutation({ onSuccess: () => { refetch(); toast.success("Departamento criado."); setOpen(false); } });
  const updateMut = trpc.departments.update.useMutation({ onSuccess: () => { refetch(); toast.success("Departamento atualizado."); setOpen(false); } });
  const deleteMut = trpc.departments.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Departamento desativado."); } });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<DeptForm>(emptyForm);

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(d: any) { setEditing(d.id); setForm({ name: d.name, description: d.description ?? "", active: d.active }); setOpen(true); }

  function handleSubmit() {
    if (!form.name.trim()) return toast.error("Nome é obrigatório.");
    if (editing) updateMut.mutate({ id: editing, ...form });
    else createMut.mutate(form);
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Departamentos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie os departamentos de suporte da Parcred</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Departamento
          </Button>
        </div>

        <div className="grid gap-4">
          {departments.map((dept: any) => (
            <Card key={dept.id} className="border shadow-sm">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{dept.name}</span>
                      <Badge variant={dept.active ? "default" : "secondary"} className="text-xs">
                        {dept.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {dept.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{dept.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { if (confirm("Desativar este departamento?")) deleteMut.mutate({ id: dept.id }); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {departments.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Nenhum departamento cadastrado.</p>
                <Button variant="outline" className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" /> Criar primeiro departamento
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Departamento" : "Novo Departamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Suporte Técnico" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o departamento..." rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} id="active" />
              <Label htmlFor="active">Departamento ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? "Salvar alterações" : "Criar departamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
