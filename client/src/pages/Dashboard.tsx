import DashboardLayout from "@/components/DashboardLayout";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  formatDateTime,
  formatRelativeTime,
  getPriorityClass,
  getStatusClass,
  isSlaAtRisk,
  isSlaBreached,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_TYPE_LABELS,
} from "@/lib/helpers";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertTriangle,
  BookUser,
  CheckCircle2,
  Clock,
  ClipboardList,
  Gauge,
  Headphones,
  PlusCircle,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats } = trpc.tickets.stats.useQuery();
  const { data: tickets = [] } = trpc.tickets.list.useQuery({});
  const { data: departments = [] } = trpc.departments.list.useQuery({});
  const { data: correspondents = [] } = trpc.correspondents.list.useQuery();
  const { data: users = [] } = trpc.admin.users.useQuery();
  const { data: myDeptPerms = [] } = trpc.tickets.myDepartmentPermissions.useQuery();

  const recentTickets = (tickets as any[]).slice(0, 5);
  const getDeptName = (id: number) => (departments as any[]).find((d: any) => d.id === id)?.name ?? "—";

  const totalTickets = stats?.total ?? 0;
  const resolvedRate = totalTickets > 0 ? Math.round(((stats?.resolved ?? 0) + (stats?.closed ?? 0)) / totalTickets * 100) : 0;

  const filteredDeptNames = (myDeptPerms as number[])
    .map((id) => (departments as any[]).find((d: any) => d.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Painel Administrativo
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema de help desk da Parcred</p>
        {filteredDeptNames.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5 w-fit">
            <span className="font-semibold">Visão filtrada:</span>
            <span>{filteredDeptNames.join(" · ")}</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total de Chamados", value: stats?.total ?? 0, icon: ClipboardList, color: "text-emerald-700 bg-emerald-50", sub: "todos os status" },
          { label: "Em Aberto", value: stats?.open ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50", sub: "aguardando atendimento" },
          { label: "Em Andamento", value: stats?.inProgress ?? 0, icon: Headphones, color: "text-primary bg-primary/10", sub: "sendo atendidos" },
          { label: "Resolvidos", value: (stats?.resolved ?? 0) + (stats?.closed ?? 0), icon: CheckCircle2, color: "text-green-600 bg-green-50", sub: "concluídos" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{kpi.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Resolution rate */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Taxa de Resolução
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-foreground">{resolvedRate}%</span>
              <span className="text-muted-foreground text-sm mb-1">dos chamados resolvidos</span>
            </div>
            <Progress value={resolvedRate} className="h-2" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Abertos", value: stats?.open ?? 0, color: "text-teal-700" },
                { label: "Em Andamento", value: stats?.inProgress ?? 0, color: "text-amber-600" },
                { label: "Resolvidos", value: stats?.resolved ?? 0, color: "text-green-600" },
                { label: "Encerrados", value: stats?.closed ?? 0, color: "text-gray-600" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className={`font-semibold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Resumo do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Correspondentes ativos", value: (correspondents as any[]).filter((c: any) => c.status === "active").length, icon: BookUser },
              { label: "Usuários cadastrados", value: (users as any[]).length, icon: Users },
              { label: "Departamentos ativos", value: (departments as any[]).filter((d: any) => d.active).length, icon: Headphones },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <span className="font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SLA alerts */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Alertas de SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const alerts = (tickets as any[]).filter((t: any) =>
                (isSlaAtRisk(t.resolutionDeadline) || isSlaBreached(t.resolutionDeadline)) &&
                t.status !== "resolved" && t.status !== "closed"
              );
              if (alerts.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum alerta de SLA no momento.</p>
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  {alerts.slice(0, 4).map((t: any) => (
                    <div key={t.id} className={`p-2.5 rounded-lg border text-xs ${isSlaBreached(t.resolutionDeadline) ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
                      <p className="font-medium">{t.ticketNumber}</p>
                      <p className="text-muted-foreground truncate">{t.title}</p>
                    </div>
                  ))}
                  {alerts.length > 4 && <p className="text-xs text-muted-foreground text-center">+{alerts.length - 4} mais</p>}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Recent tickets */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">Chamados Recentes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/tickets")} className="text-xs text-primary">
            Ver todos
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentTickets.map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() => setLocation(`/tickets/${t.id}`)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-primary font-semibold w-28 shrink-0">{t.ticketNumber}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground line-clamp-1">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{getDeptName(t.departmentId)} · {formatRelativeTime(t.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityClass(t.priority)}`}>
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(t.status)}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
              </div>
            ))}
            {recentTickets.length === 0 && (
              <div className="px-6 py-10 text-center text-muted-foreground text-sm">
                Nenhum chamado registrado ainda.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Agent Dashboard ──────────────────────────────────────────────────────────

function AgentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: myTickets = [] } = trpc.tickets.myTickets.useQuery();
  const { data: allTickets = [] } = trpc.tickets.list.useQuery({});
  const { data: departments = [] } = trpc.departments.list.useQuery({});

  const getDeptName = (id: number) => (departments as any[]).find((d: any) => d.id === id)?.name ?? "—";

  const myOpen = (myTickets as any[]).filter((t: any) => t.status === "in_progress" || t.status === "open");
  const unassigned = (allTickets as any[]).filter((t: any) => !t.assignedToUserId && (t.status === "open"));
  const slaAlerts = (allTickets as any[]).filter((t: any) =>
    (isSlaAtRisk(t.resolutionDeadline) || isSlaBreached(t.resolutionDeadline)) &&
    t.status !== "resolved" && t.status !== "closed"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Painel do Agente
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Bem-vindo, {user?.name}. Sua fila de atendimento.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Meus chamados ativos", value: myOpen.length, icon: Headphones, color: "text-primary bg-primary/10" },
          { label: "Sem atribuição", value: unassigned.length, icon: Clock, color: "text-amber-600 bg-amber-50" },
          { label: "Alertas de SLA", value: slaAlerts.length, icon: AlertTriangle, color: slaAlerts.length > 0 ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50" },
          { label: "Total na fila", value: (allTickets as any[]).filter((t: any) => t.status !== "closed").length, icon: ClipboardList, color: "text-emerald-700 bg-emerald-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{kpi.label}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My tickets */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Meus Chamados Ativos</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/tickets")} className="text-xs text-primary">Ver todos</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {myOpen.slice(0, 6).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 cursor-pointer" onClick={() => setLocation(`/tickets/${t.id}`)}>
                  <div>
                    <p className="text-xs font-mono text-primary font-semibold">{t.ticketNumber}</p>
                    <p className="text-sm font-medium line-clamp-1">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{getDeptName(t.departmentId)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getPriorityClass(t.priority)}`}>
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                </div>
              ))}
              {myOpen.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">Nenhum chamado ativo atribuído a você.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Unassigned */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Chamados Sem Atribuição</CardTitle>
            <Badge variant="secondary">{unassigned.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {unassigned.slice(0, 6).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 cursor-pointer" onClick={() => setLocation(`/tickets/${t.id}`)}>
                  <div>
                    <p className="text-xs font-mono text-primary font-semibold">{t.ticketNumber}</p>
                    <p className="text-sm font-medium line-clamp-1">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(t.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getPriorityClass(t.priority)}`}>
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                </div>
              ))}
              {unassigned.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">Todos os chamados estão atribuídos.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Correspondent Dashboard ──────────────────────────────────────────────────

function CorrespondentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: tickets = [] } = trpc.tickets.myTickets.useQuery();
  const { data: myProfile } = trpc.correspondents.myProfile.useQuery();

  const open = (tickets as any[]).filter((t: any) => t.status === "open").length;
  const inProgress = (tickets as any[]).filter((t: any) => t.status === "in_progress").length;
  const resolved = (tickets as any[]).filter((t: any) => t.status === "resolved" || t.status === "closed").length;
  const recent = (tickets as any[]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Meu Painel
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {myProfile ? `${myProfile.name}${myProfile.bankCode ? ` · Código: ${myProfile.bankCode}` : ""}` : `Olá, ${user?.name}`}
          </p>
        </div>
        <Button onClick={() => setLocation("/tickets/new")} className="gap-2">
          <PlusCircle className="h-4 w-4" /> Abrir Chamado
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Abertos", value: open, icon: Clock, color: "text-teal-700 bg-teal-50" },
          { label: "Em Andamento", value: inProgress, icon: Headphones, color: "text-amber-600 bg-amber-50" },
          { label: "Resolvidos", value: resolved, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{kpi.label}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">Chamados Recentes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/tickets")} className="text-xs text-primary">Ver todos</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recent.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 cursor-pointer" onClick={() => setLocation(`/tickets/${t.id}`)}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-primary font-semibold w-28 shrink-0">{t.ticketNumber}</span>
                  <div>
                    <p className="text-sm font-medium line-clamp-1">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{TICKET_TYPE_LABELS[t.ticketType]} · {formatRelativeTime(t.createdAt)}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getStatusClass(t.status)}`}>
                  {STATUS_LABELS[t.status]}
                </span>
              </div>
            ))}
            {recent.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">Você ainda não abriu nenhum chamado.</p>
                <Button variant="outline" className="mt-4" onClick={() => setLocation("/tickets/new")}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Abrir primeiro chamado
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user?.role === "client") navigate("/portal");
  }, [user]);

  return (
    <DashboardLayout>
      {user?.role === "admin" && <AdminDashboard />}
      {user?.role === "agent" && <AgentDashboard />}
      {(user?.role === "correspondent" || user?.role === "user") && <CorrespondentDashboard />}
    </DashboardLayout>
  );
}
