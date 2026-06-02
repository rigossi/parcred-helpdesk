import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createSessionToken } from "./_core/context";
import {
  createCorrespondent,
  createDepartment,
  createNotification,
  createSlaPolicy,
  createTicket,
  createTicketAttachment,
  createTicketMessage,
  getAllUsers,
  getCorrespondentById,
  getCorrespondentByUserId,
  getCorrespondents,
  getDepartmentById,
  getDepartments,
  getSlaPolicies,
  getSlaPolicyByDeptAndType,
  getSlaPolicyById,
  getTicketAttachments,
  getTicketById,
  getTicketMessages,
  getTicketStats,
  getTickets,
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateCorrespondent,
  updateDepartment,
  updateSlaPolicy,
  updateTicket,
  updateUserRole,
  getUserByEmail,
  updateUserLastSignedIn,
  createUser,
  updateUserPassword,
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenUsed,
  getUserById,
  getUserDepartmentPermissions,
  setUserDepartmentPermissions,
  updateUser,
} from "./db";

// ─── Middleware helpers ───────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  return next({ ctx });
});

const agentOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "agent")
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a agentes e administradores." });
  return next({ ctx });
});

// ─── Helper: notificar usuários sobre ticket ──────────────────────────────────

/** Envia e-mail de notificação de novo chamado para todos os admins ativos */
async function emailAdminsNewTicket(ticket: {
  ticketNumber: string;
  title: string;
  description: string;
  openedByName: string;
  departmentName: string;
  priority: string;
  openedAt: Date;
  id: number;
}, origin: string) {
  try {
    const { sendMail, replaceVars } = await import("./mailer");
    const { getEmailTemplate } = await import("./db");
    const template = await getEmailTemplate("new_ticket");
    if (!template) return;
    const allUsersForEmail = await getAllUsers();
    const admins = allUsersForEmail.filter((u: { role: string; active: boolean; email: string }) => u.role === "admin" && u.active);
    if (!admins.length) return;
    const PRIORITY_LABELS: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica" };
    const vars = {
      ticket_number: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description || "(sem descrição)",
      opened_by: ticket.openedByName,
      department: ticket.departmentName,
      priority: PRIORITY_LABELS[ticket.priority] ?? ticket.priority,
      opened_at: ticket.openedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      ticket_link: `${origin}/tickets/${ticket.id}`,
      app_name: "Parcred Help Desk",
    };
    const subject = replaceVars(template.subject, vars);
    const html = replaceVars(template.bodyHtml, vars);
    const emails = admins.map((u: { email: string }) => u.email);
    await sendMail({ to: emails, subject, html });
  } catch (err) {
    console.error("[emailAdminsNewTicket] Erro ao enviar e-mail:", err);
  }
}

async function notifyTicketEvent(
  userIds: number[],
  ticketId: number,
  type: "ticket_opened" | "ticket_updated" | "ticket_assigned" | "ticket_resolved" | "ticket_closed",
  title: string,
  message: string
) {
  for (const userId of userIds) {
    await createNotification({ userId, ticketId, type, title, message });
  }
}

// ─── Routers ──────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  // ─── Auth (e-mail + senha) ─────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.active) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." });
        }
        await updateUserLastSignedIn(user.id);
        const token = await createSessionToken(user.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Alterar própria senha (usuário autenticado)
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta." });
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await updateUserPassword(user.id, newHash);
        return { success: true };
      }),

    // Solicitar recuperação de senha por e-mail
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string().url().optional() }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        // Resposta genérica para não revelar se o e-mail existe
        if (!user || !user.active) return { success: true };
        const { nanoid } = await import("nanoid");
        const token = nanoid(48);
        await createPasswordResetToken(user.id, token);
        const resetLink = `${input.origin ?? "https://suporte.parcredbrasil.com.br"}/reset-password?token=${token}`;
        // Tentar enviar e-mail via SMTP
        const { sendMail, replaceVars } = await import("./mailer");
        const { getEmailTemplate } = await import("./db");
        const template = await getEmailTemplate("password_reset");
        let emailSent = false;
        if (template) {
          const vars = {
            name: user.name ?? user.email,
            email: user.email,
            reset_link: resetLink,
            app_name: "Parcred Help Desk",
          };
          emailSent = await sendMail({
            to: user.email,
            subject: replaceVars(template.subject, vars),
            html: replaceVars(template.bodyHtml, vars),
          });
        }
        // Se não há template configurado, envia e-mail simples
        if (!emailSent) {
          await sendMail({
            to: user.email,
            subject: "Recuperação de senha — Parcred Help Desk",
            html: `<p>Olá, ${user.name ?? user.email}!</p>
<p>Recebemos uma solicitação de recuperação de senha para sua conta.</p>
<p><a href="${resetLink}">Clique aqui para redefinir sua senha</a></p>
<p>O link é válido por 2 horas. Se você não solicitou isso, ignore este e-mail.</p>`,
          });
        }
        return { success: true };
      }),

    // Redefinir senha com token
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const record = await getPasswordResetToken(input.token);
        if (!record) throw new TRPCError({ code: "BAD_REQUEST", message: "Token inválido ou expirado." });
        if (record.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Este token já foi utilizado." });
        if (new Date() > record.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Token expirado. Solicite um novo link." });
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await updateUserPassword(record.userId, newHash);
        await markPasswordResetTokenUsed(record.id);
        return { success: true };
      }),
  }),

  // ─── Departments ────────────────────────────────────────────────────────────
  departments: router({
    list: protectedProcedure
      .input(z.object({ activeOnly: z.boolean().optional() }).optional())
      .query(({ input }) => getDepartments(input?.activeOnly ?? false)),

    byId: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getDepartmentById(input.id)),

    create: adminProcedure
      .input(z.object({ name: z.string().min(2), description: z.string().optional(), active: z.boolean().optional() }))
      .mutation(({ input }) => createDepartment(input)),

    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().min(2).optional(), description: z.string().optional(), active: z.boolean().optional() }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateDepartment(id, data);
      }),

    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => updateDepartment(input.id, { active: false })),
  }),

  // ─── SLA Policies ───────────────────────────────────────────────────────────
  sla: router({
    list: protectedProcedure
      .input(z.object({ activeOnly: z.boolean().optional() }).optional())
      .query(({ input }) => getSlaPolicies(input?.activeOnly ?? false)),

    byId: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getSlaPolicyById(input.id)),

    create: adminProcedure
      .input(
        z.object({
          departmentId: z.number(),
          name: z.string().min(2),
          ticketType: z.enum(["technical", "commercial", "financial"]),
          priority: z.enum(["low", "medium", "high", "critical"]),
          responseTimeHours: z.number().min(1),
          resolutionTimeHours: z.number().min(1),
          active: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => createSlaPolicy(input)),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(2).optional(),
          responseTimeHours: z.number().min(1).optional(),
          resolutionTimeHours: z.number().min(1).optional(),
          active: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateSlaPolicy(id, data);
      }),

    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => updateSlaPolicy(input.id, { active: false })),
  }),

  // ─── Correspondents ─────────────────────────────────────────────────────────
  correspondents: router({
    list: agentOrAdminProcedure.query(() => getCorrespondents()),
    listForTicket: protectedProcedure.query(() => getCorrespondents()),
    byId: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getCorrespondentById(input.id)),
    myProfile: protectedProcedure.query(({ ctx }) => getCorrespondentByUserId(ctx.user.id)),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(2),
          document: z.string().optional(),
          email: z.string().email(),
          password: z.string().min(6),
          phone: z.string().optional(),
          city: z.string().optional(),
          state: z.string().max(2).optional(),
          status: z.enum(["active", "inactive", "suspended"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Verificar se e-mail já existe
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Já existe um usuário com este e-mail." });
        // Criar usuário com perfil correspondent
        const passwordHash = await bcrypt.hash(input.password, 12);
        const newUser = await createUser({
          name: input.name,
          email: input.email,
          passwordHash,
          role: "correspondent",
        });
        // Criar correspondente vinculado ao usuário
        const { password: _p, ...corrData } = input;
        return createCorrespondent({ ...corrData, userId: newUser.id });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(2).optional(),
          document: z.string().optional(),
          email: z.string().email().optional(),
          newPassword: z.string().min(6).optional(),
          phone: z.string().optional(),
          city: z.string().optional(),
          state: z.string().max(2).optional(),
          status: z.enum(["active", "inactive", "suspended"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, newPassword, email, ...data } = input;
        // Buscar correspondente para obter o userId
        const correspondent = await getCorrespondentById(id);
        if (!correspondent) throw new TRPCError({ code: "NOT_FOUND" });
        // Atualizar senha se fornecida
        if (newPassword && correspondent.userId) {
          const passwordHash = await bcrypt.hash(newPassword, 12);
          const { getDb: _getDb, users: _users } = await import("./db");
          const { eq: _eq } = await import("drizzle-orm");
          const db = await _getDb();
          if (db) await db.update(_users).set({ passwordHash }).where(_eq(_users.id, correspondent.userId));
        }
        // Atualizar e-mail no usuário vinculado
        if (email && correspondent.userId) {
          const { getDb: _getDb2, users: _users2 } = await import("./db");
          const { eq: _eq2 } = await import("drizzle-orm");
          const db2 = await _getDb2();
          if (db2) await db2.update(_users2).set({ email, name: data.name ?? undefined }).where(_eq2(_users2.id, correspondent.userId));
        }
        return updateCorrespondent(id, { ...data, ...(email ? { email } : {}) } as any);
      }),
  }),

  // ─── Tickets ────────────────────────────────────────────────────────────────
  tickets: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          correspondentId: z.number().optional(),
          assignedToUserId: z.number().optional(),
          departmentId: z.number().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        if (ctx.user.role === "correspondent") {
          const correspondent = await getCorrespondentByUserId(ctx.user.id);
          if (!correspondent) return [];
          return getTickets({ ...input, correspondentId: correspondent.id });
        }
        // Para admin/agente: aplicar filtro de departamentos se configurado
        if (ctx.user.role === "admin" || ctx.user.role === "agent") {
          const allowedDepts = await getUserDepartmentPermissions(ctx.user.id);
          if (allowedDepts.length > 0 && !input?.departmentId) {
            // Buscar tickets de cada departamento permitido e combinar
            const results = await Promise.all(
              allowedDepts.map((deptId) => getTickets({ ...input, departmentId: deptId }))
            );
            const all = results.flat();
            // Ordenar por data de criação decrescente
            all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return all;
          }
        }
        return getTickets(input);
      }),

    myTickets: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "correspondent") {
        const correspondent = await getCorrespondentByUserId(ctx.user.id);
        if (!correspondent) return [];
        return getTickets({ correspondentId: correspondent.id });
      }
      if (ctx.user.role === "agent") {
        const allowedDepts = await getUserDepartmentPermissions(ctx.user.id);
        if (allowedDepts.length > 0) {
          const results = await Promise.all(
            allowedDepts.map((deptId) => getTickets({ assignedToUserId: ctx.user.id, departmentId: deptId }))
          );
          const all = results.flat();
          all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return all;
        }
        return getTickets({ assignedToUserId: ctx.user.id });
      }
      return getTickets();
    }),

    // Retorna as permissões de departamento do usuário autenticado (para uso no frontend)
    myDepartmentPermissions: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "agent") return [];
      return getUserDepartmentPermissions(ctx.user.id);
    }),

    byId: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const ticket = await getTicketById(input.id);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role === "correspondent") {
        const correspondent = await getCorrespondentByUserId(ctx.user.id);
        if (!correspondent || ticket.correspondentId !== correspondent.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return ticket;
    }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      // Para admin/agente com filtro de departamentos, calcular stats apenas dos departamentos permitidos
      if (ctx.user.role === "admin" || ctx.user.role === "agent") {
        const allowedDepts = await getUserDepartmentPermissions(ctx.user.id);
        if (allowedDepts.length > 0) {
          const results = await Promise.all(
            allowedDepts.map((deptId) => getTickets({ departmentId: deptId }))
          );
          const all = results.flat();
          return {
            open: all.filter((t) => t.status === "open").length,
            inProgress: all.filter((t) => t.status === "in_progress").length,
            waitingCorrespondent: all.filter((t) => t.status === "waiting_correspondent").length,
            resolved: all.filter((t) => t.status === "resolved").length,
            closed: all.filter((t) => t.status === "closed").length,
            total: all.length,
          };
        }
      }
      return getTicketStats();
    }),

    create: protectedProcedure
      .input(
        z.object({
          correspondentId: z.number(),
          departmentId: z.number(),
          title: z.string().min(5),
          description: z.string().min(10),
          // tipo e prioridade definidos pelo agente após abertura
          ticketType: z.enum(["technical", "commercial", "financial"]).optional(),
          priority: z.enum(["low", "medium", "high", "critical"]).optional(),
          // origin para montar o link do chamado no e-mail
          origin: z.string().url().optional(),
          // anexos opcionais enviados na abertura
          attachments: z.array(z.object({
            fileName: z.string(),
            fileKey: z.string(),
            fileUrl: z.string(),
            mimeType: z.string().optional(),
            fileSize: z.number().optional(),
          })).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { attachments, origin, ...ticketData } = input;
        const ticket = await createTicket({
          ...ticketData,
          ticketType: ticketData.ticketType ?? "technical",
          priority: ticketData.priority ?? "medium",
          openedByUserId: ctx.user.id,
          status: "open",
        });
        if (!ticket) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Salvar anexos se enviados
        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            await createTicketAttachment({ ...att, ticketId: ticket.id, uploadedByUserId: ctx.user.id });
          }
        }
        const allUsers = await getAllUsers();
        const staffIds = allUsers.filter((u: { role: string; id: number }) => u.role === "admin" || u.role === "agent").map((u: { id: number }) => u.id);
        await notifyTicketEvent(staffIds, ticket.id, "ticket_opened", `Novo chamado: ${ticket.ticketNumber}`, `${ctx.user.name ?? "Correspondente"} abriu o chamado "${input.title}"`);
        // Enviar e-mail para admins (não bloqueia a resposta)
        const dept = await getDepartmentById(input.departmentId);
        emailAdminsNewTicket({
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          description: ticket.description ?? "",
          openedByName: ctx.user.name ?? ctx.user.email,
          departmentName: dept?.name ?? "N/A",
          priority: ticket.priority ?? "medium",
          openedAt: ticket.createdAt ?? new Date(),
          id: ticket.id,
        }, origin ?? "https://suporte.parcredbrasil.com.br").catch(console.error);
        return ticket;
      }),

    update: agentOrAdminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["open", "in_progress", "waiting_correspondent", "resolved", "closed"]).optional(),
          assignedToUserId: z.number().nullable().optional(),
          priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const ticket = await getTicketById(id);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
        const updateData: Record<string, unknown> = { ...data };
        if (data.status === "resolved" && ticket.status !== "resolved") updateData.resolvedAt = new Date();
        if (data.status === "closed" && ticket.status !== "closed") updateData.closedAt = new Date();
        await updateTicket(id, updateData as any);
        const type = data.status === "resolved" ? "ticket_resolved" : data.status === "closed" ? "ticket_closed" : "ticket_updated";
        await notifyTicketEvent([ticket.openedByUserId], id, type, `Chamado ${ticket.ticketNumber} atualizado`, `O status do seu chamado foi atualizado para: ${data.status ?? "atualizado"}`);
        if (data.assignedToUserId) {
          await notifyTicketEvent([data.assignedToUserId], id, "ticket_assigned", `Chamado atribuído: ${ticket.ticketNumber}`, `O chamado "${ticket.title}" foi atribuído a você.`);
        }
        return getTicketById(id);
      }),

    assign: agentOrAdminProcedure
      .input(z.object({ id: z.number(), agentId: z.number() }))
      .mutation(async ({ input }) => {
        const ticket = await getTicketById(input.id);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
        await updateTicket(input.id, { assignedToUserId: input.agentId, status: "in_progress" });
        await notifyTicketEvent([input.agentId], input.id, "ticket_assigned", `Chamado atribuído: ${ticket.ticketNumber}`, `O chamado "${ticket.title}" foi atribuído a você.`);
        return { success: true };
      }),
  }),

  // ─── Ticket Messages ─────────────────────────────────────────────────────────
  ticketMessages: router({
    list: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isStaff = ctx.user.role === "admin" || ctx.user.role === "agent";
        return getTicketMessages(input.ticketId, isStaff);
      }),

    create: protectedProcedure
      .input(z.object({
        ticketId: z.number(),
        message: z.string().min(1),
        isInternal: z.boolean().optional(),
        attachments: z.array(z.object({
          fileName: z.string(),
          fileKey: z.string(),
          fileUrl: z.string(),
          mimeType: z.string().optional(),
          fileSize: z.number().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ticket = await getTicketById(input.ticketId);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
        // Correspondente só pode interagir com seus próprios chamados
        if (ctx.user.role === "correspondent") {
          const correspondent = await getCorrespondentByUserId(ctx.user.id);
          if (!correspondent || ticket.correspondentId !== correspondent.id) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }
        if (ctx.user.role === "correspondent" && input.isInternal) throw new TRPCError({ code: "FORBIDDEN" });
        const msg = await createTicketMessage({ ticketId: input.ticketId, userId: ctx.user.id, message: input.message, isInternal: input.isInternal ?? false });
        // Salvar anexos vinculados à mensagem
        if (input.attachments && input.attachments.length > 0 && msg) {
          for (const att of input.attachments) {
            await createTicketAttachment({ ...att, ticketId: input.ticketId, messageId: msg.id, uploadedByUserId: ctx.user.id });
          }
        }
        if ((ctx.user.role === "agent" || ctx.user.role === "admin") && !ticket.firstResponseAt) {
          await updateTicket(input.ticketId, { firstResponseAt: new Date() });
        }
        if (!input.isInternal) {
          const notifyIds: number[] = [];
          if (ctx.user.role === "correspondent") {
            const allUsers = await getAllUsers();
            notifyIds.push(...allUsers.filter((u: { role: string; id: number }) => u.role === "admin" || u.role === "agent").map((u: { id: number }) => u.id));
          } else {
            notifyIds.push(ticket.openedByUserId);
          }
          await notifyTicketEvent(notifyIds, input.ticketId, "ticket_updated", `Nova mensagem no chamado ${ticket.ticketNumber}`, `${ctx.user.name ?? "Usuário"} adicionou uma mensagem ao chamado "${ticket.title}"`);
        }
        return msg;
      }),
  }),

  // ─── Ticket Attachments ──────────────────────────────────────────────────────
  ticketAttachments: router({
    list: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Correspondente só pode ver anexos dos seus próprios chamados
        if (ctx.user.role === "correspondent") {
          const ticket = await getTicketById(input.ticketId);
          if (!ticket) return [];
          const correspondent = await getCorrespondentByUserId(ctx.user.id);
          if (!correspondent || ticket.correspondentId !== correspondent.id) return [];
        }
        return getTicketAttachments(input.ticketId);
      }),

    create: protectedProcedure
      .input(z.object({ ticketId: z.number(), messageId: z.number().optional(), fileName: z.string(), fileKey: z.string(), fileUrl: z.string(), mimeType: z.string().optional(), fileSize: z.number().optional() }))
      .mutation(({ ctx, input }) => createTicketAttachment({ ...input, uploadedByUserId: ctx.user.id })),
  }),

  // ─── Notifications ───────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }).optional())
      .query(({ ctx, input }) => getUserNotifications(ctx.user.id, input?.unreadOnly ?? false)),

    unreadCount: protectedProcedure.query(({ ctx }) => getUnreadNotificationCount(ctx.user.id)),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => markNotificationRead(input.id, ctx.user.id)),

    markAllRead: protectedProcedure.mutation(({ ctx }) => markAllNotificationsRead(ctx.user.id)),
  }),

  // ─── Admin ───────────────────────────────────────────────────────────────────
  admin: router({
    users: adminProcedure.query(() => getAllUsers()),

    updateUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "agent", "correspondent"]) }))
      .mutation(({ input }) => updateUserRole(input.userId, input.role)),

    createUser: adminProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["user", "admin", "agent", "correspondent"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "E-mail já cadastrado." });
        const passwordHash = await bcrypt.hash(input.password, 12);
        const { createUser } = await import("./db");
        return createUser({ name: input.name, email: input.email, passwordHash, role: input.role ?? "user" });
      }),

    resetPassword: adminProcedure
      .input(z.object({ userId: z.number(), newPassword: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        const { getDb, users } = await import("./db");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(users).set({ passwordHash }).where(eq(users.id, input.userId));
        return { success: true };
      }),

    // Editar dados cadastrais do usuário
    updateUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        active: z.boolean().optional(),
        role: z.enum(["user", "admin", "agent", "correspondent"]).optional(),
        newPassword: z.string().min(6).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id && input.role && input.role !== ctx.user.role) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode alterar seu próprio perfil." });
        }
        const { userId, newPassword, ...data } = input;
        // Verificar e-mail duplicado
        if (data.email) {
          const existing = await getUserByEmail(data.email);
          if (existing && existing.id !== userId) {
            throw new TRPCError({ code: "CONFLICT", message: "E-mail já está em uso por outro usuário." });
          }
        }
        // Atualizar dados
        await updateUser(userId, data);
        // Atualizar senha se fornecida
        if (newPassword) {
          const passwordHash = await bcrypt.hash(newPassword, 12);
          await updateUserPassword(userId, passwordHash);
        }
        return { success: true };
      }),

    // Obter permissões de departamento de um usuário
    getUserDepartmentPermissions: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getUserDepartmentPermissions(input.userId)),

    // Definir permissões de departamento de um usuário
    setUserDepartmentPermissions: adminProcedure
      .input(z.object({
        userId: z.number(),
        departmentIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await setUserDepartmentPermissions(input.userId, input.departmentIds);
        return { success: true };
      }),

    // Obter template de e-mail
    getEmailTemplate: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        const { getEmailTemplate } = await import("./db");
        return getEmailTemplate(input.key);
      }),

    // Salvar template de e-mail
    updateEmailTemplate: adminProcedure
      .input(z.object({
        key: z.string(),
        subject: z.string().min(1),
        bodyHtml: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { upsertEmailTemplate } = await import("./db");
        return upsertEmailTemplate(input.key, input.subject, input.bodyHtml);
      }),
  }),
});

export type AppRouter = typeof appRouter;
