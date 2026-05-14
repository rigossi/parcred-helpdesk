import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getCorrespondentStatusClass, CORRESPONDENT_STATUS_LABELS } from "@/lib/helpers";
import { trpc } from "@/lib/trpc";
import { BookUser, Mail, MapPin, Pencil, Phone, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type CorrespondentForm = {
  name: string; document: string; email: string; phone: string;
  city: string; state: string; bankCode: string;
  status: string; notes: string; userId: string;
};

const emptyForm: CorrespondentForm = {
  name: "", document: "", email: "", phone: "",
  city: "", state: "", bankCode: "",
  status: "active", notes: "", userId: "",
};

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function Correspondents() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: correspondents = [], refetch } = trpc.correspondents.list.useQuery();
  const { data: users = [] } = trpc.admin.users.useQuery(undefined, { enabled: isAdmin });
  const createMut = trpc.correspondents.create.useMutation({ onSuccess: () => { refetch(); toast.success("Correspondente cadastrado."); setOpen(false); } });
  const updateMut = trpc.correspondents.update.useMutation({ onSuccess: () => { refetch(); toast.success("Correspondente atualizado."); setOpen(false); } });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<CorrespondentForm>(emptyForm);
  const [search, setSearch] = useState("");

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(c: any) {
    setEditing(c.id);
    setForm({
      name: c.name ?? "", document: c.document ?? "", email: c.email ?? "",
      phone: c.phone ?? "", city: c.city ?? "", state: c.state ?? "",
      bankCode: c.bankCode ?? "", status: c.status ?? "active",
      notes: c.notes ?? "", userId: c.userId ? String(c.userId) : "",
    });
    setOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return toast.error("Nome é obrigatório.");
    const data: any = {
      name: form.name, document: form.document || undefined, email: form.email || undefined,
      phone: form.phone || undefined, city: form.city || undefined, state: form.state || undefined,
      bankCode: form.bankCode || undefined, status: form.status as any,
      notes: form.notes || undefined, userId: form.userId ? Number(form.userId) : undefined,
    };
    if (editing) updateMut.mutate({ id: editing, ...data });
    else createMut.mutate(data);
  }

  const filtered = (correspondents as any[]).filter((c: any) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.bankCode ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Correspondentes Bancários
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {(correspondents as any[]).length} correspondente(s) cadastrado(s)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            {isAdmin && (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Correspondente
              </Button>
            )}
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {isAdmin && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <BookUser className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{c.name}</p>
                          {c.document && <p className="text-xs text-muted-foreground">{c.document}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{c.bankCode ?? "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />{c.email}
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />{c.phone}
                          </div>
                        )}
                        {!c.email && !c.phone && <span className="text-muted-foreground text-sm">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(c.city || c.state) ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {[c.city, c.state].filter(Boolean).join(" - ")}
                        </div>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCorrespondentStatusClass(c.status)}`}>
                        {CORRESPONDENT_STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-muted-foreground">
                      {search ? "Nenhum correspondente encontrado para esta busca." : "Nenhum correspondente cadastrado."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Correspondente" : "Novo Correspondente"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome completo / Razão social *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do correspondente" />
              </div>
              <div className="space-y-1.5">
                <Label>CPF / CNPJ</Label>
                <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Código do correspondente</Label>
                <Input value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} placeholder="Ex: CB-001" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Cidade" />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vincular ao usuário</Label>
                <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(users as any[]).map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name ?? u.email ?? u.openId}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informações adicionais..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                {editing ? "Salvar alterações" : "Cadastrar correspondente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
