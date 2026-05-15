import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock das funções de banco de dados
vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getTicketById: vi.fn().mockResolvedValue({
      id: 1,
      ticketNumber: "TK000001",
      title: "Teste",
      description: "Descrição de teste",
      status: "open",
      priority: "medium",
      ticketType: "technical",
      departmentId: 1,
      correspondentId: 1,
      assignedToUserId: null,
      openedByUserId: 2,
      closedAt: null,
      resolvedAt: null,
      resolutionDeadline: null,
      responseDeadline: null,
      firstResponseAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    updateTicket: vi.fn().mockResolvedValue({ id: 1 }),
    createNotification: vi.fn().mockResolvedValue({ id: 1 }),
    getAllUsers: vi.fn().mockResolvedValue([]),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    email: "admin@parcred.com.br",
    passwordHash: "$2b$12$hash",
    name: "Admin",
    role: "admin",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAgentContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    email: "agente@parcred.com.br",
    passwordHash: "$2b$12$hash",
    name: "Agente",
    role: "agent",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createCorrespondentContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 4,
    email: "correspondente@test.com",
    passwordHash: "$2b$12$hash",
    name: "Correspondente",
    role: "correspondent",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("tickets.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin pode atualizar status do ticket para resolved", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const { updateTicket } = await import("./db");

    await caller.tickets.update({ id: 1, status: "resolved" });

    expect(updateTicket).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "resolved", resolvedAt: expect.any(Date) })
    );
  });

  it("admin pode atualizar status do ticket para closed", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const { updateTicket } = await import("./db");

    await caller.tickets.update({ id: 1, status: "closed" });

    expect(updateTicket).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "closed", closedAt: expect.any(Date) })
    );
  });

  it("agente pode atualizar status do ticket", async () => {
    const ctx = createAgentContext();
    const caller = appRouter.createCaller(ctx);

    const { updateTicket } = await import("./db");

    await caller.tickets.update({ id: 1, status: "in_progress" });

    expect(updateTicket).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "in_progress" })
    );
  });

  it("correspondente NÃO pode atualizar status do ticket", async () => {
    const ctx = createCorrespondentContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tickets.update({ id: 1, status: "resolved" })
    ).rejects.toThrow();
  });

  it("admin pode atualizar prioridade do ticket", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const { updateTicket } = await import("./db");

    await caller.tickets.update({ id: 1, priority: "high" });

    expect(updateTicket).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ priority: "high" })
    );
  });
});
