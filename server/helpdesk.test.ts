import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context factories ────────────────────────────────────────────────────────

function makeCtx(role: "admin" | "agent" | "correspondent" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : role === "agent" ? 2 : role === "correspondent" ? 3 : 4,
      openId: `${role}-openid`,
      name: `Test ${role}`,
      email: `${role}@test.com`,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe("auth", () => {
  it("me returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });

  it("logout clears cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      ...makeCtx("user"),
      res: {
        clearCookie: (name: string) => { clearedCookies.push(name); },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

// ─── Departments tests ────────────────────────────────────────────────────────

describe("departments", () => {
  it("list is accessible by authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx("correspondent"));
    const result = await caller.departments.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("create is forbidden for non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("agent"));
    await expect(
      caller.departments.create({ name: "Test Dept", active: true })
    ).rejects.toThrow();
  });

  it("create is forbidden for correspondents", async () => {
    const caller = appRouter.createCaller(makeCtx("correspondent"));
    await expect(
      caller.departments.create({ name: "Test Dept", active: true })
    ).rejects.toThrow();
  });
});

// ─── SLA tests ────────────────────────────────────────────────────────────────

describe("sla", () => {
  it("list is accessible by authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx("agent"));
    const result = await caller.sla.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("create is forbidden for agents", async () => {
    const caller = appRouter.createCaller(makeCtx("agent"));
    await expect(
      caller.sla.create({
        departmentId: 1,
        name: "Test SLA",
        ticketType: "technical",
        priority: "medium",
        responseTimeHours: 4,
        resolutionTimeHours: 24,
      })
    ).rejects.toThrow();
  });

  it("create is forbidden for correspondents", async () => {
    const caller = appRouter.createCaller(makeCtx("correspondent"));
    await expect(
      caller.sla.create({
        departmentId: 1,
        name: "Test SLA",
        ticketType: "technical",
        priority: "medium",
        responseTimeHours: 4,
        resolutionTimeHours: 24,
      })
    ).rejects.toThrow();
  });
});

// ─── Correspondents tests ─────────────────────────────────────────────────────

describe("correspondents", () => {
  it("list is accessible by agents", async () => {
    const caller = appRouter.createCaller(makeCtx("agent"));
    const result = await caller.correspondents.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list is accessible by admins", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.correspondents.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list is forbidden for correspondents", async () => {
    const caller = appRouter.createCaller(makeCtx("correspondent"));
    await expect(caller.correspondents.list()).rejects.toThrow();
  });

  it("create is forbidden for agents", async () => {
    const caller = appRouter.createCaller(makeCtx("agent"));
    await expect(
      caller.correspondents.create({ name: "Test Correspondent" })
    ).rejects.toThrow();
  });
});

// ─── Tickets tests ────────────────────────────────────────────────────────────

describe("tickets", () => {
  it("list is accessible by admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.tickets.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("stats is accessible by admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.tickets.stats();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("open");
  });

  it("update is forbidden for correspondents", async () => {
    const caller = appRouter.createCaller(makeCtx("correspondent"));
    await expect(
      caller.tickets.update({ id: 999, status: "in_progress" })
    ).rejects.toThrow();
  });

  it("assign is forbidden for correspondents", async () => {
    const caller = appRouter.createCaller(makeCtx("correspondent"));
    await expect(
      caller.tickets.assign({ id: 999, agentId: 1 })
    ).rejects.toThrow();
  });
});

// ─── Notifications tests ──────────────────────────────────────────────────────

describe("notifications", () => {
  it("list is accessible by authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx("correspondent"));
    const result = await caller.notifications.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("unreadCount returns a number", async () => {
    const caller = appRouter.createCaller(makeCtx("agent"));
    const count = await caller.notifications.unreadCount();
    expect(typeof count).toBe("number");
  });
});

// ─── Admin tests ──────────────────────────────────────────────────────────────

describe("admin", () => {
  it("users list is accessible by admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.users();
    expect(Array.isArray(result)).toBe(true);
  });

  it("users list is forbidden for agents", async () => {
    const caller = appRouter.createCaller(makeCtx("agent"));
    await expect(caller.admin.users()).rejects.toThrow();
  });

  it("users list is forbidden for correspondents", async () => {
    const caller = appRouter.createCaller(makeCtx("correspondent"));
    await expect(caller.admin.users()).rejects.toThrow();
  });

  it("updateUserRole is forbidden for agents", async () => {
    const caller = appRouter.createCaller(makeCtx("agent"));
    await expect(
      caller.admin.updateUserRole({ userId: 5, role: "correspondent" })
    ).rejects.toThrow();
  });
});
