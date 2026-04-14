import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "../components/ui/button";
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Swords, 
  Calendar, 
  BarChart3, 
  Settings, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  ChevronDown,
  Download,
  FileText,
  Star,
  Shield,
  X,
  Plus,
  GitBranch,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Sport = "football" | "basketball" | "volleyball" | "futsal";
type Tab = "groups" | "standings" | "bracket" | "teams";

const SPORT_CONFIG: Record<Sport, any> = {
  football:   { label: "Futebol",  emoji: "⚽", scoreLabel: "Gols",   proLabel: "GP", contraLabel: "GC", saldoLabel: "SG", hasPenalties: true },
  basketball: { label: "Basquete", emoji: "🏀", scoreLabel: "Pontos", proLabel: "PP", contraLabel: "PC", saldoLabel: "SP", hasPenalties: false },
  volleyball: { label: "Vôlei",    emoji: "🏐", scoreLabel: "Sets",   proLabel: "SP", contraLabel: "SC", saldoLabel: "SS", hasPenalties: false },
  futsal:     { label: "Futsal",   emoji: "👟", scoreLabel: "Gols",   proLabel: "GP", contraLabel: "GC", saldoLabel: "SG", hasPenalties: true },
};

const PHASE_LABEL_MAP: Record<string, string> = {
  group: "Fase de Grupos",
  semifinal: "Semifinal",
  final: "Grande Final",
  third_place: "Disputa de 3º Lugar",
};

export default function TournamentDetail() {
  const { id, portalSlug } = useParams<{ id: string; portalSlug?: string }>();
  const tournamentId = parseInt(id ?? "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = !!user;
  
  const [activeTab, setActiveTab] = useState<Tab>("groups");
  const [editingMatch, setEditingMatch] = useState<null | any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: portal } = trpc.portal.getBySlug.useQuery({ slug: portalSlug ?? "" }, { enabled: !!portalSlug });
  const { data, refetch } = trpc.tournament.getById.useQuery({ id: tournamentId });
  const { data: standingsMap } = trpc.tournament.getStandings.useQuery({ tournamentId });
  const { data: bracket, refetch: refetchBracket } = trpc.tournament.getBracket.useQuery({ tournamentId });
  const utils = trpc.useUtils();

  const tournament = data?.tournament;
  const teams = data?.teams || [];
  const matches = data?.matches || [];

  const sliderImgs: string[] = tournament?.heroSlider ? JSON.parse(tournament.heroSlider) : [];

  useEffect(() => {
    if (tournament || portal) {
      const primary = tournament?.primaryColor || portal?.primaryColor || "#1e3a8a";
      const secondary = tournament?.secondaryColor || portal?.secondaryColor || "#f59e0b";
      const font = tournament?.fontFamily || portal?.fontFamily || "Inter";

      document.documentElement.style.setProperty('--primary', primary);
      document.documentElement.style.setProperty('--gold', secondary);
      document.documentElement.style.fontFamily = font;
    }
  }, [portal, tournament]);

  useEffect(() => {
    if (sliderImgs.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % sliderImgs.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [sliderImgs.length]);

  const updateScore = trpc.match.updateScore.useMutation({
    onSuccess: () => { 
      refetch(); 
      refetchBracket(); 
      utils.tournament.getStandings.invalidate({ tournamentId }); 
      setEditingMatch(null); 
      toast.success("Placar atualizado!"); 
    },
  });

  const resetScore = trpc.match.resetScore.useMutation({
    onSuccess: () => { 
      refetch(); 
      refetchBracket(); 
      utils.tournament.getStandings.invalidate({ tournamentId }); 
      setEditingMatch(null); 
      toast.success("Resultado excluído."); 
    },
  });
  
  const generateGroups = trpc.tournament.generateGroupMatches.useMutation({ onSuccess: () => { refetch(); toast.success("Jogos gerados!"); } });
  const generateSemis = trpc.tournament.generateSemifinals.useMutation({ onSuccess: () => { refetch(); refetchBracket(); setActiveTab("bracket"); toast.success("Eliminatórias iniciadas!"); } });
  const generateFinal = trpc.tournament.generateFinal.useMutation({ onSuccess: () => { refetch(); refetchBracket(); setActiveTab("bracket"); toast.success("Final definida!"); } });
  const deleteTournament = trpc.tournament.delete.useMutation({ onSuccess: () => { toast.success("Torneio excluído."); navigate(portalSlug ? `/${portalSlug}/admin` : "/admin"); } });

  const downloadPDF = (base64: string, filename: string) => {
    const link = document.createElement("a");
    link.href = base64;
    link.download = filename;
    link.click();
  };

  if (!data || !tournament) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" /></div>;

  const isAdmin = isAuthenticated;
  const sportCfg = SPORT_CONFIG[tournament.sport as Sport] ?? SPORT_CONFIG.football;

  const titleColor = tournament.heroTitleColor || portal?.heroTitleColor || "#ffffff";
  const subtitleColor = tournament.heroSubtitleColor || portal?.heroSubtitleColor || "rgba(255,255,255,0.9)";

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

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 sticky top-0 z-50 bg-white/90 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(portalSlug ? `/${portalSlug}` : "/")} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"><ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar</Button>
            <div className="w-px h-5 bg-gray-200" />
            {portal?.logo ? <img src={portal.logo} className="h-8 object-contain" /> : <Shield className="w-6 h-6 text-primary" />}
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Button variant="ghost" className="text-sm font-bold text-gray-600 px-0 hover:bg-transparent" onClick={() => navigate(`/${portalSlug}#competicoes`)}>Competições</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-bold text-gray-600">Regulamentos <ChevronDown className="ml-1 w-3.5 h-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem className="py-3 font-bold" onClick={() => portal?.generalRegulation && downloadPDF(portal.generalRegulation, "Regulamento_Geral.pdf")} disabled={!portal?.generalRegulation}>
                   <FileText className="w-4 h-4 mr-2" /> Regulamento Geral
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="py-3 font-bold" onClick={() => tournament?.regulation && downloadPDF(tournament.regulation, "Regulamento_Torneio.pdf")} disabled={!tournament?.regulation}>
                   <Download className="w-3.5 h-3.5 mr-2" /> Regulamento desta Categoria
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={() => navigate(`/${portalSlug}/tournament/${tournamentId}/edit`)}><Settings className="w-3.5 h-3.5 mr-1.5" /> Editar</Button>
                <Button size="sm" variant="destructive" onClick={() => window.confirm("Excluir torneio?") && deleteTournament.mutate({ id: tournamentId })}><Trash2 className="w-3.5 h-3.5" /></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container pt-6 pb-20">
        {/* HERO SECTION WITH OPTIONAL SLIDER */}
        <div className="relative w-full h-[320px] sm:h-[480px] rounded-[2rem] overflow-hidden mb-10 shadow-2xl bg-zinc-900">
           {sliderImgs.length > 0 ? (
              sliderImgs.map((img, idx) => (
                <div key={idx} className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? "opacity-100" : "opacity-0"}`}>
                   <img src={img} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                </div>
              ))
           ) : (
              <div className="absolute inset-0 bg-primary/20">
                 {portal?.banner && <img src={portal.banner} className="w-full h-full object-cover opacity-40" />}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              </div>
           )}
           
           <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-12">
              <div className="flex gap-2 mb-4">
                 <span className="px-3 py-1 bg-gold/20 border border-gold/30 backdrop-blur-md text-gold text-[10px] font-bold uppercase rounded-full">{sportCfg.emoji} {sportCfg.label}</span>
                 <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold uppercase rounded-full">{tournament.category}</span>
              </div>
              <h1 className="font-display text-4xl sm:text-7xl font-bold mb-4 drop-shadow-2xl" style={{ color: titleColor }}>{tournament.name}</h1>
              <div className="flex flex-wrap gap-6 text-sm font-medium" style={{ color: subtitleColor }}>
                 <span className="flex items-center gap-2"><Users className="w-4 h-4 text-gold" /> {teams.length} Equipes</span>
                 <span className="flex items-center gap-2"><Swords className="w-4 h-4 text-gold" /> {matches.length} Partidas</span>
                 {tournament.champion && <span className="flex items-center gap-2 text-gold font-bold"><Trophy className="w-4 h-4 fill-gold" /> Campeão: {tournament.champion}</span>}
              </div>
           </div>

           {sliderImgs.length > 1 && (
              <div className="absolute bottom-6 right-10 flex gap-2">
                 {sliderImgs.map((_, idx) => (
                    <button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? "bg-gold w-8" : "bg-white/30"}`} />
                 ))}
              </div>
           )}
        </div>

        {tournament.description && (
          <section className="mb-10 p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
            <h2 className="font-display text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-gold" /> Sobre a Competição
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
              {tournament.description}
            </div>
          </section>
        )}

        {tournament.regulation && (
          <section className="mb-10 p-6 bg-gold/5 border border-gold/20 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold"><FileText /></div>
              <div>
                 <h3 className="font-bold text-gray-900">Regulamento Oficial</h3>
                 <p className="text-xs text-gray-500">Clique para baixar os detalhes desta categoria</p>
              </div>
            </div>
            <Button className="gradient-gold text-amber-950 font-bold" onClick={() => downloadPDF(tournament.regulation!, "Regulamento.pdf")}><Download className="w-4 h-4 mr-2" /> Baixar PDF</Button>
          </section>
        )}

        {isAdmin && (
           <div className="flex flex-wrap gap-2 mb-8 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
              {matches.length === 0 && <Button size="sm" onClick={() => generateGroups.mutate({ tournamentId })}>Gerar Tabela de Grupos</Button>}
              {tournament.status === 'group_stage' && <Button size="sm" onClick={() => generateSemis.mutate({ tournamentId })}>Gerar Semifinais</Button>}
              {tournament.status === 'semifinals' && <Button size="sm" onClick={() => generateFinal.mutate({ tournamentId })}>Gerar Finais</Button>}
           </div>
        )}

        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-8 w-fit shadow-inner">
          {["groups", "standings", "bracket"].map((t: any) => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
              {t === 'groups' ? 'Jogos' : t === 'standings' ? 'Classificação' : 'Fase Final'}
            </button>
          ))}
        </div>

        {activeTab === "groups" && (
          <div className="space-y-10">
            {matches.filter(m => m.phase === "group").length === 0 ? (
               <div className="p-20 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">Tabela em processamento...</div>
            ) : (
               Array.from(new Set(matches.filter(m => m.phase === "group").map(m => m.round))).sort((a,b) => a-b).map(round => (
                  <div key={round} className="space-y-4">
                     <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                        <div className="w-10 h-px bg-gray-100" />
                        {round}ª Rodada
                     </h3>
                     <div className="space-y-4">
                        {matches.filter(m => m.phase === "group" && m.round === round).map(m => (
                           <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAdmin} onEdit={setEditingMatch} />
                        ))}
                     </div>
                  </div>
               ))
            )}
          </div>
        )}

        {activeTab === "standings" && (
          <div>
            {!standingsMap || Object.keys(standingsMap).length === 0 ? (
              <div className="p-20 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">Inicie a competição para ver a tabela.</div>
            ) : (
              <>
                 <div className="flex justify-end mb-6">
                    <Button variant="outline" size="sm" onClick={exportStandingsPDF} className="gap-2"><Download className="w-4 h-4" /> Exportar PDF</Button>
                 </div>
                 {Object.entries(standingsMap).map(([gn, gs]) => (
                    <StandingsTable key={gn} standings={gs} title={Object.keys(standingsMap).length > 1 ? gn : null} sport={tournament.sport} />
                 ))}
              </>
            )}
          </div>
        )}

        {activeTab === "bracket" && (
           <div>
              {!bracket || (bracket.semifinal.length === 0 && bracket.final.length === 0) ? (
                 <div className="p-20 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">As eliminatórias serão liberadas ao fim da fase de grupos.</div>
              ) : (
                 <>
                    <BracketView bracket={bracket} teams={teams} isAdmin={isAdmin} onEdit={setEditingMatch} />
                    <div className="mt-12 space-y-8">
                       <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <Swords className="w-5 h-5 text-gold" /> Detalhes das Partidas
                       </h3>
                       {bracket.semifinal.map((m:any) => <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAdmin} onEdit={setEditingMatch} />)}
                       {bracket.final.map((m:any) => <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAdmin} onEdit={setEditingMatch} />)}
                       {bracket.third_place.map((m:any) => <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAdmin} onEdit={setEditingMatch} />)}
                    </div>
                 </>
              )}
           </div>
        )}
      </main>

      {editingMatch && (
        <ScoreModal 
          match={editingMatch} 
          teams={teams} 
          sport={tournament.sport as Sport}
          onClose={() => setEditingMatch(null)} 
          onSave={(matchId: number, h: number, a: number, hp: number | undefined, ap: number | undefined, date: string, time: string, loc: string) => updateScore.mutate({ matchId, homeScore: h, awayScore: a, homePenalties: hp, awayPenalties: ap, matchDate: date, matchTime: time, location: loc })}
          onReset={(matchId: number) => resetScore.mutate({ matchId })}
        />
      )}
    </div>
  );
}

// --- HELPERS (Fixes production initialization order) ---

function TeamBadge({ color, short, name, logo, size = "md" }: any) {
  const sizes: any = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-sm", lg: "w-14 h-14 text-lg" };
  return (
    <div className="flex items-center gap-3">
      <div className={`${sizes[size]} rounded-xl flex items-center justify-center font-bold text-white shrink-0 overflow-hidden border border-white/20`} style={{ background: color }}>
        {logo ? <img src={logo} className="w-full h-full object-contain" /> : short.slice(0, 3)}
      </div>
      {name && <span className="text-sm font-bold text-gray-900 truncate">{name}</span>}
    </div>
  );
}

function MatchCard({ match, teams, isAdmin, onEdit }: any) {
  const home = teams.find((t: any) => t.id === match.homeTeamId);
  const away = teams.find((t: any) => t.id === match.awayTeamId);
  const finished = match.status === "finished";

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
       <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3 justify-end text-right">
             <span className="font-bold text-sm hidden sm:block">{home?.name}</span>
             <TeamBadge color={home?.color} short={home?.shortName} logo={home?.logo} />
          </div>
          <div className="flex flex-col items-center gap-1">
             <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl">
                <span className="text-2xl font-black text-gray-900">{match.homeScore ?? "-"}</span>
                <span className="text-gray-300 font-bold">×</span>
                <span className="text-2xl font-black text-gray-900">{match.awayScore ?? "-"}</span>
             </div>
             {finished && match.homePenalties !== null && <span className="text-[10px] font-bold text-gold">({match.homePenalties}-{match.awayPenalties} pen)</span>}
          </div>
          <div className="flex-1 flex items-center gap-3">
             <TeamBadge color={away?.color} short={away?.shortName} logo={away?.logo} />
             <span className="font-bold text-sm hidden sm:block">{away?.name}</span>
          </div>
       </div>
       <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
             {finished ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3" />}
             {finished ? 'Encerrado' : 'A definir'} • {match.phase === 'group' ? `Rodada ${match.round}` : PHASE_LABEL_MAP[match.phase] || 'Eliminatória'}
          </span>
          {isAdmin && <Button size="sm" variant="ghost" onClick={() => onEdit(match)} className="h-7 text-[10px] font-bold uppercase">Editar</Button>}
       </div>
    </div>
  );
}

function StandingsTable({ standings, title, sport }: any) {
  const sc = SPORT_CONFIG[sport as Sport ?? "football"];
  return (
    <div className="mb-12">
      {title && <h3 className="text-lg font-bold text-gray-900 mb-4 px-4 border-l-4 border-gold">Grupo {title}</h3>}
      <div className="overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
              <th className="py-4 px-6 text-left w-12 text-gray-300">#</th>
              <th className="py-4 px-6 text-left">Equipe</th>
              <th className="py-4 px-4 text-center">J</th>
              <th className="py-4 px-4 text-center text-green-600">V</th>
              <th className="py-4 px-4 text-center">E</th>
              <th className="py-4 px-4 text-center text-red-600">D</th>
              <th className="py-4 px-4 text-center">{sc.proLabel}</th>
              <th className="py-4 px-4 text-center">{sc.contraLabel}</th>
              <th className="py-4 px-4 text-center">S</th>
              <th className="py-4 px-6 text-center text-primary">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {standings.map((s: any, i: number) => (
              <tr key={s.teamId} className={`transition-colors hover:bg-zinc-50 ${i < 2 ? "bg-amber-50/10" : ""}`}>
                <td className="py-4 px-6"><span className={`text-[10px] font-black px-2 py-1 rounded ${i < 2 ? "bg-gold/10 text-gold" : "text-gray-300"}`}>{i + 1}</span></td>
                <td className="py-4 px-6"><TeamBadge color={s.color} short={s.shortName} name={s.teamName} logo={s.logo} size="sm" /></td>
                <td className="py-4 px-4 text-center font-bold text-gray-600">{s.played}</td>
                <td className="py-4 px-4 text-center font-bold text-green-600">{s.won}</td>
                <td className="py-4 px-4 text-center font-bold text-gray-500">{s.drawn}</td>
                <td className="py-4 px-4 text-center font-bold text-red-600">{s.lost}</td>
                <td className="py-4 px-4 text-center text-gray-500">{s.goalsFor}</td>
                <td className="py-4 px-4 text-center text-gray-500">{s.goalsAgainst}</td>
                <td className="py-4 px-4 text-center font-medium text-gray-900">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
                <td className="py-4 px-6 text-center"><span className="text-lg font-black text-primary">{s.points}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BracketView({ bracket, teams, isAdmin, onEdit }: any) {
  const BracketMatch = ({ match, label }: any) => {
    const home = teams.find((t:any) => t.id === match.homeTeamId);
    const away = teams.find((t:any) => t.id === match.awayTeamId);
    const winId = match.status === 'finished' ? (match.homeScore + (match.homePenalties||0) >= match.awayScore + (match.awayPenalties||0) ? match.homeTeamId : match.awayTeamId) : null;

    return (
      <div className="bg-white border border-gray-100 rounded-[1.5rem] overflow-hidden w-64 shadow-premium mb-6 group relative">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase flex items-center justify-between">
           {label}
           {isAdmin && (
              <button 
                onClick={() => onEdit(match)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gold hover:text-amber-600 font-bold"
              >
                EDITAR
              </button>
           )}
        </div>
        {[ { t: home, s: match.homeScore, p: match.homePenalties, id: match.homeTeamId },
           { t: away, s: match.awayScore, p: match.awayPenalties, id: match.awayTeamId } ].map((side, i) => (
          <div key={i} className={`flex items-center justify-between px-4 py-4 ${i === 0 ? "border-b border-gray-50" : ""} ${winId === side.id ? "bg-gold/5" : ""}`}>
            <div className="flex items-center gap-3">
              <TeamBadge color={side.t?.color || '#eee'} short={side.t?.shortName || '?'} logo={side.t?.logo} size="sm" />
              <span className={`text-xs font-bold truncate max-w-[100px] ${winId === side.id ? "text-primary" : "text-gray-500"}`}>{side.t?.name || 'A definir'}</span>
            </div>
            <div className="flex items-center gap-1">
               {side.p !== null && <span className="text-[10px] font-bold text-gold mr-1">({side.p})</span>}
               <span className="text-sm font-black text-gray-900">{side.s ?? "-"}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-wrap gap-12 py-10">
       <div className="flex flex-col">
          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-6 text-center">Semifinais</h4>
          <div className="flex flex-col gap-8">
             {bracket.semifinal.map((m: any, i:number) => <BracketMatch key={m.id} match={m} label={`Semifinal ${i+1}`} />)}
          </div>
       </div>
       <div className="flex flex-col pt-12 items-center">
          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-6 text-center">A Grande Final</h4>
          {bracket.final[0] && <BracketMatch match={bracket.final[0]} label="Final" />}
       </div>
       <div className="flex flex-col pt-12 ml-auto">
          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-6 text-center">Disputa de 3º</h4>
          {bracket.third_place[0] && <BracketMatch match={bracket.third_place[0]} label="3º Lugar" />}
       </div>
    </div>
  );
}

function ScoreModal({ match, teams, sport, onClose, onSave, onReset }: any) {
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [hp, setHp] = useState(match.homePenalties ?? 0);
  const [ap, setAp] = useState(match.awayPenalties ?? 0);
  const [date, setDate] = useState(match.matchDate ?? "");
  const [time, setTime] = useState(match.matchTime ?? "");
  const [loc, setLoc] = useState(match.location ?? "");

  const homeTeam = teams.find((t:any) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t:any) => t.id === match.awayTeamId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
       <div className="relative bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
          <div className="p-8">
             <div className="flex items-center gap-6 justify-center mb-8">
                <div className="text-center flex flex-col items-center">
                   <TeamBadge color={homeTeam?.color} short={homeTeam?.shortName} logo={homeTeam?.logo} size="lg" />
                   <p className="mt-2 text-xs font-bold text-gray-400">{homeTeam?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                   <input type="number" value={home} onChange={e => setHome(parseInt(e.target.value)||0)} className="w-16 h-16 text-center text-3xl font-black bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gold" />
                   <span className="text-gray-200 font-bold">VS</span>
                   <input type="number" value={away} onChange={e => setAway(parseInt(e.target.value)||0)} className="w-16 h-16 text-center text-3xl font-black bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gold" />
                </div>
                <div className="text-center flex flex-col items-center">
                   <TeamBadge color={awayTeam?.color} short={awayTeam?.shortName} logo={awayTeam?.logo} size="lg" />
                   <p className="mt-2 text-xs font-bold text-gray-400">{awayTeam?.name}</p>
                </div>
             </div>
             
             {match.phase !== 'group' && home === away && (
                <div className="mb-6 p-4 bg-gold/10 rounded-2xl border border-gold/20">
                   <p className="text-[10px] font-black text-center text-gold uppercase mb-3 text-center">Pênaltis</p>
                   <div className="flex justify-center gap-4">
                      <input type="number" value={hp} onChange={e => setHp(parseInt(e.target.value)||0)} className="w-12 h-10 text-center font-bold bg-white rounded-xl" />
                      <input type="number" value={ap} onChange={e => setAp(parseInt(e.target.value)||0)} className="w-12 h-10 text-center font-bold bg-white rounded-xl" />
                   </div>
                </div>
             )}

             <div className="space-y-3 mb-8">
                <div className="grid grid-cols-2 gap-3">
                   <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs" />
                   <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs" />
                </div>
                <input type="text" placeholder="Local da partida" value={loc} onChange={e => setLoc(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs" />
             </div>

             <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-2xl" onClick={onClose}>Cancelar</Button>
                <Button className="flex-1 h-12 rounded-2xl gradient-gold text-amber-950 font-bold" onClick={() => onSave(match.id, home, away, hp, ap, date, time, loc)}>Salvar Resultado</Button>
             </div>
             {onReset && match.homeScore !== null && (
                <Button variant="ghost" className="w-full mt-4 text-red-500 text-[10px] font-bold uppercase" onClick={() => onReset(match.id)}>Limpar Resultado</Button>
             )}
          </div>
       </div>
    </div>
  );
}
