import "dotenv/config";
// Polyfill globalThis.crypto para Node 18 (necessário para jose e AWS SDK)
import { webcrypto } from "crypto";
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import multer from "multer";
import { storagePut } from "../storage";
import { verifySessionToken } from "./context";
import { COOKIE_NAME } from "@shared/const";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);

  // ─── Upload de anexos ────────────────────────────────────────────────────────
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      // Verificar autenticação
      const rawCookie = req.headers.cookie ?? "";
      const tokenMatch = rawCookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
      const rawToken = tokenMatch?.[1];
      const token = rawToken ? decodeURIComponent(rawToken) : undefined;
      if (!token) {
        res.status(401).json({ error: "Não autenticado" });
        return;
      }
      const user = await verifySessionToken(token);
      if (!user) {
        res.status(401).json({ error: "Sessão inválida" });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }

      const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const relKey = `tickets/attachments/${user.id}/${Date.now()}_${safeFileName}`;
      const { key, url } = await storagePut(relKey, file.buffer, file.mimetype);

      res.json({ key, url });
    } catch (err: any) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
