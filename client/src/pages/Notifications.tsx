import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/helpers";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, CheckCheck, Ticket } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const NOTIFICATION_TYPE_ICONS: Record<string, React.ElementType> = {
  ticket_opened: Ticket,
  ticket_updated: Bell,
  ticket_assigned: Bell,
  ticket_resolved: CheckCheck,
  ticket_closed: BellOff,
  sla_warning: Bell,
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  ticket_opened: "Chamado aberto",
  ticket_updated: "Chamado atualizado",
  ticket_assigned: "Chamado atribuído",
  ticket_resolved: "Chamado resolvido",
  ticket_closed: "Chamado encerrado",
  sla_warning: "Alerta de SLA",
};

export default function Notifications() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: notifications = [], refetch } = trpc.notifications.list.useQuery({});
  const markReadMut = trpc.notifications.markRead.useMutation({
    onSuccess: () => { refetch(); utils.notifications.unreadCount.invalidate(); },
  });
  const markAllMut = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { refetch(); utils.notifications.unreadCount.invalidate(); toast.success("Todas as notificações marcadas como lidas."); },
  });

  const unread = (notifications as any[]).filter((n: any) => !n.read).length;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Notificações
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {unread > 0 ? `${unread} notificação(ões) não lida(s)` : "Todas as notificações foram lidas"}
            </p>
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllMut.mutate()} disabled={markAllMut.isPending} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-0">
            {(notifications as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">Nenhuma notificação</p>
                <p className="text-muted-foreground text-sm mt-1">Você será notificado quando houver atualizações nos chamados.</p>
              </div>
            ) : (
              <div className="divide-y">
                {(notifications as any[]).map((n: any) => {
                  const Icon = NOTIFICATION_TYPE_ICONS[n.type] ?? Bell;
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.read ? "bg-primary/5" : "hover:bg-muted/20"}`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!n.read ? "bg-primary/15" : "bg-muted"}`}>
                        <Icon className={`h-4 w-4 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                              {n.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(n.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!n.read && (
                              <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                            )}
                            {n.ticketId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-primary"
                                onClick={() => {
                                  if (!n.read) markReadMut.mutate({ id: n.id });
                                  setLocation(`/tickets/${n.ticketId}`);
                                }}
                              >
                                Ver chamado
                              </Button>
                            )}
                            {!n.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => markReadMut.mutate({ id: n.id })}
                              >
                                Marcar como lida
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
