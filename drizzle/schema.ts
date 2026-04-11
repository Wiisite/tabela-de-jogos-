import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Tournaments ───────────────────────────────────────────────────────────────

export const tournaments = mysqlTable("tournaments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("Geral"),
  status: mysqlEnum("status", ["pending", "group_stage", "semifinals", "final", "finished"])
    .default("pending")
    .notNull(),
  champion: varchar("champion", { length: 255 }),
  // Novas configurações profissionais
  groupCount: int("groupCount").default(1).notNull(),
  winPoints: int("winPoints").default(3).notNull(),
  drawPoints: int("drawPoints").default(1).notNull(),
  lossPoints: int("lossPoints").default(0).notNull(),
  isDoubleRound: int("isDoubleRound").default(0).notNull(), // 0=false, 1=true
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
