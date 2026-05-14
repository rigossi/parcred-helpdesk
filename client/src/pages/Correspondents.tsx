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
import { BookUser, Eye, EyeOff, Loader2, Mail, MapPin, Pencil, Phone, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type CreateForm = {
  name: string; document: string; email: string; password: string;
  phone: string; city: string; state: string; status: string; notes: string;
};

type EditForm = {
  name: string; document: string; email: string; newPassword: string;
  phone: string; city: string; state: string; status: string; notes: string;
};

const emptyCreate: CreateForm = { name: "", document: "", email: "", password: "", phone: "", city: "", state: "", status: "active", notes: "" };
const emptyEdit: EditForm = { name: "", document: "", email: "", newPassword: "", phone: "", city: "", state: "", status: "active", notes: "" };

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function Correspondents() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: correspondents = [], refetch } = trpc.correspondents.list.useQuery();

  const createMut = trpc.correspondents.create.useMutation({
    onSuccess: () => { refetch(); toast.success("Correspondente cadastrado com acesso ao sistema."); setOpen(false); },
    onError: (err) => toast.error(err.message ?? "Erro ao cadastrar correspondente."),
  });
  const updateMut = trpc.correspondents.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Correspondente atualizado."); setOpen(false); },
    onError: (err) => toast.error(err.message ?? "Erro ao atualizar correspondente."),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [editForm, setEditForm] = useState<EditForm>(emptyEdit);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState("");

  function openCreate() { setEditing(null); setCreateForm(emptyCreate); setShowPassword(false); setOpen(true); }
  function openEdit(c: any) {
    setEditing(c.id);
    setEditForm({
      name: c.name ?? "", document: c.document ?? "", email: c.email ?? "",
      newPassword: "", phone: c.phone ?? "", city: c.city ?? "",
      state: c.state ?? "", status: c.status ?? "active", notes: c.notes ?? "",
    });
    setShowPassword(false);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) {
      if (!createForm.name.trim()) return toast.error("Nome é obrigatório.");
      if (!createForm.email.trim()) return toast.error("E-mail é obrigatório.");
      if (!createForm.password || createForm.password.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres.");
      createMut.mutate({
        name: createForm.name,
        document: createForm.document || undefined,
        email: createForm.email,
        password: createForm.password,
        phone: createForm.phone || undefined,
        city: createForm.city || undefined,
        state: createForm.state || undefined,
        status: createForm.status as any,
        notes: createForm.notes || undefined,
      });
    } else {
      if (!editForm.name.trim()) return toast.error("Nome é obrigatório.");
      updateMut.mutate({
        id: editing,
        name: editForm.name,
        document: editForm.document || undefined,
        email: editForm.email || undefined,
        newPassword: editForm.newPassword || undefined,
        phone: editForm.phone || undefined,
        city: editForm.city || undefined,
        state: editForm.state || undefined,
        status: editForm.status as any,
        notes: editForm.notes || undefined,
      });
    }
  }

  const filtered = (correspondents as any[]).filter((c: any) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
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
                placeholder="Buscar por nome ou e-mail..."
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

        {/* Tabela */}
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nome</TableHead>
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
                    <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-10 text-muted-foreground">
                      {search ? "Nenhum correspondente encontrado para esta busca." : "Nenhum correspondente cadastrado."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      {isAdmin && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Correspondente" : "Novo Correspondente"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-2">
                {/* Nome */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Nome completo / Razão social *</Label>
                  <Input
                    value={editing ? editForm.name : createForm.name}
                    onChange={(e) => editing ? setEditForm({ ...editForm, name: e.target.value }) : setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Nome do correspondente"
                    required
                  />
                </div>

                {/* CPF/CNPJ */}
                <div className="space-y-1.5">
                  <Label>CPF / CNPJ</Label>
                  <Input
                    value={editing ? editForm.document : createForm.document}
                    onChange={(e) => editing ? setEditForm({ ...editForm, document: e.target.value }) : setCreateForm({ ...createForm, document: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input
                    value={editing ? editForm.phone : createForm.phone}
                    onChange={(e) => editing ? setEditForm({ ...editForm, phone: e.target.value }) : setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <Label>E-mail de acesso {!editing && "*"}</Label>
                  <Input
                    type="email"
                    value={editing ? editForm.email : createForm.email}
                    onChange={(e) => editing ? setEditForm({ ...editForm, email: e.target.value }) : setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    required={!editing}
                  />
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <Label>{editing ? "Nova senha (deixe em branco para manter)" : "Senha de acesso *"}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={editing ? editForm.newPassword : createForm.password}
                      onChange={(e) => editing ? setEditForm({ ...editForm, newPassword: e.target.value }) : setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder={editing ? "••••••••" : "Mínimo 6 caracteres"}
                      required={!editing}
                      minLength={!editing ? 6 : undefined}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Cidade */}
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input
                    value={editing ? editForm.city : createForm.city}
                    onChange={(e) => editing ? setEditForm({ ...editForm, city: e.target.value }) : setCreateForm({ ...createForm, city: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>

                {/* Estado */}
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select
                    value={editing ? editForm.state : createForm.state}
                    onValueChange={(v) => editing ? setEditForm({ ...editForm, state: v }) : setCreateForm({ ...createForm, state: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={editing ? editForm.status : createForm.status}
                    onValueChange={(v) => editing ? setEditForm({ ...editForm, status: v }) : setCreateForm({ ...createForm, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Observações */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea
                    value={editing ? editForm.notes : createForm.notes}
                    onChange={(e) => editing ? setEditForm({ ...editForm, notes: e.target.value }) : setCreateForm({ ...createForm, notes: e.target.value })}
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando…</> : editing ? "Salvar alterações" : "Cadastrar correspondente"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
