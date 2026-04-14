import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  longtext,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  password: text("password"),
  portalId: int("portalId"), // Opcional: vincula um admin a um portal específico
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Portals ───────────────────────────────────────────────────────────────────

export const portals = mysqlTable("portals", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logo: longtext("logo"),
  primaryColor: varchar("primaryColor", { length: 7 }).default("#1e3a8a").notNull(),
  secondaryColor: varchar("secondaryColor", { length: 7 }).default("#f59e0b").notNull(),
  banner: longtext("banner"),
  fontFamily: varchar("fontFamily", { length: 100 }).default("Inter").notNull(),
  heroTitle: varchar("heroTitle", { length: 255 }),
  heroSubtitle: text("heroSubtitle"),
  aboutText: longtext("aboutText"),
  heroBadgeLabel: varchar("heroBadgeLabel", { length: 255 }).default("Portal Oficial de Torneios"),
  heroOverlayOpacity: int("heroOverlayOpacity").default(80),
  heroTitleColor: varchar("heroTitleColor", { length: 7 }),
  heroSubtitleColor: varchar("heroSubtitleColor", { length: 7 }),
  heroBadgeColor: varchar("heroBadgeColor", { length: 7 }),
  generalRegulation: longtext("generalRegulation"),
  sponsors: longtext("sponsors"),
  adminPassword: varchar("adminPassword", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Portal = typeof portals.$inferSelect;
export type InsertPortal = typeof portals.$inferInsert;

// ─── Tournaments ───────────────────────────────────────────────────────────────

export const tournaments = mysqlTable("tournaments", {
  id: int("id").autoincrement().primaryKey(),
  portalId: int("portalId").notNull().default(1),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("Geral"),
  status: mysqlEnum("status", ["pending", "group_stage", "semifinals", "final", "finished"])
    .default("pending")
    .notNull(),
  champion: varchar("champion", { length: 255 }),
  // Novas configurações profissionais
  sport: mysqlEnum("sport", ["football", "basketball", "volleyball", "handball", "futsal"]).default("football").notNull(),
  groupCount: int("groupCount").default(1).notNull(),
  winPoints: int("winPoints").default(3).notNull(),
  drawPoints: int("drawPoints").default(1).notNull(),
  lossPoints: int("lossPoints").default(0).notNull(),
  isDoubleRound: int("isDoubleRound").default(0).notNull(), // 0=false, 1=true
  slider: longtext("slider"), // JSON array of base64 images
  sponsors: longtext("sponsors"), // JSON array of { name, logo }
  primaryColor: varchar("primaryColor", { length: 7 }),
  secondaryColor: varchar("secondaryColor", { length: 7 }),
  fontFamily: varchar("fontFamily", { length: 100 }),
  description: longtext("description"),
  regulation: longtext("regulation"),
  heroTitleColor: varchar("heroTitleColor", { length: 7 }),
  heroSubtitleColor: varchar("heroSubtitleColor", { length: 7 }),
  heroSlider: longtext("heroSlider"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});


export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;

// ─── Teams ─────────────────────────────────────────────────────────────────────

export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 10 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#1e40af"),
  logo: longtext("logo"),
  groupName: varchar("groupName", { length: 10 }).notNull().default("A"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// ─── Matches ───────────────────────────────────────────────────────────────────

export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  phase: mysqlEnum("phase", ["group", "semifinal", "final", "third_place"]).notNull(),
  round: int("round").default(1).notNull(),
  homeTeamId: int("homeTeamId").notNull(),
  awayTeamId: int("awayTeamId").notNull(),
  homeScore: int("homeScore"),
  awayScore: int("awayScore"),
  homePenalties: int("homePenalties"),
  awayPenalties: int("awayPenalties"),
  matchDate: varchar("matchDate", { length: 50 }),
  matchTime: varchar("matchTime", { length: 50 }),
  location: varchar("location", { length: 255 }),
  status: mysqlEnum("status", ["scheduled", "finished"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;
