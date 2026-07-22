// Gestão de Clientes — Painel Admin
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Pencil, KeyRound, Upload, CheckCircle2, UserX } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

export default function ClientsManagement() {
  const [search, setSearch] = useState("");
  const [editClient, setEditClient] = useState<any>(null);
  const [resetClient, setResetClient] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [importing, setImporting] = useState(false);

  const clientsQuery = trpc.clients.list.useQuery();
  const updateMutation = trpc.clients.update.useMutation();
  const resetPasswordMutation = trpc.clients.resetPassword.useMutation();
  const importMutation = trpc.clients.import.useMutation();

  const clients = (clientsQuery.data ?? []).filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf.includes(search.replace(/\D/g, "")) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.proposta?.includes(search)
  );

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        id: editClient.id,
        name: editClient.name,
        email: editClient.email,
        phone: editClient.phone,
        proposta: editClient.proposta,
      });
      toast.success("Cliente atualizado!");
      setEditClient(null);
      clientsQuery.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao atualizar cliente.");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetClient?.userId) {
      toast.error("Este cliente ainda não criou uma conta.");
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({ userId: resetClient.userId, newPassword });
      toast.success("Senha redefinida com sucesso!");
      setResetClient(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao redefinir senha.");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const data = rows.slice(1)
        .filter(r => r[2]) // tem CPF
        .map(([proposta, name, cpf, phone, email]) => ({
          proposta: proposta ? String(proposta).trim() : undefined,
          cpf: String(cpf).replace(/\D/g, ""),
          name: String(name).trim(),
          email: email ? String(email).toLowerCase().trim() : undefined,
          phone: phone ? String(phone).trim() : undefined,
        }));

      const result = await importMutation.mutateAsync(data);
      toast.success(`${result.imported} clientes importados/atualizados!`);
      clientsQuery.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao importar planilha.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  function formatCpf(cpf: string) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500 mt-1">
              {clientsQuery.data?.length ?? 0} clientes elegíveis cadastrados
            </p>
          </div>
          <label className="cursor-pointer">
            <Button variant="outline" disabled={importing} asChild>
              <span>
                {importing
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <Upload className="h-4 w-4 mr-2" />}
                Importar planilha
              </span>
            </Button>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, CPF, e-mail ou proposta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista */}
        {clientsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              Nenhum cliente encontrado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {clients.map(client => (
              <Card key={client.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                      {client.registeredAt ? (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Cadastrado
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 border-0 text-xs gap-1">
                          <UserX className="h-3 w-3" /> Sem conta
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-500">CPF: {formatCpf(client.cpf)}</p>
                      {client.proposta && <p className="text-xs text-gray-500">Proposta: {client.proposta}</p>}
                      {client.email && <p className="text-xs text-gray-500">{client.email}</p>}
                      {client.phone && <p className="text-xs text-gray-500">{client.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditClient({ ...client })}
                      title="Editar dados"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setResetClient(client)}
                      title="Redefinir senha"
                      disabled={!client.registeredAt}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal — Editar cliente */}
      <Dialog open={!!editClient} onOpenChange={v => !v && setEditClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          {editClient && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={editClient.name} onChange={e => setEditClient({ ...editClient, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={editClient.email ?? ""} onChange={e => setEditClient({ ...editClient, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={editClient.phone ?? ""} onChange={e => setEditClient({ ...editClient, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Proposta</Label>
                <Input value={editClient.proposta ?? ""} onChange={e => setEditClient({ ...editClient, proposta: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input value={formatCpf(editClient.cpf)} disabled className="bg-gray-50" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditClient(null)}>Cancelar</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal — Redefinir senha */}
      <Dialog open={!!resetClient} onOpenChange={v => !v && setResetClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha — {resetClient?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetClient(null)}>Cancelar</Button>
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Redefinir senha
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
