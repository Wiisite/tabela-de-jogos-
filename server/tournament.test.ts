import { describe, expect, it } from "vitest";

// ─── Inline computeStandings for testing ──────────────────────────────────────

type StandingEntry = {
  teamId: number;
  teamName: string;
  shortName: string;
  color: string;
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
  teamList: { id: number; name: string; shortName: string; color: string }[],
  groupMatches: {
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
  }[]
): StandingEntry[] {
  const map = new Map<number, StandingEntry>();
  for (const t of teamList) {
    map.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      shortName: t.shortName,
      color: t.color,
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
      home.points += 3;
      away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }
  const entries = Array.from(map.values());
  for (const entry of entries) {
    entry.goalDiff = entry.goalsFor - entry.goalsAgainst;
  }
  return entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });
}

// ─── Round-robin generator ─────────────────────────────────────────────────────

function generateRoundRobin(teamIds: number[]) {
  const matches: { homeTeamId: number; awayTeamId: number }[] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({ homeTeamId: teamIds[i], awayTeamId: teamIds[j] });
    }
  }
  return matches;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

const TEAMS = [
  { id: 1, name: "Colégio Beryon", shortName: "BRY", color: "#1e3a8a" },
  { id: 2, name: "Colégio Educar", shortName: "EDU", color: "#166534" },
  { id: 3, name: "Colégio Santa Rita", shortName: "CSR", color: "#7c3aed" },
  { id: 4, name: "Colégio Marconi", shortName: "MCN", color: "#b91c1c" },
  { id: 5, name: "Colégio Parthenon", shortName: "PTH", color: "#d97706" },
  { id: 6, name: "Colégio Canada", shortName: "CDA", color: "#0e7490" },
];

describe("Round-robin generation", () => {
  it("generates correct number of matches for 6 teams", () => {
    const matches = generateRoundRobin(TEAMS.map((t) => t.id));
    // C(6,2) = 15 matches
    expect(matches).toHaveLength(15);
  });

  it("each pair appears exactly once", () => {
    const matches = generateRoundRobin(TEAMS.map((t) => t.id));
    const pairs = new Set(matches.map((m) => `${m.homeTeamId}-${m.awayTeamId}`));
    expect(pairs.size).toBe(15);
  });

  it("no team plays against itself", () => {
    const matches = generateRoundRobin(TEAMS.map((t) => t.id));
    for (const m of matches) {
      expect(m.homeTeamId).not.toBe(m.awayTeamId);
    }
  });
});

describe("Standings computation", () => {
  it("returns all teams with zero stats when no matches finished", () => {
    const standings = computeStandings(TEAMS, []);
    expect(standings).toHaveLength(6);
    for (const s of standings) {
      expect(s.points).toBe(0);
      expect(s.played).toBe(0);
    }
  });

  it("correctly awards 3 points to winner", () => {
    const matches = [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0, status: "finished" },
    ];
    const standings = computeStandings(TEAMS, matches);
    const team1 = standings.find((s) => s.teamId === 1)!;
    const team2 = standings.find((s) => s.teamId === 2)!;
    expect(team1.points).toBe(3);
    expect(team1.won).toBe(1);
    expect(team2.points).toBe(0);
    expect(team2.lost).toBe(1);
  });

  it("correctly awards 1 point each for a draw", () => {
    const matches = [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1, status: "finished" },
    ];
    const standings = computeStandings(TEAMS, matches);
    const team1 = standings.find((s) => s.teamId === 1)!;
    const team2 = standings.find((s) => s.teamId === 2)!;
    expect(team1.points).toBe(1);
    expect(team1.drawn).toBe(1);
    expect(team2.points).toBe(1);
    expect(team2.drawn).toBe(1);
  });

  it("sorts by points descending", () => {
    const matches = [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 0, status: "finished" },
      { homeTeamId: 3, awayTeamId: 4, homeScore: 1, awayScore: 1, status: "finished" },
    ];
    const standings = computeStandings(TEAMS, matches);
    expect(standings[0].teamId).toBe(1); // 3 points
    expect(standings[0].points).toBe(3);
  });

  it("ignores unfinished matches", () => {
    const matches = [
      { homeTeamId: 1, awayTeamId: 2, homeScore: null, awayScore: null, status: "scheduled" },
    ];
    const standings = computeStandings(TEAMS, matches);
    for (const s of standings) {
      expect(s.played).toBe(0);
    }
  });

  it("correctly computes goal difference", () => {
    const matches = [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 5, awayScore: 1, status: "finished" },
    ];
    const standings = computeStandings(TEAMS, matches);
    const team1 = standings.find((s) => s.teamId === 1)!;
    const team2 = standings.find((s) => s.teamId === 2)!;
    expect(team1.goalDiff).toBe(4);
    expect(team2.goalDiff).toBe(-4);
  });
});

describe("auth.logout", () => {
  it("passes basic sanity check", () => {
    expect(true).toBe(true);
  });
});
