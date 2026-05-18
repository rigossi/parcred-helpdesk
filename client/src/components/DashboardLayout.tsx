import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { ROLE_LABELS } from "@/lib/helpers";
import {
  Bell,
  BookUser,
  Building2,
  ChevronDown,
  ClipboardList,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  PlusCircle,
  Timer,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

// ─── Menu items por perfil ────────────────────────────────────────────────────

type MenuItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  section?: string;
};

function getMenuItems(role: string): MenuItem[] {
  if (role === "admin") {
    return [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", section: "Principal" },
      { icon: ClipboardList, label: "Todos os Chamados", path: "/tickets", section: "Atendimento" },
      { icon: BookUser, label: "Correspondentes", path: "/correspondents", section: "Cadastros" },
      { icon: Building2, label: "Departamentos", path: "/departments", section: "Cadastros" },
      { icon: Timer, label: "Políticas de SLA", path: "/sla", section: "Cadastros" },
      { icon: Users, label: "Usuários", path: "/users", section: "Administração" },
    ];
  }
  if (role === "agent") {
    return [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", section: "Principal" },
      { icon: ClipboardList, label: "Fila de Chamados", path: "/tickets", section: "Atendimento" },
    ];
  }
  // correspondent / user
  return [
    { icon: Gauge, label: "Meu Painel", path: "/dashboard", section: "Principal" },
    { icon: ClipboardList, label: "Meus Chamados", path: "/tickets", section: "Chamados" },
  ];
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

// ─── Layout principal ─────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-10 max-w-md w-full mx-4 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <img
              src="/manus-storage/parcred-logo_c55658d2.png"
              alt="Parcred"
              className="h-16 w-auto mb-2 drop-shadow-md"
            />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Parcred Help Desk
            </h1>
            <p className="text-sm text-gray-500 text-center">
              Plataforma de suporte aos correspondentes bancários
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = "/"; }}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg"
          >
            Ir para o login
          </Button>
          <p className="text-xs text-gray-400 text-center">
            Grupo Angar · Parcred Brasil
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

// ─── Conteúdo interno ─────────────────────────────────────────────────────────

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Modal de alterar senha
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setShowChangePassword(false);
      setCpCurrent(""); setCpNew(""); setCpConfirm("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleChangePassword = () => {
    if (cpNew !== cpConfirm) { toast.error("As senhas não conferem."); return; }
    if (cpNew.length < 6) { toast.error("A nova senha deve ter ao menos 6 caracteres."); return; }
    changePasswordMutation.mutate({ currentPassword: cpCurrent, newPassword: cpNew });
  };

  const role = user?.role ?? "user";
  const menuItems = getMenuItems(role);

  // Notificações não lidas
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // Agrupar itens por seção
  const sections = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const s = item.section ?? "Menu";
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {});

  const activeItem = menuItems.find((i) => location === i.path || location.startsWith(i.path + "/"));

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Alternar menu"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/70" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src="/manus-storage/parcred-logo_c55658d2.png"
                    alt="Parcred"
                    className="h-8 w-auto brightness-0 invert"
                  />
                  <span className="text-xs text-sidebar-foreground/50 truncate font-medium">Help Desk</span>
                </div>
              ) : (
                <img
                  src="/manus-storage/parcred-logo_c55658d2.png"
                  alt="Parcred"
                  className="h-6 w-auto brightness-0 invert"
                />
              )}
            </div>
          </SidebarHeader>

          {/* Botão Novo Chamado — visível para todos os perfis */}
          <div className="px-3 pt-3 pb-1">
            <button
              onClick={() => setLocation("/tickets/new")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-semibold py-2.5 px-4 shadow-md hover:opacity-90 active:scale-[0.97] transition-all text-sm"
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Abrir Chamado</span>}
            </button>
          </div>

          {/* Menu */}
          <SidebarContent className="gap-0 py-2">
            {Object.entries(sections).map(([section, items], idx) => (
              <div key={section}>
                {idx > 0 && <SidebarSeparator className="my-1 bg-sidebar-border/50" />}
                {!isCollapsed && (
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                    {section}
                  </p>
                )}
                <SidebarMenu className="px-2">
                  {items.map((item) => {
                    const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path));
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 transition-all font-medium text-sm ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                        >
                          <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
                    <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">
                        {user?.name ?? "Usuário"}
                      </p>
                      <p className="text-xs text-sidebar-foreground/50 truncate mt-1">
                        {ROLE_LABELS[role] ?? role}
                      </p>
                    </div>
                  )}
                  {!isCollapsed && <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/notifications")} className="cursor-pointer">
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Notificações</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0 h-5">
                      {unreadCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowChangePassword(true)} className="cursor-pointer">
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Alterar senha</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Mobile header */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-semibold text-sm">{activeItem?.label ?? "Menu"}</span>
            </div>
            <button onClick={() => setLocation("/notifications")} className="relative p-2 rounded-lg hover:bg-accent transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
          </div>
        )}

        {/* Desktop header */}
        {!isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-6 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">{activeItem?.label ?? "Parcred Help Desk"}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocation("/notifications")}
                className="relative p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Notificações"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-0.5 -right-0.5 text-[10px] px-1 py-0 h-4 min-w-4 flex items-center justify-center"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>

      {/* Modal: Alterar Senha */}
      <Dialog open={showChangePassword} onOpenChange={(open) => { setShowChangePassword(open); if (!open) { setCpCurrent(""); setCpNew(""); setCpConfirm(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Alterar Senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cp-current">Senha atual</Label>
              <Input id="cp-current" type="password" value={cpCurrent} onChange={(e) => setCpCurrent(e.target.value)} placeholder="Digite sua senha atual" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-new">Nova senha</Label>
              <Input id="cp-new" type="password" value={cpNew} onChange={(e) => setCpNew(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-confirm">Confirmar nova senha</Label>
              <Input id="cp-confirm" type="password" value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} placeholder="Repita a nova senha" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePassword(false)}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? "Salvando..." : "Salvar senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
