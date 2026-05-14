import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, ROLE_LABELS } from "@/lib/helpers";
import { trpc } from "@/lib/trpc";
import { Shield, ShieldCheck, User, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" | "destructive" {
  if (role === "admin") return "destructive";
  if (role === "agent") return "default";
  if (role === "correspondent") return "secondary";
  return "outline";
}

export default function UsersManagement() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && user.role !== "admin") setLocation("/dashboard");
  }, [user]);

  const { data: users = [], refetch } = trpc.admin.users.useQuery();
  const updateRoleMut = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { refetch(); toast.success("Perfil atualizado com sucesso."); },
    onError: () => toast.error("Erro ao atualizar perfil."),
  });

  const stats = {
    total: (users as any[]).length,
    admins: (users as any[]).filter((u: any) => u.role === "admin").length,
    agents: (users as any[]).filter((u: any) => u.role === "agent").length,
    correspondents: (users as any[]).filter((u: any) => u.role === "correspondent").length,
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os perfis de acesso dos usuários do sistema</p>
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
                  <TableHead className="text-center">Perfil atual</TableHead>
                  <TableHead className="w-52">Alterar perfil</TableHead>
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
                  </TableRow>
                ))}
                {(users as any[]).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
