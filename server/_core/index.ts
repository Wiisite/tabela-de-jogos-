import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";


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
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Admin Login (Custom Password)
  app.post("/api/admin/login", async (req, res) => {
    const { password, portalId } = req.body;
    
    // 1. Super Admin Check
    if (password === process.env.ADMIN_PASSWORD) {
      const token = await sdk.createSessionToken(ENV.ownerOpenId, { name: "Super Admin" });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, cookieOptions);
      return res.json({ success: true, role: 'admin' });
    }

    // 2. Portal Admin Check
    if (portalId) {
      const portal = (await import("../db")).getPortalBySlug; // Wait, let's use a more direct way
      const db = await import("../db");
      const portals = await db.getAllPortals();
      const targetPortal = portals.find(p => p.id === portalId);

      if (targetPortal && targetPortal.adminPassword && password === targetPortal.adminPassword) {
        // Create a special openId for portal admins or just use a placeholder
        const portalAdminOpenId = `portal_admin_${targetPortal.id}`;
        
        // Ensure user exists in DB for session validation
        await db.upsertUser({
          openId: portalAdminOpenId,
          name: `${targetPortal.name} Admin`,
          role: 'admin',
          // We can't easily store portalId in user table without schema change, 
          // but we can imply it from the openId or a naming convention
        });

        const token = await sdk.createSessionToken(portalAdminOpenId, { name: `${targetPortal.name} Admin` });
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, token, cookieOptions);
        return res.json({ success: true, role: 'admin', portalId: targetPortal.id });
      }
    }

    res.status(401).json({ error: "Senha incorreta ou portal não encontrado" });
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
