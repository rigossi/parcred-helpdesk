import type { Request, Response } from "express";
import * as jose from "jose";
import { COOKIE_NAME } from "@shared/const";
import { getUserById } from "../db";

export type TrpcContext = {
  req: Request;
  res: Response;
  user: Awaited<ReturnType<typeof getUserById>> | null;
};

async function getSessionSecret(): Promise<Uint8Array> {
  const secret = process.env.JWT_SECRET ?? "parcred-helpdesk-secret-key-2026";
  return new TextEncoder().encode(secret);
}

export async function verifySession(token: string): Promise<{ userId: number } | null> {
  try {
    const secret = await getSessionSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    if (typeof payload.userId === "number") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function createSessionToken(userId: number): Promise<string> {
  const secret = await getSessionSecret();
  return new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function createContext({ req, res }: { req: Request; res: Response }): Promise<TrpcContext> {
  let user: TrpcContext["user"] = null;

  try {
    const raw = req.headers.cookie ?? "";
    const pairs = raw.split(";").map((s) => s.trim().split("="));
    const cookieMap = Object.fromEntries(pairs.map(([k, ...v]) => [k, v.join("=")]));
    const token = cookieMap[COOKIE_NAME];

    if (token) {
      const payload = await verifySession(decodeURIComponent(token));
      if (payload) {
        user = await getUserById(payload.userId);
      }
    }
  } catch {
    user = null;
  }

  return { req, res, user };
}
