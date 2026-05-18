import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatDateTime, ROLE_LABELS } from "@/lib/helpers";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, Loader2, Pencil, Plus, Shield, ShieldCheck, User, Users, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" | "destructive" {
  if (role === "admin") return "destructive";
  if (role === "agent") return "default";
  if (role === "correspondent") return "secondary";
  return "outline";
}

const EMPTY_CREATE_FORM = { name: "", email: "", password: "", role: "user" as string };

type EditForm = {
  userId: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  newPassword: string;
};

export default function UsersManagement() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && user.role !== "admin") setLocation("/dashboard");
  }, [user]);

  const utils = trpc.useUtils();
  const { data: users = [], refetch } = trpc.admin.users.useQuery();
  const { data: departments = [] } = trpc.departments.list.useQuery({ activeOnly: false });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateRoleMut = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { refetch(); toast.success("Perfil atualizado com sucesso."); },
    onError: () => toast.error("Erro ao atualizar perfil."),
  });

  const createUserMut = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Usuário criado com sucesso.");
      setCreateDialogOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
    },
    onError: (err) => toast.error(err.message ?? "Erro ao criar usuário."),
  });

  const updateUserMut = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Usuário atualizado com sucesso.");
    },
    onError: (err) => toast.error(err.message ?? "Erro ao atualizar usuário."),
  });

  const setDeptPermsMut = trpc.admin.setUserDepartmentPermissions.useMutation({
    onSuccess: () => {
      utils.admin.getUserDepartmentPermissions.invalidate();
      toast.success("Permissões de departamento salvas.");
    },
    onError: () => toast.error("Erro ao salvar permissões."),
  });

  // ── Create dialog state ────────────────────────────────────────────────────

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // ── Edit dialog state ──────────────────────────────────────────────────────

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    userId: 0, name: "", email: "", role: "user", active: true, newPassword: "",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Permissões de departamento do usuário em edição
  const { data: editUserDeptPerms = [], refetch: refetchDeptPerms } = trpc.admin.getUserDepartmentPermissions.useQuery(
    { userId: editForm.userId },
    { enabled: editDialogOpen && editForm.userId > 0 }
  );
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);

  // Sincronizar selectedDepts quando as permissões carregarem
  useEffect(() => {
    if (editDialogOpen) setSelectedDepts(editUserDeptPerms);
  }, [editUserDeptPerms, editDialogOpen]);

  function openEditDialog(u: any) {
    setEditForm({
      userId: u.id,
      name: u.name ?? "",
      email: u.email ?? "",
      role: u.role,
      active: u.active,
      newPassword: "",
    });
    setShowEditPassword(false);
    setSelectedDepts([]);
    setEditDialogOpen(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    const { userId, newPassword, ...data } = editForm;
    await updateUserMut.mutateAsync({
      userId,
      name: data.name || undefined,
      email: data.email || undefined,
      active: data.active,
      role: data.role as any,
      newPassword: newPassword || undefined,
    });
    // Salvar permissões de departamento (apenas para admin/agente)
    if (data.role === "admin" || data.role === "agent") {
      await setDeptPermsMut.mutateAsync({ userId, departmentIds: selectedDepts });
    }
    setEditDialogOpen(false);
  }

  function toggleDept(deptId: number) {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId]
    );
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    total: (users as any[]).length,
    admins: (users as any[]).filter((u: any) => u.role === "admin").length,
    agents: (users as any[]).filter((u: any) => u.role === "agent").length,
    correspondents: (users as any[]).filter((u: any) => u.role === "correspondent").length,
  };

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) return toast.error("Preencha todos os campos.");
    createUserMut.mutate({ name: createForm.name, email: createForm.email, password: createForm.password, role: createForm.role as any });
  }

  const isAdminOrAgent = editForm.role === "admin" || editForm.role === "agent";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Gestão de Usuários
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie os perfis de acesso dos usuários do sistema</p>
          </div>
          <Button onClick={() => { setCreateForm(EMPTY_CREATE_FORM); setCreateDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total de Usuários", value: stats.total, icon: Users, color: "text-emerald-700 bg-emerald-50" },
            { label: "Administradores", value: stats.admins, icon: ShieldCheck, color: "text-red-600 bg-red-50" },
            { label: "Agentes de Suporte", value: stats.agents, icon: Shield, color: "text-primary bg-primary/10" },
            { label: "Correspondentes", value: stats.correspondents, icon: User, color: "text-green-600 bg-green-50" },
          ].map((stat) => (
            <Card key={stat.label} className="border shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold">Usuários cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-3">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-center">Perfil</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-52">Alterar perfil</TableHead>
                  <TableHead className="w-16 text-center">Editar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users as any[]).map((u: any) => (
                  <TableRow key={u.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {(u.name ?? u.email ?? "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{u.name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateTime(u.lastSignedIn)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getRoleBadgeVariant(u.role)}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={u.active ? "outline" : "secondary"} className={u.active ? "text-green-700 border-green-300 bg-green-50" : "text-red-600 border-red-200 bg-red-50"}>
                        {u.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(newRole) => {
                          if (u.id === user?.id) return toast.error("Você não pode alterar seu próprio perfil.");
                          updateRoleMut.mutate({ userId: u.id, role: newRole as any });
                        }}
                        disabled={u.id === user?.id}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="correspondent">Correspondente Bancário</SelectItem>
                          <SelectItem value="agent">Agente de Suporte</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(u)}
                        title="Editar usuário"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(users as any[]).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Novo Usuário */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Nome completo</Label>
              <Input
                id="new-name"
                placeholder="João da Silva"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-email">E-mail</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="joao@email.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showCreatePassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-role">Perfil de acesso</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="correspondent">Correspondente Bancário</SelectItem>
                  <SelectItem value="agent">Agente de Suporte</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createUserMut.isPending}>
                {createUserMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Criando…</> : "Criar usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Usuário */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
            {/* Dados cadastrais */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input
                id="edit-name"
                placeholder="Nome completo"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="email@exemplo.com"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Perfil de acesso</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}
                disabled={editForm.userId === user?.id}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="correspondent">Correspondente Bancário</SelectItem>
                  <SelectItem value="agent">Agente de Suporte</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-active"
                checked={editForm.active}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, active: !!v }))}
                disabled={editForm.userId === user?.id}
              />
              <Label htmlFor="edit-active" className="cursor-pointer">Usuário ativo</Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-password">Nova senha <span className="text-muted-foreground font-normal">(deixe em branco para não alterar)</span></Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showEditPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
                  minLength={editForm.newPassword ? 6 : undefined}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Permissões de departamento (apenas para admin/agente) */}
            {isAdminOrAgent && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">Permissões de visualização por departamento</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione os departamentos que este usuário pode visualizar e gerenciar.
                    Se nenhum for selecionado, o usuário terá acesso a <strong>todos os departamentos</strong>.
                  </p>
                  <div className="grid grid-cols-1 gap-2 rounded-lg border p-3 bg-muted/20">
                    {(departments as any[]).map((dept: any) => (
                      <label
                        key={dept.id}
                        className="flex items-center gap-3 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          checked={selectedDepts.includes(dept.id)}
                          onCheckedChange={() => toggleDept(dept.id)}
                        />
                        <span className="text-sm font-medium">{dept.name}</span>
                        {!dept.active && (
                          <Badge variant="secondary" className="text-xs ml-auto">Inativo</Badge>
                        )}
                      </label>
                    ))}
                    {(departments as any[]).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Nenhum departamento cadastrado.</p>
                    )}
                  </div>
                  {selectedDepts.length === 0 ? (
                    <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1">
                      Acesso a todos os departamentos (nenhum filtro aplicado)
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                      Acesso restrito a {selectedDepts.length} departamento{selectedDepts.length !== 1 ? "s" : ""} selecionado{selectedDepts.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateUserMut.isPending || setDeptPermsMut.isPending}>
                {(updateUserMut.isPending || setDeptPermsMut.isPending)
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando…</>
                  : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
