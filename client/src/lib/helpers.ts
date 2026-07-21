// ─── Label helpers ────────────────────────────────────────────────────────────

export const TICKET_TYPE_LABELS: Record<string, string> = {
  technical: "Técnico",
  commercial: "Comercial",
  financial: "Financeiro",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  waiting_correspondent: "Aguardando Correspondente",
  resolved: "Resolvido",
  closed: "Encerrado",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  agent: "Agente de Suporte",
  correspondent: "Parceiro",
  user: "Usuário",
  client: "Cliente",
};

export const CORRESPONDENT_STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
};

// ─── Color helpers ────────────────────────────────────────────────────────────

export function getPriorityClass(priority: string): string {
  const map: Record<string, string> = {
    low: "bg-slate-100 text-slate-700 border-slate-200",
    medium: "bg-emerald-100 text-emerald-700 border-emerald-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    critical: "bg-red-100 text-red-700 border-red-200",
  };
  return map[priority] ?? "bg-gray-100 text-gray-700";
}

export function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    open: "bg-teal-100 text-teal-800 border-teal-200",
    in_progress: "bg-amber-100 text-amber-800 border-amber-200",
    waiting_correspondent: "bg-purple-100 text-purple-800 border-purple-200",
    resolved: "bg-green-100 text-green-800 border-green-200",
    closed: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

export function getCorrespondentStatusClass(status: string): string {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
    suspended: "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours}h`;
  if (days < 7) return `há ${days} dias`;
  return formatDate(date);
}

export function isSlaAtRisk(deadline: Date | string | null | undefined): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  const now = new Date();
  const hoursLeft = (d.getTime() - now.getTime()) / 3600000;
  return hoursLeft > 0 && hoursLeft < 2;
}

export function isSlaBreached(deadline: Date | string | null | undefined): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}
