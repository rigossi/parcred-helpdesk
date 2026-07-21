// Portal do Cliente — Dashboard v2
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, LogOut, TicketCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open:        { label: "Aberto",      color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Em andamento", color: "bg-yellow-100 text-yellow-700" },
  waiting:     { label: "Aguardando",   color: "bg-purple-100 text-purple-700" },
  resolved:    { label: "Resolvido",    color: "bg-green-100 text-green-700" },
  closed:      { label: "Fechado",      color: "bg-gray-100 text-gray-600" },
};

export default function PortalDashboard() {
  const [, navigate] = useLocation();
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });

  const ticketsQuery = trpc.clientPortal.myTickets.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redireciona se não for cliente
  if (user && user.role !== "client") {
    navigate("/dashboard");
    return null;
  }

  const tickets = ticketsQuery.data ?? [];
  const open = tickets.filter(t => ["open", "in_progress", "waiting"].includes(t.status)).length;
  const resolved = tickets.filter(t => ["resolved", "closed"].includes(t.status)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Parcred" className="w-8 h-auto" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Portal do Cliente</p>
            <p className="text-xs text-gray-500">{user?.name}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{open}</p>
                <p className="text-xs text-gray-500">Em aberto</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{resolved}</p>
                <p className="text-xs text-gray-500">Resolvidos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <Button className="w-full" onClick={() => navigate("/portal/novo-chamado")}>
          <Plus className="h-4 w-4 mr-2" />
          Abrir novo chamado
        </Button>

        {/* Lista de chamados */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Meus chamados</h2>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="py-10 flex flex-col items-center gap-2 text-gray-400">
                <TicketCheck className="h-10 w-10" />
                <p className="text-sm">Nenhum chamado aberto ainda.</p>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => {
              const status = STATUS_MAP[ticket.status] ?? { label: ticket.status, color: "bg-gray-100 text-gray-600" };
              return (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/portal/chamado/${ticket.id}`)}
                >
                  <CardContent className="py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">
                        {ticket.ticketNumber} · {format(new Date(ticket.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                    </div>
                    <Badge className={`${status.color} border-0 shrink-0 text-xs`}>
                      {status.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
