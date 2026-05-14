import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  correspondents,
  departments,
  notifications,
  passwordResetTokens,
  slaPolicies,
  ticketAttachments,
  ticketMessages,
  tickets,
  users,
} from "../drizzle/schema";
import type {
  InsertCorrespondent,
  InsertDepartment,
  InsertNotification,
  InsertSlaPolicy,
  InsertTicket,
  InsertTicketAttachment,
  InsertTicketMessage,
  InsertUser,
} from "../drizzle/schema";

export {
  users,
  departments,
  slaPolicies,
  correspondents,
  tickets,
  ticketMessages,
  ticketAttachments,
  notifications,
};

// ─── DB connection ────────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function createUser(data: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values(data);
  const created = await getUserByEmail(data.email!);
  return created!;
}

export async function updateUserLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "agent" | "correspondent") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// ─── Password Reset Tokens ────────────────────────────────────────────────────────────────────────────────

export async function createPasswordResetToken(userId: number, token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Invalidar tokens anteriores do usuário
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  return result[0] ?? undefined;
}

export async function markPasswordResetTokenUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
}

// ─── Departments ──────────────────────────────────────────────────────────────

export async function getDepartments(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(departments).where(eq(departments.active, true)).orderBy(departments.name);
  }
  return db.select().from(departments).orderBy(departments.name);
}

export async function getDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function createDepartment(data: InsertDepartment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(departments).values(data);
  const all = await db.select().from(departments).orderBy(desc(departments.createdAt)).limit(1);
  return all[0];
}

export async function updateDepartment(id: number, data: Partial<InsertDepartment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(departments).set(data).where(eq(departments.id, id));
  return getDepartmentById(id);
}

// ─── SLA Policies ─────────────────────────────────────────────────────────────

export async function getSlaPolicies(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(slaPolicies).where(eq(slaPolicies.active, true)).orderBy(slaPolicies.name);
  }
  return db.select().from(slaPolicies).orderBy(slaPolicies.name);
}

export async function getSlaPolicyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(slaPolicies).where(eq(slaPolicies.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getSlaPolicyByDeptAndType(
  departmentId: number,
  ticketType: "technical" | "commercial" | "financial",
  priority: "low" | "medium" | "high" | "critical"
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(slaPolicies)
    .where(
      and(
        eq(slaPolicies.departmentId, departmentId),
        eq(slaPolicies.ticketType, ticketType),
        eq(slaPolicies.priority, priority),
        eq(slaPolicies.active, true)
      )
    )
    .limit(1);
  return result[0] ?? undefined;
}

export async function createSlaPolicy(data: InsertSlaPolicy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(slaPolicies).values(data);
  const all = await db.select().from(slaPolicies).orderBy(desc(slaPolicies.createdAt)).limit(1);
  return all[0];
}

export async function updateSlaPolicy(id: number, data: Partial<InsertSlaPolicy>) {
  const db = await getDb();
  if (!db) return;
  await db.update(slaPolicies).set(data).where(eq(slaPolicies.id, id));
  return getSlaPolicyById(id);
}

// ─── Correspondents ───────────────────────────────────────────────────────────

export async function getCorrespondents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(correspondents).orderBy(correspondents.name);
}

export async function getCorrespondentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(correspondents).where(eq(correspondents.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getCorrespondentByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(correspondents).where(eq(correspondents.userId, userId)).limit(1);
  return result[0] ?? undefined;
}

export async function createCorrespondent(data: InsertCorrespondent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(correspondents).values(data);
  const all = await db.select().from(correspondents).orderBy(desc(correspondents.createdAt)).limit(1);
  return all[0];
}

export async function updateCorrespondent(id: number, data: Partial<InsertCorrespondent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(correspondents).set(data).where(eq(correspondents.id, id));
  return getCorrespondentById(id);
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export async function getTickets(filters?: {
  status?: string;
  correspondentId?: number;
  assignedToUserId?: number;
  departmentId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.status) conditions.push(eq(tickets.status, filters.status as any));
  if (filters?.correspondentId) conditions.push(eq(tickets.correspondentId, filters.correspondentId));
  if (filters?.assignedToUserId) conditions.push(eq(tickets.assignedToUserId, filters.assignedToUserId));
  if (filters?.departmentId) conditions.push(eq(tickets.departmentId, filters.departmentId));

  const query = db.select().from(tickets);
  const result = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(tickets.createdAt))
    : await query.orderBy(desc(tickets.createdAt));

  return result;
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getTicketStats() {
  const db = await getDb();
  if (!db) return { open: 0, inProgress: 0, resolved: 0, closed: 0, total: 0 };

  const all = await db.select().from(tickets);
  return {
    open: all.filter((t) => t.status === "open").length,
    inProgress: all.filter((t) => t.status === "in_progress").length,
    waitingCorrespondent: all.filter((t) => t.status === "waiting_correspondent").length,
    resolved: all.filter((t) => t.status === "resolved").length,
    closed: all.filter((t) => t.status === "closed").length,
    total: all.length,
  };
}

export async function createTicket(data: Omit<InsertTicket, 'ticketNumber'> & { slaPolicyId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Gerar número do ticket
  const count = await db.select().from(tickets);
  const ticketNumber = `TK${String(count.length + 1).padStart(6, "0")}`;

  // Calcular deadline SLA
  let resolutionDeadline: Date | undefined;
  let responseDeadline: Date | undefined;
  if (data.slaPolicyId) {
    const sla = await getSlaPolicyById(data.slaPolicyId);
    if (sla) {
      responseDeadline = new Date(Date.now() + sla.responseTimeHours * 60 * 60 * 1000);
      resolutionDeadline = new Date(Date.now() + sla.resolutionTimeHours * 60 * 60 * 1000);
    }
  }

  await db.insert(tickets).values({ ...data, ticketNumber, responseDeadline, resolutionDeadline });
  const all = await db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(1);
  return all[0];
}

export async function updateTicket(id: number, data: Partial<InsertTicket> & { firstResponseAt?: Date; resolvedAt?: Date; closedAt?: Date }) {
  const db = await getDb();
  if (!db) return;
  await db.update(tickets).set(data as any).where(eq(tickets.id, id));
}

// ─── Ticket Messages ──────────────────────────────────────────────────────────

export async function getTicketMessages(ticketId: number, includeInternal = false) {
  const db = await getDb();
  if (!db) return [];

  if (includeInternal) {
    return db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
  }
  return db
    .select()
    .from(ticketMessages)
    .where(and(eq(ticketMessages.ticketId, ticketId), eq(ticketMessages.isInternal, false)))
    .orderBy(ticketMessages.createdAt);
}

export async function createTicketMessage(data: InsertTicketMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(ticketMessages).values(data);
  const all = await db.select().from(ticketMessages).orderBy(desc(ticketMessages.createdAt)).limit(1);
  return all[0];
}

// ─── Ticket Attachments ───────────────────────────────────────────────────────

export async function getTicketAttachments(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ticketAttachments).where(eq(ticketAttachments.ticketId, ticketId)).orderBy(ticketAttachments.createdAt);
}

export async function createTicketAttachment(data: InsertTicketAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(ticketAttachments).values(data);
  const all = await db.select().from(ticketAttachments).orderBy(desc(ticketAttachments.createdAt)).limit(1);
  return all[0];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getUserNotifications(userId: number, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];

  if (unreadOnly) {
    return db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return result.length;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ read: true, readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ read: true, readAt: new Date() }).where(eq(notifications.userId, userId));
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}
