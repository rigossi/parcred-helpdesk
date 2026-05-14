import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatDateTime,
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
import { AlertTriangle, Clock, PlusCircle, Search, Ticket } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function TicketsList() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const isStaffRole = user?.role === "admin" || user?.role === "agent";
  const { data: tickets = [], isLoading } = isStaffRole
    ? trpc.tickets.list.useQuery({})
    : trpc.tickets.myTickets.useQuery();
  const { data: departments = [] } = trpc.departments.list.useQuery({});

  const getDeptName = (id: number) => (departments as any[]).find((d: any) => d.id === id)?.name ?? "—";

  const filtered = (tickets as any[]).filter((t: any) => {
    const matchSearch = !search ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchType = typeFilter === "all" || t.ticketType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const isCorrespondent = user?.role === "correspondent";

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {isCorrespondent ? "Meus Chamados" : user?.role === "agent" ? "Fila de Chamados" : "Todos os Chamados"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {filtered.length} chamado(s) encontrado(s)
            </p>
          </div>
          {isCorrespondent && (
            <Button onClick={() => setLocation("/tickets/new")} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Abrir Chamado
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="waiting_correspondent">Aguardando Correspondente</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="closed">Encerrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="technical">Técnico</SelectItem>
              <SelectItem value="commercial">Comercial</SelectItem>
              <SelectItem value="financial">Financeiro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Prioridade</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Abertura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Carregando chamados...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Ticket className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">Nenhum chamado encontrado.</p>
                        {isCorrespondent && (
                          <Button variant="outline" onClick={() => setLocation("/tickets/new")} className="mt-1">
                            <PlusCircle className="h-4 w-4 mr-2" /> Abrir primeiro chamado
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t: any) => {
                    const atRisk = isSlaAtRisk(t.resolutionDeadline);
                    const breached = isSlaBreached(t.resolutionDeadline) && t.status !== "resolved" && t.status !== "closed";
                    return (
                      <TableRow
                        key={t.id}
                        className="hover:bg-muted/20 cursor-pointer"
                        onClick={() => setLocation(`/tickets/${t.id}`)}
                      >
                        <TableCell className="font-mono text-sm font-medium text-primary">{t.ticketNumber}</TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground line-clamp-1 max-w-xs">{t.title}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{getDeptName(t.departmentId)}</TableCell>
                        <TableCell className="text-sm">{TICKET_TYPE_LABELS[t.ticketType] ?? t.ticketType}</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityClass(t.priority)}`}>
                            {PRIORITY_LABELS[t.priority] ?? t.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(t.status)}`}>
                            {STATUS_LABELS[t.status] ?? t.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {t.resolutionDeadline ? (
                            <div className={`flex items-center gap-1.5 text-xs ${breached ? "text-red-600" : atRisk ? "text-orange-600" : "text-muted-foreground"}`}>
                              {(breached || atRisk) && <AlertTriangle className="h-3.5 w-3.5" />}
                              <Clock className="h-3.5 w-3.5" />
                              {formatDateTime(t.resolutionDeadline)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDateTime(t.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
