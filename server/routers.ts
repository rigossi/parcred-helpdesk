import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
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

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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

    // Correspondente pode ver a lista para abertura de chamado por staff
    listForTicket: protectedProcedure.query(() => getCorrespondents()),

    byId: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getCorrespondentById(input.id)),

    myProfile: protectedProcedure.query(({ ctx }) => getCorrespondentByUserId(ctx.user.id)),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(2),
          document: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          city: z.string().optional(),
          state: z.string().max(2).optional(),
          bankCode: z.string().optional(),
          status: z.enum(["active", "inactive", "suspended"]).optional(),
          notes: z.string().optional(),
          userId: z.number().optional(),
        })
      )
      .mutation(({ input }) => createCorrespondent(input)),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(2).optional(),
          document: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          city: z.string().optional(),
          state: z.string().max(2).optional(),
          bankCode: z.string().optional(),
          status: z.enum(["active", "inactive", "suspended"]).optional(),
          notes: z.string().optional(),
          userId: z.number().nullable().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateCorrespondent(id, data as any);
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
        // Correspondente só vê seus próprios tickets
        if (ctx.user.role === "correspondent") {
          const correspondent = await getCorrespondentByUserId(ctx.user.id);
          if (!correspondent) return [];
          return getTickets({ ...input, correspondentId: correspondent.id });
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
        return getTickets({ assignedToUserId: ctx.user.id });
      }
      return getTickets();
    }),

    byId: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const ticket = await getTicketById(input.id);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

      // Correspondente só acessa seus próprios tickets
      if (ctx.user.role === "correspondent") {
        const correspondent = await getCorrespondentByUserId(ctx.user.id);
        if (!correspondent || ticket.correspondentId !== correspondent.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return ticket;
    }),

    stats: protectedProcedure.query(() => getTicketStats()),

    create: protectedProcedure
      .input(
        z.object({
          correspondentId: z.number(),
          departmentId: z.number(),
          title: z.string().min(5),
          description: z.string().min(10),
          ticketType: z.enum(["technical", "commercial", "financial"]),
          priority: z.enum(["low", "medium", "high", "critical"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Buscar SLA correspondente
        const sla = await getSlaPolicyByDeptAndType(input.departmentId, input.ticketType, input.priority);

        const ticket = await createTicket({
          ...input,
          openedByUserId: ctx.user.id,
          slaPolicyId: sla?.id,
          status: "open",
        });

        if (!ticket) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Notificar agentes e admins
        const allUsers = await getAllUsers();
        const staffIds = allUsers.filter((u) => u.role === "admin" || u.role === "agent").map((u) => u.id);
        await notifyTicketEvent(
          staffIds,
          ticket.id,
          "ticket_opened",
          `Novo chamado: ${ticket.ticketNumber}`,
          `${ctx.user.name ?? "Correspondente"} abriu o chamado "${input.title}"`
        );

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

        if (data.status === "resolved" && ticket.status !== "resolved") {
          updateData.resolvedAt = new Date();
        }
        if (data.status === "closed" && ticket.status !== "closed") {
          updateData.closedAt = new Date();
        }

        await updateTicket(id, updateData as any);

        // Notificar quem abriu o ticket
        const type = data.status === "resolved" ? "ticket_resolved" : data.status === "closed" ? "ticket_closed" : "ticket_updated";
        await notifyTicketEvent(
          [ticket.openedByUserId],
          id,
          type,
          `Chamado ${ticket.ticketNumber} atualizado`,
          `O status do seu chamado foi atualizado para: ${data.status ?? "atualizado"}`
        );

        if (data.assignedToUserId) {
          await notifyTicketEvent(
            [data.assignedToUserId],
            id,
            "ticket_assigned",
            `Chamado atribuído: ${ticket.ticketNumber}`,
            `O chamado "${ticket.title}" foi atribuído a você.`
          );
        }

        return getTicketById(id);
      }),

    assign: agentOrAdminProcedure
      .input(z.object({ id: z.number(), agentId: z.number() }))
      .mutation(async ({ input }) => {
        const ticket = await getTicketById(input.id);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
        await updateTicket(input.id, { assignedToUserId: input.agentId, status: "in_progress" });
        await notifyTicketEvent(
          [input.agentId],
          input.id,
          "ticket_assigned",
          `Chamado atribuído: ${ticket.ticketNumber}`,
          `O chamado "${ticket.title}" foi atribuído a você.`
        );
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
      .input(
        z.object({
          ticketId: z.number(),
          message: z.string().min(1),
          isInternal: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const ticket = await getTicketById(input.ticketId);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

        // Correspondente não pode enviar nota interna
        if (ctx.user.role === "correspondent" && input.isInternal) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const msg = await createTicketMessage({
          ticketId: input.ticketId,
          userId: ctx.user.id,
          message: input.message,
          isInternal: input.isInternal ?? false,
        });

        // Marcar primeira resposta do agente
        if ((ctx.user.role === "agent" || ctx.user.role === "admin") && !ticket.firstResponseAt) {
          await updateTicket(input.ticketId, { firstResponseAt: new Date() });
        }

        // Notificar
        if (!input.isInternal) {
          const notifyIds: number[] = [];
          if (ctx.user.role === "correspondent") {
            // Notificar agente e admin
            const allUsers = await getAllUsers();
            const staffIds = allUsers.filter((u) => u.role === "admin" || u.role === "agent").map((u) => u.id);
            notifyIds.push(...staffIds);
          } else {
            notifyIds.push(ticket.openedByUserId);
          }
          await notifyTicketEvent(
            notifyIds,
            input.ticketId,
            "ticket_updated",
            `Nova mensagem no chamado ${ticket.ticketNumber}`,
            `${ctx.user.name ?? "Usuário"} adicionou uma mensagem ao chamado "${ticket.title}"`
          );
        }

        return msg;
      }),
  }),

  // ─── Ticket Attachments ──────────────────────────────────────────────────────
  ticketAttachments: router({
    list: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(({ input }) => getTicketAttachments(input.ticketId)),

    create: protectedProcedure
      .input(
        z.object({
          ticketId: z.number(),
          messageId: z.number().optional(),
          fileName: z.string(),
          fileKey: z.string(),
          fileUrl: z.string(),
          mimeType: z.string().optional(),
          fileSize: z.number().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        createTicketAttachment({ ...input, uploadedByUserId: ctx.user.id })
      ),
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
  }),
});

export type AppRouter = typeof appRouter;
