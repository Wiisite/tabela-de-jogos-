import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createMatch,
  createTeam,
  createTournament,
  getAllTournaments,
  getMatchesByPhase,
  getMatchesByTournament,
  getMatchById,
  getTeamsByTournament,
  getTournamentById,
  updateMatchScore,
  updateTournamentStatus,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// ─── Standings helper ──────────────────────────────────────────────────────────

type StandingEntry = {
  teamId: number;
  teamName: string;
  shortName: string;
  color: string;
  groupName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

function computeStandings(
  teamList: { id: number; name: string; shortName: string; color: string; groupName: string }[],
  groupMatches: {
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
  }[],
  pointsConfig: { win: number; draw: number; loss: number } = { win: 3, draw: 1, loss: 0 }
): StandingEntry[] {
  const map = new Map<number, StandingEntry>();
  for (const t of teamList) {
    map.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      shortName: t.shortName,
      color: t.color,
      groupName: t.groupName,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }

  for (const m of groupMatches) {
    if (m.status !== "finished" || m.homeScore === null || m.awayScore === null) continue;
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++;
      home.points += pointsConfig.win;
      away.lost++;
      away.points += pointsConfig.loss;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      away.points += pointsConfig.win;
      home.lost++;
      home.points += pointsConfig.loss;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += pointsConfig.draw;
      away.points += pointsConfig.draw;
    }
  }

  const entries = Array.from(map.values());
  for (const entry of entries) {
    entry.goalDiff = entry.goalsFor - entry.goalsAgainst;
  }

  // Sorting with Tie-breakers: Points > Victories > Goal Diff > Goals For > Head-to-Head
  return entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

    // Head-to-head (very simplified for this version: find match between them)
    const h2hMatch = groupMatches.find(
      (m) =>
        m.status === "finished" &&
        ((m.homeTeamId === a.teamId && m.awayTeamId === b.teamId) ||
          (m.homeTeamId === b.teamId && m.awayTeamId === a.teamId))
    );
    if (h2hMatch && h2hMatch.homeScore !== h2hMatch.awayScore) {
      const aScore = h2hMatch.homeTeamId === a.teamId ? h2hMatch.homeScore! : h2hMatch.awayScore!;
      const bScore = h2hMatch.homeTeamId === b.teamId ? h2hMatch.homeScore! : h2hMatch.awayScore!;
      return bScore - aScore;
    }

    return 0;
  });
}

// ─── Seed helper ───────────────────────────────────────────────────────────────

const DEFAULT_TEAMS = [
  { name: "Colégio Beryon", shortName: "BRY", color: "#1e3a8a" },
  { name: "Colégio Educar", shortName: "EDU", color: "#166534" },
  { name: "Colégio Santa Rita", shortName: "CSR", color: "#7c3aed" },
  { name: "Colégio Marconi", shortName: "MCN", color: "#b91c1c" },
  { name: "Colégio Parthenon", shortName: "PTH", color: "#d97706" },
  { name: "Colégio Canada", shortName: "CDA", color: "#0e7490" },
];

// ─── Tournament Router ─────────────────────────────────────────────────────────

const tournamentRouter = router({
  list: publicProcedure.query(async () => {
    return getAllTournaments();
  }),

  getGlobalStats: publicProcedure.query(async () => {
    const stats = await import("./db").then((db) => db.getGlobalStats());
    return stats;
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const tournament = await getTournamentById(input.id);
    if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "Torneio não encontrado" });
    const teamList = await getTeamsByTournament(input.id);
    const matchList = await getMatchesByTournament(input.id);
    return { tournament, teams: teamList, matches: matchList };
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        groupCount: z.number().min(1).max(4).default(1),
        winPoints: z.number().default(3),
        drawPoints: z.number().default(1),
        lossPoints: z.number().default(0),
        isDoubleRound: z.boolean().default(false),
        teams: z
          .array(
            z.object({
              name: z.string().min(1),
              shortName: z.string().min(1).max(10),
              color: z.string().default("#1e40af"),
              groupName: z.string().default("A"),
            })
          )
          .min(2),
      })
    )
    .mutation(async ({ input }) => {
      const tournamentId = await createTournament(input.name, input.category, {
        groupCount: input.groupCount,
        winPoints: input.winPoints,
        drawPoints: input.drawPoints,
        lossPoints: input.lossPoints,
        isDoubleRound: input.isDoubleRound,
      });

      // Insert teams with their assigned groups
      for (const t of input.teams) {
        await createTeam(tournamentId, t.name, t.shortName, t.color, t.groupName);
      }
      return { id: tournamentId };
    }),

  generateGroupMatches: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ input }) => {
      const tournament = await getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });
      const teamList = await getTeamsByTournament(input.tournamentId);
      
      const existing = await getMatchesByPhase(input.tournamentId, "group");
      if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Confrontos já gerados" });

      // Group teams by groupName
      const groups: Record<string, typeof teamList> = {};
      for (const t of teamList) {
        if (!groups[t.groupName]) groups[t.groupName] = [];
        groups[t.groupName].push(t);
      }

      let round = 1;
      for (const groupName in groups) {
        const groupTeams = groups[groupName];
        if (groupTeams.length < 2) continue;

        // Turno
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            await createMatch(input.tournamentId, "group", groupTeams[i].id, groupTeams[j].id, round);
          }
        }

        // Returno
        if (tournament.isDoubleRound) {
          for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
              await createMatch(input.tournamentId, "group", groupTeams[j].id, groupTeams[i].id, round + 1);
            }
          }
        }
      }

      await updateTournamentStatus(input.tournamentId, "group_stage");
      return { ok: true };
    }),

  getStandings: publicProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ input }) => {
      const tournament = await getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });
      const teamList = await getTeamsByTournament(input.tournamentId);
      const groupMatches = await getMatchesByPhase(input.tournamentId, "group");
      
      const pointsConfig = {
        win: tournament.winPoints,
        draw: tournament.drawPoints,
        loss: tournament.lossPoints,
      };

      // Calculate standings per group
      const groups = [...new Set(teamList.map((t) => t.groupName))].sort();
      const standingsByGroup: Record<string, StandingEntry[]> = {};

      for (const g of groups) {
        const gTeams = teamList.filter((t) => t.groupName === g);
        const gMatches = groupMatches.filter((m) => {
          const home = gTeams.find(t => t.id === m.homeTeamId);
          const away = gTeams.find(t => t.id === m.awayTeamId);
          return !!home && !!away;
        });
        standingsByGroup[g] = computeStandings(gTeams, gMatches, pointsConfig);
      }

      return standingsByGroup;
    }),

  generateSemifinals: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ input }) => {
      const tournament = await getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });
      
      const teamList = await getTeamsByTournament(input.tournamentId);
      const groupMatches = await getMatchesByPhase(input.tournamentId, "group");
      const unfinished = groupMatches.filter((m) => m.status !== "finished");
      if (unfinished.length > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ainda há partidas da fase de grupos em aberto" });

      const existing = await getMatchesByPhase(input.tournamentId, "semifinal");
      if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Semifinais já geradas" });

      const pointsConfig = { win: tournament.winPoints, draw: tournament.drawPoints, loss: tournament.lossPoints };
      const groupNames = [...new Set(teamList.map((t) => t.groupName))].sort();
      
      if (tournament.groupCount === 1) {
        const standings = computeStandings(teamList, groupMatches, pointsConfig);
        if (standings.length < 4) throw new TRPCError({ code: "BAD_REQUEST", message: "Mínimo 4 equipes para semis" });
        await createMatch(input.tournamentId, "semifinal", standings[0].teamId, standings[3].teamId, 1);
        await createMatch(input.tournamentId, "semifinal", standings[1].teamId, standings[2].teamId, 2);
      } else if (tournament.groupCount === 2) {
        const sA = computeStandings(teamList.filter(t => t.groupName === "A"), groupMatches, pointsConfig);
        const sB = computeStandings(teamList.filter(t => t.groupName === "B"), groupMatches, pointsConfig);
        if (sA.length < 2 || sB.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "Mínimo 2 equipes por grupo" });
        // A1 vs B2, B1 vs A2
        await createMatch(input.tournamentId, "semifinal", sA[0].teamId, sB[1].teamId, 1);
        await createMatch(input.tournamentId, "semifinal", sB[0].teamId, sA[1].teamId, 2);
      } else if (tournament.groupCount === 4) {
        const sA = computeStandings(teamList.filter(t => t.groupName === "A"), groupMatches, pointsConfig);
        const sB = computeStandings(teamList.filter(t => t.groupName === "B"), groupMatches, pointsConfig);
        const sC = computeStandings(teamList.filter(t => t.groupName === "C"), groupMatches, pointsConfig);
        const sD = computeStandings(teamList.filter(t => t.groupName === "D"), groupMatches, pointsConfig);
        // A1 vs D1, B1 vs C1
        await createMatch(input.tournamentId, "semifinal", sA[0].teamId, sD[0].teamId, 1);
        await createMatch(input.tournamentId, "semifinal", sB[0].teamId, sC[0].teamId, 2);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Formato de grupos não suportado para geração automática de semis" });
      }

      await updateTournamentStatus(input.tournamentId, "semifinals");
      return { ok: true };
    }),

  generateFinal: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ input }) => {
      const semis = await getMatchesByPhase(input.tournamentId, "semifinal");
      const unfinished = semis.filter((m) => m.status !== "finished");
      if (unfinished.length > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ainda há semifinais em aberto" });

      const existing = await getMatchesByPhase(input.tournamentId, "final");
      if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Final já gerada" });

      const getWinnerAndLoser = (m: typeof semis[0]) => {
        const hS = m.homeScore! + (m.homePenalties ?? 0);
        const aS = m.awayScore! + (m.awayPenalties ?? 0);
        if (hS > aS) return { winner: m.homeTeamId, loser: m.awayTeamId };
        return { winner: m.awayTeamId, loser: m.homeTeamId };
      };

      const semi1 = semis.find((m) => m.round === 1)!;
      const semi2 = semis.find((m) => m.round === 2)!;
      const res1 = getWinnerAndLoser(semi1);
      const res2 = getWinnerAndLoser(semi2);

      // Final
      await createMatch(input.tournamentId, "final", res1.winner, res2.winner, 1);
      // Third place
      await createMatch(input.tournamentId, "third_place", res1.loser, res2.loser, 1);

      await updateTournamentStatus(input.tournamentId, "final");
      return { ok: true };
    }),

  getBracket: publicProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ input }) => {
      const teamList = await getTeamsByTournament(input.tournamentId);
      const allMatches = await getMatchesByTournament(input.tournamentId);
      const teamMap = new Map(teamList.map((t) => [t.id, t]));
      const enrich = (m: (typeof allMatches)[0]) => ({
        ...m,
        homeTeam: teamMap.get(m.homeTeamId),
        awayTeam: teamMap.get(m.awayTeamId),
      });
      return {
        group: allMatches.filter((m) => m.phase === "group").map(enrich),
        semifinal: allMatches.filter((m) => m.phase === "semifinal").map(enrich),
        final: allMatches.filter((m) => m.phase === "final").map(enrich),
        third_place: allMatches.filter((m) => m.phase === "third_place").map(enrich),
      };
    }),
});

// ─── Match Router ──────────────────────────────────────────────────────────────

const matchRouter = router({
  updateScore: protectedProcedure
    .input(
      z.object({
        matchId: z.number(),
        homeScore: z.number().min(0),
        awayScore: z.number().min(0),
        homePenalties: z.number().optional(),
        awayPenalties: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const match = await getMatchById(input.matchId);
      if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "Partida não encontrada" });
      
      await updateMatchScore(input.matchId, input.homeScore, input.awayScore, 
        input.homePenalties !== undefined ? { home: input.homePenalties, away: input.awayPenalties! } : undefined
      );

      // If final match finished, set champion
      if (match.phase === "final") {
        const hS = input.homeScore + (input.homePenalties ?? 0);
        const aS = input.awayScore + (input.awayPenalties ?? 0);
        const winner = hS >= aS ? match.homeTeamId : match.awayTeamId;
        const teamList = await getTeamsByTournament(match.tournamentId);
        const championTeam = teamList.find((t) => t.id === winner);
        await updateTournamentStatus(match.tournamentId, "finished", championTeam?.name);
      }
      return { ok: true };
    }),
});

// ─── Seed Router ───────────────────────────────────────────────────────────────

const seedRouter = router({
  seedExample: protectedProcedure.mutation(async () => {
    const tournamentId = await createTournament("Sub-9 MASC", "Sub-9 Masculino", { groupCount: 1 });
    for (const team of DEFAULT_TEAMS) {
      await createTeam(tournamentId, team.name, team.shortName, team.color, "A");
    }
    return { id: tournamentId };
  }),

  checkAndSeed: publicProcedure.mutation(async () => {
    const all = await getAllTournaments();
    if (all.length === 0) {
      const tournamentId = await createTournament("Sub-9 MASC", "Sub-9 Masculino", { groupCount: 1 });
      for (const team of DEFAULT_TEAMS) {
        await createTeam(tournamentId, team.name, team.shortName, team.color, "A");
      }
      return { seeded: true, tournamentId };
    }
    return { seeded: false };
  }),
});

// ─── App Router ────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  tournament: tournamentRouter,
  match: matchRouter,
  seed: seedRouter,
});

export type AppRouter = typeof appRouter;
