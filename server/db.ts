import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, matches, teams, tournaments, users, portals } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _connectionErrorLogged = false;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      _connectionErrorLogged = false;
    } catch (error) {
      if (!_connectionErrorLogged) {
        console.error("[Database] Falha crítica de conexão. Verifique o Docker (db:3306).");
        _connectionErrorLogged = true;
      }
      _db = null;
    }
  }
  return _db;
}

/**
 * Health check for DB connection
 */
export async function checkConnection(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    // A simple query to test connection
    await db.execute(require("drizzle-orm").sql`SELECT 1`);
    return true;
  } catch (e) {
    return false;
  }
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

export async function updatePortal(
  id: number,
  data: {
    name?: string;
    logo?: string | null;
    banner?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    adminPassword?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(portals).set(data).where(eq(portals.id, id));
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
    slider?: string | null;
    sponsors?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    fontFamily?: string | null;
    heroTitleColor?: string | null;
    heroSubtitleColor?: string | null;
    heroSlider?: string | null;
    description?: string | null;
    regulation?: string | null;
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
    slider: config.slider ?? null,
    sponsors: config.sponsors ?? null,
    primaryColor: config.primaryColor ?? null,
    secondaryColor: config.secondaryColor ?? null,
    fontFamily: config.fontFamily ?? null,
    heroTitleColor: config.heroTitleColor ?? null,
    heroSubtitleColor: config.heroSubtitleColor ?? null,
    heroSlider: config.heroSlider ?? null,
    description: config.description ?? null,
    regulation: config.regulation ?? null,
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

export async function updateTournament(
  id: number,
  data: {
    name?: string;
    category?: string;
    sport?: "football" | "basketball" | "volleyball" | "handball" | "futsal";
    groupCount?: number;
    winPoints?: number;
    drawPoints?: number;
    lossPoints?: number;
    isDoubleRound?: boolean;
    champion?: string | null;
    slider?: string | null;
    sponsors?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    fontFamily?: string | null;
    heroTitleColor?: string | null;
    heroSubtitleColor?: string | null;
    heroSlider?: string | null;
    description?: string | null;
    regulation?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  const updateSet: any = { ...data };
  if (data.isDoubleRound !== undefined) {
    updateSet.isDoubleRound = data.isDoubleRound ? 1 : 0;
  }

  await db.update(tournaments).set(updateSet).where(eq(tournaments.id, id));
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

export async function updateTeam(
  id: number,
  data: {
    name?: string;
    shortName?: string;
    color?: string;
    groupName?: string;
    logo?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(teams).set(data).where(eq(teams.id, id));
}

export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(teams).where(eq(teams.id, id));
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

export async function deleteMatchesByTournament(
  tournamentId: number,
  phase?: "group" | "semifinal" | "final" | "third_place"
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const condition = phase 
    ? and(eq(matches.tournamentId, tournamentId), eq(matches.phase, phase))
    : eq(matches.tournamentId, tournamentId);
  await db.delete(matches).where(condition);
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
