import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  correspondents,
  departments,
  notifications,
  slaPolicies,
  ticketAttachments,
  ticketMessages,
  tickets,
  users,
  type InsertCorrespondent,
  type InsertDepartment,
  type InsertNotification,
  type InsertSlaPolicy,
  type InsertTicket,
  type InsertTicketAttachment,
  type InsertTicketMessage,
  type InsertUser,
} from "../drizzle/schema";

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const { ENV } = await import("./_core/env");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "agent" | "correspondent") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Departments ──────────────────────────────────────────────────────────────

export async function getDepartments(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(departments);
  if (activeOnly) return query.where(eq(departments.active, true)).orderBy(departments.name);
  return query.orderBy(departments.name);
}

export async function getDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result[0];
}

export async function createDepartment(data: InsertDepartment) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(departments).values(data);
  return result[0];
}

export async function updateDepartment(id: number, data: Partial<InsertDepartment>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(departments).set(data).where(eq(departments.id, id));
}

export async function deleteDepartment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(departments).set({ active: false }).where(eq(departments.id, id));
}

// ─── SLA Policies ─────────────────────────────────────────────────────────────

export async function getSlaPolicies(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(slaPolicies).where(eq(slaPolicies.active, true)).orderBy(slaPolicies.departmentId, slaPolicies.priority);
  }
  return db.select().from(slaPolicies).orderBy(slaPolicies.departmentId, slaPolicies.priority);
}

export async function getSlaPolicyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(slaPolicies).where(eq(slaPolicies.id, id)).limit(1);
  return result[0];
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
  return result[0];
}

export async function createSlaPolicy(data: InsertSlaPolicy) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(slaPolicies).values(data);
}

export async function updateSlaPolicy(id: number, data: Partial<InsertSlaPolicy>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(slaPolicies).set(data).where(eq(slaPolicies.id, id));
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
  return result[0];
}

export async function getCorrespondentByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(correspondents).where(eq(correspondents.userId, userId)).limit(1);
  return result[0];
}

export async function createCorrespondent(data: InsertCorrespondent) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(correspondents).values(data);
  return result[0];
}

export async function updateCorrespondent(id: number, data: Partial<InsertCorrespondent>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(correspondents).set(data).where(eq(correspondents.id, id));
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

async function generateTicketNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const year = new Date().getFullYear();
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tickets)
    .where(sql`YEAR(createdAt) = ${year}`);
  const count = Number(result[0]?.count ?? 0) + 1;
  return `TKT-${year}-${String(count).padStart(4, "0")}`;
}

export async function createTicket(data: Omit<InsertTicket, "ticketNumber">) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ticketNumber = await generateTicketNumber();

  // Calcular deadlines pelo SLA
  let responseDeadline: Date | undefined;
  let resolutionDeadline: Date | undefined;
  if (data.slaPolicyId) {
    const sla = await getSlaPolicyById(data.slaPolicyId);
    if (sla) {
      const now = new Date();
      responseDeadline = new Date(now.getTime() + sla.responseTimeHours * 3600000);
      resolutionDeadline = new Date(now.getTime() + sla.resolutionTimeHours * 3600000);
    }
  }

  await db.insert(tickets).values({
    ...data,
    ticketNumber,
    responseDeadline,
    resolutionDeadline,
  });

  const created = await db.select().from(tickets).where(eq(tickets.ticketNumber, ticketNumber)).limit(1);
  return created[0];
}

export async function getTickets(filters?: {
  status?: string;
  correspondentId?: number;
  assignedToUserId?: number;
  departmentId?: number;
  openedByUserId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.status) conditions.push(eq(tickets.status, filters.status as any));
  if (filters?.correspondentId) conditions.push(eq(tickets.correspondentId, filters.correspondentId));
  if (filters?.assignedToUserId) conditions.push(eq(tickets.assignedToUserId, filters.assignedToUserId));
  if (filters?.departmentId) conditions.push(eq(tickets.departmentId, filters.departmentId));
  if (filters?.openedByUserId) conditions.push(eq(tickets.openedByUserId, filters.openedByUserId));

  const query = db.select().from(tickets);
  if (conditions.length > 0) return query.where(and(...conditions)).orderBy(desc(tickets.createdAt));
  return query.orderBy(desc(tickets.createdAt));
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result[0];
}

export async function updateTicket(id: number, data: Partial<InsertTicket>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tickets).set(data).where(eq(tickets.id, id));
}

export async function getTicketStats() {
  const db = await getDb();
  if (!db) return null;

  const [total, open, inProgress, resolved, closed] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(tickets),
    db.select({ count: sql<number>`COUNT(*)` }).from(tickets).where(eq(tickets.status, "open")),
    db.select({ count: sql<number>`COUNT(*)` }).from(tickets).where(eq(tickets.status, "in_progress")),
    db.select({ count: sql<number>`COUNT(*)` }).from(tickets).where(eq(tickets.status, "resolved")),
    db.select({ count: sql<number>`COUNT(*)` }).from(tickets).where(eq(tickets.status, "closed")),
  ]);

  return {
    total: Number(total[0]?.count ?? 0),
    open: Number(open[0]?.count ?? 0),
    inProgress: Number(inProgress[0]?.count ?? 0),
    resolved: Number(resolved[0]?.count ?? 0),
    closed: Number(closed[0]?.count ?? 0),
  };
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
  if (!db) throw new Error("DB unavailable");
  await db.insert(ticketMessages).values(data);
  const result = await db
    .select()
    .from(ticketMessages)
    .where(and(eq(ticketMessages.ticketId, data.ticketId), eq(ticketMessages.userId, data.userId)))
    .orderBy(desc(ticketMessages.createdAt))
    .limit(1);
  return result[0];
}

// ─── Ticket Attachments ───────────────────────────────────────────────────────

export async function getTicketAttachments(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ticketAttachments).where(eq(ticketAttachments.ticketId, ticketId)).orderBy(ticketAttachments.createdAt);
}

export async function createTicketAttachment(data: InsertTicketAttachment) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(ticketAttachments).values(data);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

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
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return Number(result[0]?.count ?? 0);
}
