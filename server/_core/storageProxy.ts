import type { Express } from "express";
import { storageGetSignedUrl } from "../storage";

// Proxy de storage: redireciona /storage/:key e /manus-storage/:key
// para URL assinada do R2.
export function registerStorageProxy(app: Express) {
  async function handleStorageRequest(req: any, res: any) {
    // Extrai o key removendo o prefixo /storage/ ou /manus-storage/
    const key = req.path.replace(/^\/(manus-storage|storage)\//, "");

    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const signedUrl = await storageGetSignedUrl(key);
      res.set("Cache-Control", "no-store");
      res.redirect(307, signedUrl);
    } catch (err) {
      console.error("[StorageProxy] failed for key:", key, err);
      res.status(502).send("Storage proxy error");
    }
  }

  app.get("/storage/*", handleStorageRequest);
  app.get("/manus-storage/*", handleStorageRequest);
}
