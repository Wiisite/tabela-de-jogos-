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
import * as db from "../db";


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
  registerOAuthRoutes(app);

  // Health check route for panel
  app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
  // Admin Login (Custom Password or Database User)
  app.post("/api/admin/login", async (req, res) => {
    const { email, password, portalId } = req.body;
    
    // 1. Super Admin Check (Global Env Var)
    if (password === process.env.ADMIN_PASSWORD && (!email || email === 'admin')) {
      const token = await sdk.createSessionToken(ENV.ownerOpenId, { name: "Super Admin" });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, cookieOptions);
      return res.json({ success: true, role: 'admin' });
    }

    // 2. Database User Check (Email + Password)
    if (email) {
      const user = await db.getUserByEmail(email);
      if (user && user.role === 'admin' && user.password === password) {
        const token = await sdk.createSessionToken(user.openId, { name: user.name || "Admin" });
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, token, cookieOptions);
        return res.json({ success: true, role: 'admin', portalId: user.portalId });
      }
    }

    // 3. Portal Admin Check (Portal specific password)
    if (portalId) {
      try {
        const db = await import("../db");
        const portals = await db.getAllPortals();
        const targetPortal = portals.find(p => p.id === portalId);

        if (targetPortal && targetPortal.adminPassword && password === targetPortal.adminPassword) {
          const portalAdminOpenId = `portal_admin_${targetPortal.id}`;
          await db.upsertUser({
            openId: portalAdminOpenId,
            name: `${targetPortal.name} Admin`,
            role: 'admin',
          });

          const token = await sdk.createSessionToken(portalAdminOpenId, { name: `${targetPortal.name} Admin` });
          const cookieOptions = getSessionCookieOptions(req);
          res.cookie(COOKIE_NAME, token, cookieOptions);
          return res.json({ success: true, role: 'admin', portalId: targetPortal.id });
        }
      } catch (e) {
        console.error("[Login] Portal check failed (DB likely down):", e);
      }
    }

    res.status(401).json({ error: "Senha incorreta ou portal não encontrado" });
  });

  // Emergency Password Rescue Route
  app.post("/api/admin/rescue", async (req, res) => {
    const { password, email } = req.body;

    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: "Chave de resgate inválida" });
    }

    if (!email) {
      return res.status(400).json({ error: "E-mail alvo é obrigatório" });
    }

    try {
      const database = await db.getDb();
      if (!database) throw new Error("Database not connected");

      const { users: usersTable } = await import("../../drizzle/schema");
      await database.insert(usersTable).values({
        openId: `rescue_${Date.now()}`,
        name: "Admin Restaurado",
        email: email,
        password: password,
        role: "admin",
        lastSignedIn: new Date()
      }).onDuplicateKeyUpdate({
        set: { password, role: "admin" }
      });

      return res.json({ success: true, message: `Acesso restaurado para ${email}` });
    } catch (e) {
      console.error("[Rescue] Failed to rescue admin:", e);
      return res.status(500).json({ error: "Falha ao acessar o banco de dados. Verifique se o MySQL está rodando." });
    }
  });

  // Admin Registration Route
  app.post("/api/admin/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    try {
      const database = await db.getDb();
      if (!database) throw new Error("Database not connected");

      const { users: usersTable } = await import("../../drizzle/schema");
      
      // Check if user already exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado" });
      }

      await database.insert(usersTable).values({
        openId: `local_${Date.now()}`,
        name,
        email,
        password, // Plain text as per current project standard (should be hashed in production)
        role: "admin",
        lastSignedIn: new Date()
      });

      return res.json({ success: true, message: "Administrador cadastrado com sucesso!" });
    } catch (e) {
      console.error("[Register] Failed to register admin:", e);
      return res.status(500).json({ error: "Erro ao cadastrar administrador. Verifique o banco de dados." });
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
  const hasPlatformPort = typeof process.env.PORT === "string" && process.env.PORT.length > 0;
  const port = hasPlatformPort ? preferredPort : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Bind to 0.0.0.0 to allow external reachability in containers/IaaS
  server.listen(port, "0.0.0.0", async () => {
    console.log(`Server running on http://0.0.0.0:${port}/ (detected from PORT env: ${process.env.PORT || 'not set'})`);
    console.log(`Local Access: http://localhost:${port}/`);
    
    // Auto-seed requested admin user
    try {
      const email = "apefia1998@gmail.com";
      const password = "@coi2046WII#"; 
      const database = await db.getDb();
      if (database) {
        const { users: usersTable } = await import("../../drizzle/schema");
        await database.insert(usersTable).values({
          openId: `manual_master_seed`,
          name: "Super Admin (ApefA)",
          email: email,
          password: password,
          role: "admin",
          lastSignedIn: new Date()
        }).onDuplicateKeyUpdate({
          set: { password, role: "admin" }
        });
        console.log(`[System] Super Admin seed successful for ${email}`);
      }
    } catch (e) {
      console.error("[System] Failed to seed super admin:", e);
    }

    // Quick DB table check to confirm creation
    try {
      const database = await db.getDb();
      if (database) {
        console.log("[System] Connecting to database for health check...");
        const portals = await db.getAllPortals();
        console.log(`[System] Database OK. Found ${portals.length} portals in schema.`);
      } else {
        console.error("[System] Database connection failed: _db is null");
      }
    } catch (e) {
      console.error("[System] Database initialization check failed:", e);
    }
  });
}

startServer().catch(console.error);
