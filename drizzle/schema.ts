import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  role: mysqlEnum("role", ["user", "admin", "agent", "correspondent"]).default("user").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Departments ──────────────────────────────────────────────────────────────

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

// ─── SLA Policies ─────────────────────────────────────────────────────────────

export const slaPolicies = mysqlTable("sla_policies", {
  id: int("id").autoincrement().primaryKey(),
  departmentId: int("departmentId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  ticketType: mysqlEnum("ticketType", ["technical", "commercial", "financial"]).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).notNull(),
  responseTimeHours: int("responseTimeHours").notNull(), // prazo de primeira resposta em horas
  resolutionTimeHours: int("resolutionTimeHours").notNull(), // prazo de resolução em horas
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SlaPolicy = typeof slaPolicies.$inferSelect;
export type InsertSlaPolicy = typeof slaPolicies.$inferInsert;

// ─── Correspondents ───────────────────────────────────────────────────────────

export const correspondents = mysqlTable("correspondents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // vinculação opcional ao usuário do sistema
  name: varchar("name", { length: 256 }).notNull(),
  document: varchar("document", { length: 32 }), // CPF ou CNPJ
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 2 }),
  bankCode: varchar("bankCode", { length: 32 }), // código do correspondente bancário
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Correspondent = typeof correspondents.$inferSelect;
export type InsertCorrespondent = typeof correspondents.$inferInsert;

// ─── Tickets ──────────────────────────────────────────────────────────────────

export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  ticketNumber: varchar("ticketNumber", { length: 32 }).notNull().unique(), // ex: TKT-2024-001
  correspondentId: int("correspondentId").notNull(),
  openedByUserId: int("openedByUserId").notNull(),
  assignedToUserId: int("assignedToUserId"), // agente responsável
  departmentId: int("departmentId").notNull(),
  slaPolicyId: int("slaPolicyId"),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description").notNull(),
  ticketType: mysqlEnum("ticketType", ["technical", "commercial", "financial"]).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "waiting_correspondent", "resolved", "closed"]).default("open").notNull(),
  responseDeadline: timestamp("responseDeadline"), // calculado pelo SLA
  resolutionDeadline: timestamp("resolutionDeadline"), // calculado pelo SLA
  firstResponseAt: timestamp("firstResponseAt"),
  resolvedAt: timestamp("resolvedAt"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// ─── Ticket Messages ──────────────────────────────────────────────────────────

export const ticketMessages = mysqlTable("ticket_messages", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  userId: int("userId").notNull(),
  message: text("message").notNull(),
  isInternal: boolean("isInternal").default(false).notNull(), // nota interna (só agentes/admin veem)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = typeof ticketMessages.$inferInsert;

// ─── Ticket Attachments ───────────────────────────────────────────────────────

export const ticketAttachments = mysqlTable("ticket_attachments", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  messageId: int("messageId"), // opcional: vinculado a uma mensagem
  uploadedByUserId: int("uploadedByUserId").notNull(),
  fileName: varchar("fileName", { length: 256 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // chave no S3
  fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: bigint("fileSize", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TicketAttachment = typeof ticketAttachments.$inferSelect;
export type InsertTicketAttachment = typeof ticketAttachments.$inferInsert;

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ticketId: int("ticketId"),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["ticket_opened", "ticket_updated", "ticket_assigned", "ticket_resolved", "ticket_closed", "sla_warning"]).notNull(),
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── User Department Permissions ────────────────────────────────────────────
// Quando vazio: admin/agente vê TODOS os departamentos
// Quando preenchido: admin/agente vê apenas os departamentos listados

export const userDepartmentPermissions = mysqlTable("user_department_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  departmentId: int("departmentId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserDepartmentPermission = typeof userDepartmentPermissions.$inferSelect;
export type InsertUserDepartmentPermission = typeof userDepartmentPermissions.$inferInsert;

// ─── Password Reset Tokens ────────────────────────────────────────────────────────────────────────────────

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
