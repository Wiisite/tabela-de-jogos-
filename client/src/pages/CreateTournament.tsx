import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Trophy, ArrowLeft, Plus, Trash2, Shield, Shuffle, ImagePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TEAM_COLORS = [
  "#1e3a8a", "#166534", "#7c3aed", "#b91c1c", "#d97706", "#0e7490",
  "#be185d", "#065f46", "#1d4ed8", "#9a3412",
];

const DEFAULT_TEAMS = [
  { name: "Colégio Beryon", shortName: "BRY", color: "#1e3a8a" },
  { name: "Colégio Educar", shortName: "EDU", color: "#166534" },
  { name: "Colégio Santa Rita", shortName: "CSR", color: "#7c3aed" },
  { name: "Colégio Marconi", shortName: "MCN", color: "#b91c1c" },
  { name: "Colégio Parthenon", shortName: "PTH", color: "#d97706" },
  { name: "Colégio Canada", shortName: "CDA", color: "#0e7490" },
];

type Sport = "football" | "basketball" | "volleyball" | "handball" | "futsal";

const SPORT_CONFIG: Record<Sport, {
  label: string; emoji: string;
  defaultPoints: { win: number; draw: number; loss: number };
  scoreLabel: string; hasPenalties: boolean;
}> = {
  football:   { label: "Futebol",   emoji: "⚽", defaultPoints: { win: 3, draw: 1, loss: 0 }, scoreLabel: "Gols",   hasPenalties: true },
  basketball: { label: "Basquete",  emoji: "🏀", defaultPoints: { win: 2, draw: 0, loss: 0 }, scoreLabel: "Pontos", hasPenalties: false },
  volleyball: { label: "Vôlei",     emoji: "🏐", defaultPoints: { win: 3, draw: 0, loss: 0 }, scoreLabel: "Sets",   hasPenalties: false },
  handball:   { label: "Handebol",  emoji: "🤾", defaultPoints: { win: 2, draw: 1, loss: 0 }, scoreLabel: "Gols",   hasPenalties: true },
  futsal:     { label: "Futsal",    emoji: "👟", defaultPoints: { win: 3, draw: 1, loss: 0 }, scoreLabel: "Gols",   hasPenalties: true },
};

type TeamInput = { name: string; shortName: string; color: string; logo?: string | null; };

export default function CreateTournament() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { portalSlug } = useParams<{ portalSlug?: string }>();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sport, setSport] = useState<Sport>("football");
  const [groupCount, setGroupCount] = useState<number>(1);
  const [winPoints, setWinPoints] = useState<number>(3);
  const [drawPoints, setDrawPoints] = useState<number>(1);
  const [lossPoints, setLossPoints] = useState<number>(0);
  const [isDoubleRound, setIsDoubleRound] = useState<boolean>(false);

  // Portal Context
  const { data: portal } = trpc.portal.getBySlug.useQuery(
    { slug: portalSlug ?? "" },
    { enabled: !!portalSlug }
  );

  const handleSportChange = (s: Sport) => {
    setSport(s);
    const cfg = SPORT_CONFIG[s].defaultPoints;
    setWinPoints(cfg.win);
    setDrawPoints(cfg.draw);
    setLossPoints(cfg.loss);
  };
  const [teams, setTeams] = useState<(TeamInput & { groupName: string })[]>(
    DEFAULT_TEAMS.map((t) => ({ ...t, groupName: "A" }))
  );

  const createMutation = trpc.tournament.create.useMutation({
    onSuccess: (t) => {
      toast.success("Torneio criado com sucesso!");
      navigate(`/${portalSlug}/tournament/${t.id}`);
    },
    onError: (e) => {
      const msg = e.message || "Erro ao criar torneio";
      toast.error(msg.length > 200 ? msg.substring(0, 200) + "..." : msg);
    },
  });

  const addTeam = () => {
    const color = TEAM_COLORS[teams.length % TEAM_COLORS.length];
    setTeams([...teams, { name: "", shortName: "", color: color, groupName: "A", logo: null }]);
  };

  const removeTeam = (i: number) => {
    setTeams(teams.filter((_, idx) => idx !== i));
  };

  const updateTeam = (i: number, field: keyof (TeamInput & { groupName: string }), value: string) => {
    setTeams(teams.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe o nome do torneio");
    if (!category.trim()) return toast.error("Informe a categoria");
    if (teams.length < 2) return toast.error("Adicione pelo menos 2 equipes");
    const invalid = teams.find((t) => !t.name.trim() || !t.shortName.trim());
    if (invalid) return toast.error("Preencha nome e sigla de todas as equipes");
    
    // Check if each group has at least 2 teams
    if (groupCount > 1) {
      const gNames = ["A", "B", "C", "D"].slice(0, groupCount);
      for (const g of gNames) {
        const count = teams.filter(t => t.groupName === g).length;
        if (count < 2 && count > 0) return toast.error(`O Grupo ${g} precisa de pelo menos 2 equipes`);
      }
    }

    createMutation.mutate({
      portalId: portal?.id || 1,
      name,
      category,
      sport,
      groupCount,
      winPoints,
      drawPoints,
      lossPoints,
      isDoubleRound,
      teams
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-6 shadow-gold">
            <Shield className="w-8 h-8 text-amber-950" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Faça login para criar novos torneios.
          </p>
          <Button
            className="w-full gradient-gold text-amber-950 font-semibold hover:opacity-90 shadow-gold"
            onClick={() => navigate(portalSlug ? `/${portalSlug}/login-admin` : "/login-admin")}
          >
            Fazer Login
          </Button>
          <Button
            variant="ghost"
            className="w-full mt-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(portalSlug ? `/${portalSlug}` : "/")}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate(portalSlug ? `/${portalSlug}/admin` : "/admin")}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Painel Admin
            </Button>
            <div className="w-px h-5 bg-border/60" />
            <span className="font-medium text-sm text-foreground uppercase tracking-wider">{portal?.name || "Novo Torneio"}</span>
          </div>
        </div>
      </header>

      <main className="container py-10 max-w-3xl">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Novo Torneio
          </h1>
          <p className="text-muted-foreground">
            Configure as informações do torneio e cadastre as equipes participantes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium">
            <h2 className="font-display font-semibold text-foreground mb-5 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" />
              Informações do Torneio
            </h2>
            {/* Sport selector */}
            <div className="mb-8">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Modalidade Esportiva</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(Object.entries(SPORT_CONFIG) as [Sport, typeof SPORT_CONFIG[Sport]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSportChange(key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      sport === key
                        ? "border-gold/60 bg-amber-900/10 text-gold shadow-gold ring-1 ring-gold/40"
                        : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <span className="text-2xl">{cfg.emoji}</span>
                    <span className="text-[10px] uppercase font-bold tracking-tighter">{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                    Nome do Torneio
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Sub-9 MASC"
                    className="w-full px-4 py-3 bg-secondary/20 border border-border/60 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                    Categoria / Descrição
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Sub-9 Masculino"
                    className="w-full px-4 py-3 bg-secondary/20 border border-border/60 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Advanced Config */}
              <div className="sm:col-span-2 pt-6 border-t border-border/30 mt-2">
                <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Regras e Formato</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                   <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-tight">
                          Sistema de Grupos
                        </label>
                        <select
                          value={groupCount}
                          onChange={(e) => setGroupCount(parseInt(e.target.value))}
                          className="w-full px-3 py-3 bg-secondary/30 border border-border/60 rounded-xl text-foreground focus:outline-none text-sm font-medium"
                        >
                          <option value={1}>Grupo Único</option>
                          <option value={2}>2 Grupos (A e B)</option>
                          <option value={3}>3 Grupos (A, B e C)</option>
                          <option value={4}>4 Grupos (A, B, C e D)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-3 bg-secondary/10 p-3 rounded-xl border border-border/30">
                        <label className="flex items-center gap-3 cursor-pointer group flex-1">
                          <div className={`w-10 h-6 rounded-full transition-all relative ${isDoubleRound ? 'bg-gold shadow-gold/50' : 'bg-zinc-700'}`}>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isDoubleRound}
                              onChange={(e) => setIsDoubleRound(e.target.checked)}
                            />
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isDoubleRound ? 'translate-x-4' : ''}`} />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-xs font-bold text-foreground">Turno e Returno</span>
                             <span className="text-[10px] text-muted-foreground">Duas partidas por equipe</span>
                          </div>
                        </label>
                      </div>
                   </div>

                   <div className="bg-secondary/20 p-5 rounded-2xl space-y-4 border border-border/40">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Atribuição de Pontos</h4>
                      <div className="grid grid-cols-3 gap-3">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-center block uppercase">Vat.</label>
                            <input type="number" value={winPoints} onChange={e => setWinPoints(parseInt(e.target.value) || 0)} className="w-full text-center bg-background border border-border/50 rounded-lg py-1.5 text-xs" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-center block uppercase">Emp.</label>
                            <input type="number" value={drawPoints} onChange={e => setDrawPoints(parseInt(e.target.value) || 0)} className="w-full text-center bg-background border border-border/50 rounded-lg py-1.5 text-xs" disabled={sport === "basketball" || sport === "volleyball"} />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-center block uppercase">Der.</label>
                            <input type="number" value={lossPoints} onChange={e => setLossPoints(parseInt(e.target.value) || 0)} className="w-full text-center bg-background border border-border/50 rounded-lg py-1.5 text-xs" />
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teams */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                Equipes Participantes ({teams.length})
              </h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-border/60 hover:border-gold/50 hover:text-gold text-[10px] font-bold uppercase transition-all"
                onClick={addTeam}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar Equipe
              </Button>
            </div>
            <div className="space-y-3">
              {teams.map((team, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl border border-border/30 hover:border-gold/20 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground w-5 text-center">
                      #{i + 1}
                    </span>
                    <label 
                      className="cursor-pointer flex items-center justify-center shrink-0 w-10 h-10 rounded-xl border border-border/60 hover:border-gold relative overflow-hidden group bg-background/50"
                      title="Upload Logo da Equipe"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              return toast.error("A imagem deve ser menor que 2MB");
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              updateTeam(i, "logo", reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {team.logo ? (
                        <div 
                          className="w-full h-full bg-contain bg-center bg-no-repeat"
                          style={{ backgroundImage: `url(${team.logo})` }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                           <ImageIcon className="w-4 h-4 text-muted-foreground/40 group-hover:text-gold" />
                           <div className="w-full h-1 bg-current opacity-20 absolute bottom-0" style={{ color: team.color }} />
                        </div>
                      )}
                    </label>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                       <input
                        type="text"
                        value={team.name}
                        onChange={(e) => updateTeam(i, "name", e.target.value)}
                        placeholder="Nome da Escola / Equipe"
                        className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-gold/30 text-xs font-medium"
                      />
                    </div>
                    <div className="flex gap-2">
                       <input
                        type="text"
                        value={team.shortName}
                        onChange={(e) =>
                          updateTeam(i, "shortName", e.target.value.toUpperCase().slice(0, 10))
                        }
                        placeholder="SIGLA"
                        className="w-full px-2 py-2 bg-background border border-border/50 rounded-lg text-foreground text-xs text-center font-bold"
                      />
                      {groupCount > 1 && (
                        <select
                          value={team.groupName}
                          onChange={(e) => updateTeam(i, "groupName", e.target.value)}
                          className="w-16 px-1 py-2 bg-background border border-border/50 rounded-lg text-foreground text-[10px] font-bold focus:outline-none text-center"
                        >
                          {["A", "B", "C", "D"].slice(0, groupCount).map(g => (
                            <option key={g} value={g}>Gr. {g}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                       <input
                        type="color"
                        value={team.color}
                        onChange={(e) => updateTeam(i, "color", e.target.value)}
                        className="w-8 h-8 rounded-lg border border-border/60 cursor-pointer bg-transparent"
                        title="Cor da Identidade"
                      />
                       <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8 p-0 transition-colors"
                        onClick={() => removeTeam(i)}
                        disabled={teams.length <= 2}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-16 rounded-2xl border-border/60 font-bold transition-all hover:bg-secondary/40"
              onClick={() => navigate(portalSlug ? `/${portalSlug}/admin` : "/admin")}
            >
              Descartar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-16 rounded-2xl gradient-gold text-amber-950 font-bold shadow-gold hover:opacity-90 transition-all text-lg"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <div className="w-5 h-5 rounded-full border-4 border-amber-950 border-t-transparent animate-spin mr-2" />
              ) : (
                <Trophy className="w-5 h-5 mr-3" />
              )}
              Lançar Competição
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
