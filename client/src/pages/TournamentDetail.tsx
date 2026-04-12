import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import {
  Trophy,
  ArrowLeft,
  Users,
  BarChart3,
  GitBranch,
  Swords,
  Star,
  Clock,
  Shield,
  Download,
  Trash2,
  CheckCircle2,
  X,
  Settings,
  Image as ImageIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type Tab = "groups" | "standings" | "bracket" | "semifinals" | "final";
type Sport = "football" | "basketball" | "volleyball" | "handball" | "futsal";

const SPORT_CONFIG: Record<Sport, { label: string; emoji: string; scoreLabel: string; proLabel: string; contraLabel: string; saldoLabel: string; hasPenalties: boolean }> = {
  football:   { label: "Futebol",  emoji: "⚽", scoreLabel: "Gols",   proLabel: "GP", contraLabel: "GC", saldoLabel: "SG", hasPenalties: true },
  basketball: { label: "Basquete", emoji: "🏀", scoreLabel: "Pontos", proLabel: "PP", contraLabel: "PC", saldoLabel: "SP", hasPenalties: false },
  volleyball: { label: "Vôlei",    emoji: "🏐", scoreLabel: "Sets",   proLabel: "SP", contraLabel: "SC", saldoLabel: "SS", hasPenalties: false },
  handball:   { label: "Handebol", emoji: "🤾", scoreLabel: "Gols",   proLabel: "GP", contraLabel: "GC", saldoLabel: "SG", hasPenalties: true },
  futsal:     { label: "Futsal",   emoji: "👟", scoreLabel: "Gols",   proLabel: "GP", contraLabel: "GC", saldoLabel: "SG", hasPenalties: true },
};

function TeamBadge({
  color,
  short,
  name,
  logo,
  size = "md",
}: {
  color: string;
  short: string;
  name?: string;
  logo?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizes[size]} rounded-lg flex items-center justify-center font-bold text-white shrink-0 overflow-hidden truncate px-0.5`}
        style={{ background: logo ? 'transparent' : color }}
      >
        {logo ? (
          <div 
            className="w-full h-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${logo})` }}
          />
        ) : (
          short.slice(0, 3)
        )}
      </div>
      {name && <span className="text-sm font-medium text-foreground truncate">{name}</span>}
    </div>
  );
}

type MatchForModal = { 
  id: number; 
  homeTeamId: number; 
  awayTeamId: number; 
  homeScore: number | null; 
  awayScore: number | null;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  phase?: string;
  matchDate?: string | null;
  matchTime?: string | null;
  location?: string | null;
};

const PHASE_LABEL_MAP: Record<string, string> = {
  group: "Fase de Grupos",
  semifinal: "Semifinal",
  final: "Grande Final",
  third_place: "Disputa de 3º Lugar",
};

function ScoreModal({
  match,
  teams,
  sport,
  onClose,
  onSave,
  onReset,
}: {
  match: MatchForModal;
  teams: { id: number; name: string; shortName: string; color: string; logo?: string | null }[];
  sport?: Sport;
  onClose: () => void;
  onSave: (matchId: number, home: number, away: number, hp?: number, ap?: number, date?: string, time?: string, loc?: string) => void;
  onReset?: (matchId: number) => void;
}) {
  const homeTeam = teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t) => t.id === match.awayTeamId);
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [hp, setHp] = useState(match.homePenalties ?? 0);
  const [ap, setAp] = useState(match.awayPenalties ?? 0);
  const [date, setDate] = useState(match.matchDate ?? "");
  const [time, setTime] = useState(match.matchTime ?? "");
  const [loc, setLoc] = useState(match.location ?? "");

  const sportCfg = SPORT_CONFIG[sport ?? "football"];
  const isKnockout = match.phase !== "group";
  const isDraw = home === away;
  const hasResult = match.homeScore !== null;
  const phaseLabel = PHASE_LABEL_MAP[match.phase ?? "group"] ?? "Partida";
  const showPenalties = sportCfg.hasPenalties && isKnockout && isDraw;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm shadow-premium overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center shadow-gold shrink-0">
              <Swords className="w-4 h-4 text-amber-950" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-foreground leading-tight">
                {hasResult ? "Editar Resultado" : "Registrar Placar"}
              </p>
              <p className="text-[10px] text-muted-foreground">{phaseLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3 justify-center mb-5">
            <div className="flex-1 flex flex-col items-center gap-2">
              {homeTeam && <TeamBadge color={homeTeam.color} short={homeTeam.shortName} logo={homeTeam.logo} size="lg" />}
              <p className="text-xs text-muted-foreground text-center leading-tight max-w-[90px] truncate">{homeTeam?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min={0} value={home} onChange={(e) => setHome(Math.max(0, parseInt(e.target.value) || 0))} className="w-14 h-14 text-center text-2xl font-bold bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
              <span className="text-muted-foreground font-bold text-lg">×</span>
              <input type="number" min={0} value={away} onChange={(e) => setAway(Math.max(0, parseInt(e.target.value) || 0))} className="w-14 h-14 text-center text-2xl font-bold bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              {awayTeam && <TeamBadge color={awayTeam.color} short={awayTeam.shortName} logo={awayTeam.logo} size="lg" />}
              <p className="text-xs text-muted-foreground text-center leading-tight max-w-[90px] truncate">{awayTeam?.name}</p>
            </div>
          </div>
          {showPenalties && (
            <div className="mb-4 p-3 bg-amber-900/10 border border-gold/20 rounded-xl">
              <p className="text-[10px] text-center text-gold font-semibold uppercase tracking-wider mb-2">Pênaltis</p>
              <div className="flex items-center gap-3 justify-center">
                <input type="number" min={0} value={hp} onChange={(e) => setHp(Math.max(0, parseInt(e.target.value) || 0))} className="w-12 h-10 text-center text-lg font-bold bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-gold" />
                <span className="text-muted-foreground text-xs font-bold">( pen )</span>
                <input type="number" min={0} value={ap} onChange={(e) => setAp(Math.max(0, parseInt(e.target.value) || 0))} className="w-12 h-10 text-center text-lg font-bold bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
            </div>
          )}
          <div className="space-y-2 mb-5 p-3 border border-border/40 rounded-xl bg-background/50">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detalhes</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-8 px-2 text-xs bg-input border border-border rounded-md focus:outline-none" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full h-8 px-2 text-xs bg-input border border-border rounded-md focus:outline-none" />
            </div>
            <input type="text" placeholder="Local" value={loc} onChange={(e) => setLoc(e.target.value)} className="w-full h-8 px-3 text-xs bg-input border border-border rounded-md focus:outline-none" />
          </div>
          {hasResult && onReset && (
            <button onClick={() => window.confirm("Excluir o resultado?") && onReset(match.id)} className="w-full flex items-center justify-center gap-2 h-8 mb-3 rounded-lg border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Excluir Resultado
            </button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 h-10 gradient-gold text-amber-950 font-semibold" onClick={() => onSave(match.id, home, away, showPenalties ? hp : undefined, showPenalties ? ap : undefined, date, time, loc)}>Salvar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, teams, isAdmin, onEdit }: any) {
  const homeTeam = teams.find((t: any) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t: any) => t.id === match.awayTeamId);
  const finished = match.status === "finished";
  const hasPenalties = match.homePenalties !== null && match.awayPenalties !== null;

  return (
    <div className={`bg-card border rounded-xl p-4 transition-all ${finished ? "border-border/40" : "border-border/60 hover:border-gold/30"}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 justify-end">
          {homeTeam && <><span className="text-sm font-medium text-foreground text-right truncate max-w-[120px]">{homeTeam.name}</span><TeamBadge color={homeTeam.color} short={homeTeam.shortName} logo={homeTeam.logo} size="sm" /></>}
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          {finished ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-lg">
              <span className="text-lg font-bold text-foreground w-5 text-center">{match.homeScore}</span>
              <span className="text-muted-foreground text-sm">–</span>
              <span className="text-lg font-bold text-foreground w-5 text-center">{match.awayScore}</span>
            </div>
          ) : <div className="px-3 py-1.5 bg-secondary rounded-lg font-bold text-xs text-muted-foreground">VS</div>}
          {finished && hasPenalties && <span className="text-[10px] text-gold font-bold">({match.homePenalties}-{match.awayPenalties})</span>}
        </div>
        <div className="flex-1 flex items-center gap-2">
          {awayTeam && <><TeamBadge color={awayTeam.color} short={awayTeam.shortName} logo={awayTeam.logo} size="sm" /><span className="text-sm font-medium text-foreground truncate max-w-[120px]">{awayTeam.name}</span></>}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 text-[10px] font-medium ${finished ? 'text-green-400' : 'text-muted-foreground'}`}>
            {finished ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {finished ? 'Encerrado' : 'Aguardando'}
          </span>
          {(match.matchDate || match.matchTime || match.location) && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{match.matchDate} {match.matchTime} • {match.location}</span>
          )}
        </div>
        {isAdmin && onEdit && (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-border/60" onClick={() => onEdit(match)}>Editar</Button>
        )}
      </div>
    </div>
  );
}

function StandingsTable({ standings, title, sport }: any) {
  const sc = SPORT_CONFIG[sport as Sport ?? "football"];
  return (
    <div className="mb-8">
      {title && <h3 className="text-lg font-semibold text-foreground mb-4">Grupo {title}</h3>}
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/50">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium w-8">#</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Equipe</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">J</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">V</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">E</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">D</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">{sc.proLabel}</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">{sc.contraLabel}</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">{sc.saldoLabel}</th>
              <th className="text-center py-3 px-4 text-gold font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s: any, i: number) => (
              <tr key={s.teamId} className={`border-b border-border/30 transition-colors hover:bg-accent/30 ${i < 2 ? "bg-amber-900/10" : ""}`}>
                <td className="py-3 px-4"><span className={`text-xs font-bold ${i < 2 ? "text-gold" : "text-muted-foreground"}`}>{i + 1}</span></td>
                <td className="py-3 px-4"><TeamBadge color={s.color} short={s.shortName} logo={s.logo} name={s.teamName} size="sm" /></td>
                <td className="py-3 px-3 text-center text-foreground">{s.played}</td>
                <td className="py-3 px-3 text-center text-green-400 font-medium">{s.won}</td>
                <td className="py-3 px-3 text-center text-yellow-400 font-medium">{s.drawn}</td>
                <td className="py-3 px-3 text-center text-red-400 font-medium">{s.lost}</td>
                <td className="py-3 px-3 text-center text-foreground">{s.goalsFor}</td>
                <td className="py-3 px-3 text-center text-foreground">{s.goalsAgainst}</td>
                <td className="py-3 px-3 text-center text-foreground">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
                <td className="py-3 px-4 text-center"><span className="font-bold text-gold text-base">{s.points}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BracketView({ bracket, teams }: any) {
  const getTeam = (id: number) => teams.find((t: any) => t.id === id);
  const getWinner = (m: any) => {
    if (m.status !== "finished") return null;
    const hS = m.homeScore + (m.homePenalties ?? 0);
    const aS = m.awayScore + (m.awayPenalties ?? 0);
    return hS >= aS ? m.homeTeamId : m.awayTeamId;
  };

  const BracketMatch = ({ match, label }: any) => {
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const winnerId = getWinner(match);

    return (
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden w-56 shadow-premium mb-4">
        <div className="px-3 py-1.5 bg-secondary/60 border-b border-border/40 text-[10px] text-muted-foreground font-bold uppercase">{label}</div>
        {[ { team: home, score: match.homeScore, p: match.homePenalties, id: match.homeTeamId },
           { team: away, score: match.awayScore, p: match.awayPenalties, id: match.awayTeamId } ].map((side, idx) => (
          <div key={idx} className={`flex items-center justify-between px-3 py-2.5 ${idx === 0 ? "border-b border-border/30" : ""} ${winnerId === side.id ? "bg-amber-900/15" : ""}`}>
            <div className="flex items-center gap-2">
              {side.team ? <TeamBadge color={side.team.color} short={side.team.shortName} logo={side.team.logo} size="sm" /> : <div className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center text-[10px]">?</div>}
              <span className={`text-xs truncate max-w-[90px] ${winnerId === side.id ? "text-gold font-bold" : "text-foreground"}`}>{side.team?.name ?? "A definir"}</span>
            </div>
            <div className="flex items-center gap-1">
              {side.p !== null && <span className="text-[10px] text-gold font-bold mr-1">({side.p})</span>}
              <span className={`text-sm font-bold ${winnerId === side.id ? "text-gold" : "text-muted-foreground"}`}>{side.score ?? "-"}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-wrap items-start gap-8 py-6 overflow-x-auto">
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase text-center mb-4">Semifinais</h4>
        {bracket.semifinal.map((m: any, i: number) => <BracketMatch key={m.id} match={m} label={`Semi ${i+1}`} />)}
      </div>
      <div className="space-y-4 border-l border-border/40 pl-8">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase text-center mb-4">Finais</h4>
        {bracket.final.length > 0 && <BracketMatch match={bracket.final[0]} label="Final" />}
        {bracket.third_place.length > 0 && <BracketMatch match={bracket.third_place[0]} label="3º Lugar" />}
      </div>
    </div>
  );
}

export default function TournamentDetail() {
  const { id, portalSlug } = useParams<{ id: string; portalSlug?: string }>();
  const tournamentId = parseInt(id ?? "0");
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("groups");
  const [editingMatch, setEditingMatch] = useState<null | MatchForModal>(null);

  const { data: portal } = trpc.portal.getBySlug.useQuery({ slug: portalSlug ?? "" }, { enabled: !!portalSlug });
  const { data, refetch } = trpc.tournament.getById.useQuery({ id: tournamentId });
  const { data: standingsMap } = trpc.tournament.getStandings.useQuery({ tournamentId });
  const { data: bracket, refetch: refetchBracket } = trpc.tournament.getBracket.useQuery({ tournamentId });
  const utils = trpc.useUtils();

  useEffect(() => {
    if (portal) {
      document.documentElement.style.setProperty('--primary', portal.primaryColor);
      document.documentElement.style.setProperty('--gold', portal.secondaryColor);
    }
  }, [portal]);

  const updateScore = trpc.match.updateScore.useMutation({
    onSuccess: () => { refetch(); refetchBracket(); utils.tournament.getStandings.invalidate({ tournamentId }); setEditingMatch(null); toast.success("Placar atualizado!"); },
  });

  const updateDetails = trpc.match.updateDetails.useMutation({ onSuccess: () => { refetch(); refetchBracket(); } });
  const resetScore = trpc.match.resetScore.useMutation({
    onSuccess: () => { refetch(); refetchBracket(); utils.tournament.getStandings.invalidate({ tournamentId }); setEditingMatch(null); toast.success("Resultado excluído."); },
  });
  
  const generateGroups = trpc.tournament.generateGroupMatches.useMutation({ onSuccess: () => { refetch(); toast.success("Goleadas virtuais prontas!"); } });
  const generateSemis = trpc.tournament.generateSemifinals.useMutation({ onSuccess: () => { refetch(); refetchBracket(); setActiveTab("bracket"); toast.success("Semifinais definidas!"); } });
  const generateFinal = trpc.tournament.generateFinal.useMutation({ onSuccess: () => { refetch(); refetchBracket(); setActiveTab("bracket"); toast.success("Finais geradas!"); } });
  const deleteTournament = trpc.tournament.delete.useMutation({ onSuccess: () => { toast.success("Torneio excluído."); navigate(portalSlug ? `/${portalSlug}/admin` : "/admin"); } });

  if (!data) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" /></div>;

  const { tournament, teams, matches } = data;
  const isAdmin = isAuthenticated;
  const sportCfg = SPORT_CONFIG[tournament.sport as Sport] ?? SPORT_CONFIG.football;

  const exportStandingsPDF = () => {
    if (!standingsMap) return;
    const doc = new jsPDF();
    doc.text(`Classificação - ${tournament.name}`, 14, 15);
    let y = 25;
    Object.entries(standingsMap).forEach(([gn, gs]: any) => {
      doc.text(`Grupo ${gn}`, 14, y);
      autoTable(doc, { startY: y + 5, head: [['#', 'Equipe', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Pts']], body: gs.map((s: any, i: number) => [i + 1, s.teamName, s.played, s.won, s.drawn, s.lost, s.goalsFor, s.goalsAgainst, s.goalDiff, s.points]) });
      y = (doc as any).lastAutoTable.finalY + 15;
    });
    doc.save(`classificacao_${tournament.name}.pdf`);
  };

  const exportMatchesPDF = () => {
    const doc = new jsPDF();
    doc.text(`Tabela - ${tournament.name}`, 14, 15);
    autoTable(doc, { startY: 25, head: [['Fase', 'Data', 'Local', 'Jogo', 'Placar']], body: matches.map((m: any) => [m.phase, m.matchDate || '-', m.location || '-', `${teams.find((t: any)=>t.id===m.homeTeamId)?.shortName} vs ${teams.find((t: any)=>t.id===m.awayTeamId)?.shortName}`, m.status==='finished'?`${m.homeScore}-${m.awayScore}`:'-']) });
    doc.save(`jogos_${tournament.name}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(portalSlug ? `/${portalSlug}` : "/")}><ArrowLeft className="w-4 h-4 mr-1.5" /> Página Inicial</Button>
            <div className="w-px h-5 bg-border/60" />
            {portal?.logo ? <img src={portal.logo} className="h-8 object-contain" /> : <Shield className="w-6 h-6 text-gold" />}
            <span className="font-bold text-sm hidden sm:block">{portal?.name || "TournamentPro"}</span>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-gold border-gold/30" onClick={() => navigate(portalSlug ? `/${portalSlug}/admin` : "/admin")}>Painel Admin</Button>
              <Button size="sm" variant="destructive" onClick={() => window.confirm("Excluir torneio?") && deleteTournament.mutate({ id: tournamentId })}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          )}
        </div>
      </header>

      <main className="container pt-10">
        <div className="bg-card border border-border/50 rounded-3xl p-8 mb-8 relative overflow-hidden shadow-premium">
          <div className="absolute top-0 right-0 p-10 opacity-5"><Trophy className="w-40 h-40 text-gold" /></div>
          <div className="relative">
            <div className="flex gap-2 mb-4">
              <span className="px-3 py-1 bg-gold/10 border border-gold/20 text-gold text-[10px] font-bold uppercase rounded-full">{sportCfg.emoji} {sportCfg.label}</span>
              <span className="px-3 py-1 bg-secondary text-muted-foreground text-[10px] font-bold uppercase rounded-full">{tournament.category}</span>
            </div>
            <h1 className="font-display text-4xl font-bold mb-4">{tournament.name}</h1>
            <div className="flex gap-6 text-sm text-muted-foreground">
               <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {teams.length} Equipes</span>
               <span className="flex items-center gap-1.5"><Swords className="w-4 h-4" /> {matches.length} Jogos</span>
               {tournament.champion && <span className="flex items-center gap-1.5 text-gold font-bold"><Star className="w-4 h-4 fill-gold" /> Campeão: {tournament.champion}</span>}
            </div>
          </div>
        </div>

        {isAdmin && (
           <div className="flex flex-wrap gap-2 mb-8 bg-secondary/10 p-4 rounded-2xl border border-border/40">
              {matches.length === 0 && <Button size="sm" className="gradient-gold text-amber-950 font-bold" onClick={() => generateGroups.mutate({ tournamentId })}>Gerar Tabela de Grupos</Button>}
              {tournament.status === 'group_stage' && <Button size="sm" className="gradient-gold text-amber-950 font-bold" onClick={() => generateSemis.mutate({ tournamentId })}>Gerar Semifinais</Button>}
              {tournament.status === 'semifinals' && <Button size="sm" className="gradient-gold text-amber-950 font-bold" onClick={() => generateFinal.mutate({ tournamentId })}>Gerar Finais</Button>}
           </div>
        )}

        <div className="flex gap-1 p-1 bg-secondary/30 rounded-2xl mb-8 w-fit">
          {["groups", "standings", "bracket"].map((t: any) => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === t ? "bg-card text-gold shadow-premium border border-border/50" : "text-muted-foreground hover:text-foreground"}`}>
              {t === 'groups' ? 'Tabela' : t === 'standings' ? 'Classificação' : 'Mata-Mata'}
            </button>
          ))}
        </div>

        {activeTab === "groups" && (
           <div className="space-y-10">
              {Array.from(new Set(matches.filter((m:any) => m.phase === 'group').map((m:any) => m.round))).sort((a:any, b:any) => a - b).map((round:any) => (
                <div key={round}>
                  <h3 className="text-xl font-display font-bold text-foreground border-l-4 border-gold pl-4 mb-4">Rodada {round}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {matches.filter((m:any) => m.phase === 'group' && m.round === round).map((m:any) => <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAdmin} onEdit={setEditingMatch} />)}
                  </div>
                </div>
              ))}
              {matches.filter((m:any) => m.phase === 'group').length === 0 && <div className="text-center py-20 border border-dashed border-border/40 rounded-3xl text-muted-foreground">Clique em Gerar Tabela para começar.</div>}
              <div className="flex justify-end gap-2 mt-8">
                 <Button size="sm" variant="ghost" onClick={exportMatchesPDF} className="text-xs text-muted-foreground"><Download className="w-3.5 h-3.5 mr-1" /> PDF</Button>
              </div>
           </div>
        )}

        {activeTab === "standings" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-display font-bold">Resumo da Competição</h2>
              <Button size="sm" variant="ghost" onClick={exportStandingsPDF} className="text-xs text-muted-foreground"><Download className="w-3.5 h-3.5 mr-1" /> PDF</Button>
            </div>
            {standingsMap && Object.entries(standingsMap).map(([g, s]) => <StandingsTable key={g} title={g} standings={s} sport={tournament.sport} />)}
          </div>
        )}

        {activeTab === "bracket" && (
          <div className="bg-card/50 border border-border/50 rounded-3xl p-8 shadow-premium overflow-hidden">
             <h2 className="text-2xl font-display font-bold mb-8">Fase Final</h2>
             {bracket ? <BracketView bracket={bracket} teams={teams} /> : <div className="text-center py-20 text-muted-foreground">Aguardando definição dos grupos.</div>}
             <div className="mt-8 space-y-4">
                {matches.filter((m:any) => m.phase !== 'group').map((m:any) => <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAdmin} onEdit={setEditingMatch} />)}
             </div>
          </div>
        )}
      </main>

      {editingMatch && <ScoreModal match={editingMatch} teams={teams} sport={tournament.sport as Sport} onClose={() => setEditingMatch(null)} 
           onSave={(mid, h, a, hp, ap, d, t, l) => { updateScore.mutate({ matchId: mid, homeScore: h, awayScore: a, homePenalties: hp, awayPenalties: ap }); updateDetails.mutate({ matchId: mid, matchDate: d, matchTime: t, location: l }); }}
           onReset={(mid) => resetScore.mutate({ matchId: mid })} />}
    </div>
  );
}
