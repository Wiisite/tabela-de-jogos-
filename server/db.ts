import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, matches, teams, tournaments, users, portals } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      console.log("[Database] Initialized successfully.");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
    }
  } else if (!_db) {
    console.warn("[Database] DATABASE_URL is missing!");
  }
  return _db;
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Portals ───────────────────────────────────────────────────────────────────

export async function getAllPortals() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(portals).orderBy(portals.name);
}

export async function getPortalBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(portals).where(eq(portals.slug, slug)).limit(1);
  return result[0];
}

export async function createPortal(data: {
  name: string;
  slug: string;
  logo?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  adminPassword?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(portals).values({
    name: data.name,
    slug: data.slug,
    logo: data.logo ?? null,
    primaryColor: data.primaryColor ?? "#1e3a8a",
    secondaryColor: data.secondaryColor ?? "#f59e0b",
    adminPassword: data.adminPassword ?? null,
  });
  return result[0].insertId;
}

export async function deletePortal(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(portals).where(eq(portals.id, id));
}

// ─── Tournaments ───────────────────────────────────────────────────────────────

export async function getAllTournaments(portalId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (portalId) {
    return db.select().from(tournaments).where(eq(tournaments.portalId, portalId)).orderBy(tournaments.createdAt);
  }
  return db.select().from(tournaments).orderBy(tournaments.createdAt);
}

export async function getTournamentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  return result[0];
}

export async function createTournament(
  portalId: number,
  name: string,
  category: string,
  config: {
    groupCount?: number;
    winPoints?: number;
    drawPoints?: number;
    lossPoints?: number;
    isDoubleRound?: boolean;
    sport?: "football" | "basketball" | "volleyball" | "handball" | "futsal";
  } = {}
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tournaments).values({
    portalId,
    name,
    category,
    status: "pending",
    sport: config.sport ?? "football",
    groupCount: config.groupCount ?? 1,
    winPoints: config.winPoints ?? 3,
    drawPoints: config.drawPoints ?? 1,
    lossPoints: config.lossPoints ?? 0,
    isDoubleRound: config.isDoubleRound ? 1 : 0,
  });
  return result[0].insertId;
}

export async function updateTournamentStatus(
  id: number,
  status: "pending" | "group_stage" | "semifinals" | "final" | "finished",
  champion?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(tournaments)
    .set({ status, ...(champion !== undefined ? { champion } : {}) })
    .where(eq(tournaments.id, id));
}

export async function deleteTournament(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(matches).where(eq(matches.tournamentId, id));
  await db.delete(teams).where(eq(teams.tournamentId, id));
  await db.delete(tournaments).where(eq(tournaments.id, id));
}


// ─── Teams ─────────────────────────────────────────────────────────────────────

export async function getTeamsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).where(eq(teams.tournamentId, tournamentId));
}

export async function createTeam(
  tournamentId: number,
  name: string,
  shortName: string,
  color: string,
  groupName: string = "A",
  logo?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(teams).values({ tournamentId, name, shortName, color, groupName, logo });
}

// ─── Matches ───────────────────────────────────────────────────────────────────

export async function getMatchesByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matches).where(eq(matches.tournamentId, tournamentId));
}

export async function getMatchesByPhase(
  tournamentId: number,
  phase: "group" | "semifinal" | "final"
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(matches)
    .where(and(eq(matches.tournamentId, tournamentId), eq(matches.phase, phase)));
}

export async function createMatch(
  tournamentId: number,
  phase: "group" | "semifinal" | "final" | "third_place",
  homeTeamId: number,
  awayTeamId: number,
  round: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(matches).values({ tournamentId, phase, homeTeamId, awayTeamId, round });
}

export async function updateMatchScore(
  matchId: number,
  homeScore: number,
  awayScore: number,
  penalties?: { home: number; away: number }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(matches)
    .set({
      homeScore,
      awayScore,
      homePenalties: penalties?.home ?? null,
      awayPenalties: penalties?.away ?? null,
      status: "finished",
    })
    .where(eq(matches.id, matchId));
}

export async function updateMatchDetails(
  matchId: number,
  matchDate?: string,
  matchTime?: string,
  location?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(matches)
    .set({
      ...(matchDate !== undefined ? { matchDate } : {}),
      ...(matchTime !== undefined ? { matchTime } : {}),
      ...(location !== undefined ? { location } : {}),
    })
    .where(eq(matches.id, matchId));
}

export async function resetMatchScore(matchId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(matches)
    .set({
      homeScore: null,
      awayScore: null,
      homePenalties: null,
      awayPenalties: null,
      status: "scheduled",
    })
    .where(eq(matches.id, matchId));
}

export async function getMatchById(matchId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  return result[0];
}

export async function getGlobalStats() {
  const db = await getDb();
  if (!db) return { tournaments: 0, teams: 0, matches: 0 };
  const tCount = await db.select().from(tournaments);
  const tmCount = await db.select().from(teams);
  const mCount = await db.select().from(matches);
  return {
    tournaments: tCount.length,
    teams: tmCount.length,
    matches: mCount.length,
  };
}
