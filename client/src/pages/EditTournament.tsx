import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Trophy, ArrowLeft, Plus, Trash2, Shield, ImageIcon, Users, RefreshCcw, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const TEAM_COLORS = [
  "#1e3a8a", "#166534", "#7c3aed", "#b91c1c", "#d97706", "#0e7490",
  "#be185d", "#065f46", "#1d4ed8", "#9a3412",
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

type TeamInput = { id?: number; name: string; shortName: string; color: string; logo?: string | null; groupName: string; };

export default function EditTournament() {
  const { id: tournamentIdStr, portalSlug } = useParams<{ id: string; portalSlug?: string }>();
  const tournamentId = parseInt(tournamentIdStr ?? "0");
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sport, setSport] = useState<Sport>("football");
  const [groupCount, setGroupCount] = useState<number>(1);
  const [winPoints, setWinPoints] = useState<number>(3);
  const [drawPoints, setDrawPoints] = useState<number>(1);
  const [lossPoints, setLossPoints] = useState<number>(0);
  const [isDoubleRound, setIsDoubleRound] = useState<boolean>(false);
  const [teams, setTeams] = useState<TeamInput[]>([]);
  const [regenerateMatches, setRegenerateMatches] = useState(false);
  const [slider, setSlider] = useState<string[]>([]);
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [heroSlider, setHeroSlider] = useState<string[]>([]);
  const [heroTitleColor, setHeroTitleColor] = useState("");
  const [heroSubtitleColor, setHeroSubtitleColor] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [description, setDescription] = useState("");
  const [regulation, setRegulation] = useState<string | null | undefined>(null);

  const { data: source, isLoading: dataLoading } = trpc.tournament.getById.useQuery({ id: tournamentId });
  const { data: portal } = trpc.portal.getBySlug.useQuery({ slug: portalSlug ?? "" }, { enabled: !!portalSlug });

  useEffect(() => {
    if (source) {
      const t = source.tournament;
      setName(t.name);
      setCategory(t.category);
      setSport(t.sport as Sport);
      setGroupCount(t.groupCount);
      setWinPoints(t.winPoints);
      setDrawPoints(t.drawPoints);
      setLossPoints(t.lossPoints);
      setIsDoubleRound(t.isDoubleRound === 1);
      setSlider(t.slider ? JSON.parse(t.slider) : []);
      setSponsors(t.sponsors ? JSON.parse(t.sponsors) : []);
      setPrimaryColor(t.primaryColor || portal?.primaryColor || "#1e3a8a");
      setSecondaryColor(t.secondaryColor || portal?.secondaryColor || "#f59e0b");
      setFontFamily(t.fontFamily || portal?.fontFamily || "Inter");
      setDescription(t.description || "");
      setRegulation(t.regulation);
      setHeroTitleColor(t.heroTitleColor || "");
      setHeroSubtitleColor(t.heroSubtitleColor || "");
      setHeroSlider(t.heroSlider ? JSON.parse(t.heroSlider) : []);
      setTeams(source.teams.map(team => ({
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        color: team.color,
        logo: team.logo,
        groupName: team.groupName
      })));
    }
  }, [source, portal]);

  const updateMutation = trpc.tournament.update.useMutation({
    onSuccess: () => {
      if (regenerateMatches) {
        generateMatchesMutation.mutate({ tournamentId, clearExisting: true });
      } else {
        toast.success("Torneio atualizado!");
        navigate(`/${portalSlug}/tournament/${tournamentId}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const generateMatchesMutation = trpc.tournament.generateGroupMatches.useMutation({
    onSuccess: () => {
      toast.success("Torneio atualizado e confrontos regerados!");
      navigate(`/${portalSlug}/tournament/${tournamentId}`);
    }
  });

  const handleSportChange = (s: Sport) => {
    setSport(s);
    const cfg = SPORT_CONFIG[s].defaultPoints;
    setWinPoints(cfg.win);
    setDrawPoints(cfg.draw);
    setLossPoints(cfg.loss);
  };

  const addTeam = () => {
    const color = TEAM_COLORS[teams.length % TEAM_COLORS.length];
    setTeams([...teams, { name: "", shortName: "", color: color, groupName: "A", logo: null }]);
  };

  const removeTeam = (i: number) => {
    setTeams(teams.filter((_, idx) => idx !== i));
  };

  const updateTeamField = (i: number, field: keyof TeamInput, value: string) => {
    setTeams(teams.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return toast.error("Preencha os campos obrigatórios");
    if (teams.length < 2) return toast.error("Adicione pelo menos 2 equipes");
    
    updateMutation.mutate({
      id: tournamentId,
      name,
      category,
      sport,
      groupCount,
      winPoints,
      drawPoints,
      lossPoints,
      isDoubleRound,
      slider: JSON.stringify(slider),
      sponsors: JSON.stringify(sponsors),
      primaryColor,
      secondaryColor,
      fontFamily,
      description: description || null,
      regulation: regulation || null,
      heroTitleColor: heroTitleColor || null,
      heroSubtitleColor: heroSubtitleColor || null,
      heroSlider: JSON.stringify(heroSlider),
      teams
    });
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate(portalSlug ? `/${portalSlug}/login-admin` : "/login-admin");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/${portalSlug}/tournament/${tournamentId}`)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
            </Button>
            <div className="w-px h-5 bg-border/60" />
            <span className="font-medium text-sm text-foreground uppercase tracking-wider">Editar: {source?.tournament.name}</span>
          </div>
        </div>
      </header>

      <main className="container py-10 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium">
            <h2 className="font-display font-semibold text-foreground mb-5 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" /> Informações do Torneio
            </h2>
            
            <div className="mb-8">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Modalidade</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(Object.entries(SPORT_CONFIG) as [Sport, any][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => handleSportChange(key)} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${sport === key ? "border-gold bg-amber-900/10 text-gold shadow-gold ring-1 ring-gold/40" : "border-border/50 text-muted-foreground hover:text-foreground"}`}>
                    <span className="text-2xl">{cfg.emoji}</span>
                    <span className="text-[10px] uppercase font-bold tracking-tighter">{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Nome</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-secondary/20 border border-border/60 rounded-xl text-foreground focus:ring-1 focus:ring-gold/50 text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Categoria</label>
                  <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-secondary/20 border border-border/60 rounded-xl text-foreground focus:ring-1 focus:ring-gold/50 text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Sobre o Torneio / Regras</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Escreva detalhes sobre o formato, premiação ou regras específicas..."
                    rows={3}
                    className="w-full px-4 py-3 bg-secondary/20 border border-border/60 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50 text-sm font-medium resize-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 pt-6 border-t border-border/30 mt-2">
                <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Regras</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-4">
                    <select value={groupCount} onChange={(e) => setGroupCount(parseInt(e.target.value))} className="w-full px-3 py-3 bg-secondary/30 border border-border/60 rounded-xl text-foreground text-sm font-medium">
                      <option value={1}>Grupo Único</option>
                      <option value={2}>2 Grupos</option>
                      <option value={3}>3 Grupos</option>
                      <option value={4}>4 Grupos</option>
                    </select>
                    <div className="flex items-center gap-3 bg-secondary/10 p-3 rounded-xl border border-border/30">
                      <label className="flex items-center gap-3 cursor-pointer group flex-1">
                        <div className={`w-10 h-6 rounded-full transition-all relative ${isDoubleRound ? 'bg-gold shadow-gold/50' : 'bg-zinc-700'}`}>
                          <input type="checkbox" className="sr-only" checked={isDoubleRound} onChange={(e) => setIsDoubleRound(e.target.checked)} />
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isDoubleRound ? 'translate-x-4' : ''}`} />
                        </div>
                        <span className="text-xs font-bold text-foreground underline decoration-dotted" title="Se mudar isso, você deve marcar 'Regerar Confrontos' abaixo">Turno e Returno</span>
                      </label>
                    </div>
                  </div>
                  <div className="bg-secondary/20 p-5 rounded-2xl space-y-4 border border-border/40">
                    <div className="grid grid-cols-3 gap-3 text-center">
                       <div><label className="text-[8px] font-bold uppercase">Vitória</label><input type="number" value={winPoints} onChange={e => setWinPoints(parseInt(e.target.value)||0)} className="w-full bg-background border border-border/50 rounded py-1 text-xs text-center" /></div>
                       <div><label className="text-[8px] font-bold uppercase">Empate</label><input type="number" value={drawPoints} onChange={e => setDrawPoints(parseInt(e.target.value)||0)} className="w-full bg-background border border-border/50 rounded py-1 text-xs text-center" disabled={sport === "basketball" || sport === "volleyball"} /></div>
                       <div><label className="text-[8px] font-bold uppercase">Derrota</label><input type="number" value={lossPoints} onChange={e => setLossPoints(parseInt(e.target.value)||0)} className="w-full bg-background border border-border/50 rounded py-1 text-xs text-center" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium">
            <h2 className="font-display font-semibold text-foreground mb-5 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" /> Identidade Visual do Torneio
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Cor Primária</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded cursor-pointer border border-border/60 bg-transparent p-1" />
                  <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full px-3 py-2 bg-secondary/20 border border-border/60 rounded-xl text-foreground text-sm uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Cor Secundária</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-12 h-12 rounded cursor-pointer border border-border/60 bg-transparent p-1" />
                  <input type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-full px-3 py-2 bg-secondary/20 border border-border/60 rounded-xl text-foreground text-sm uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Fonte (Opcional)</label>
                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full px-4 py-3 bg-secondary/20 border border-border/60 rounded-xl text-foreground focus:ring-1 focus:ring-gold/50 text-sm font-medium">
                  <option value="Inter">Inter (Padrão)</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Outfit">Outfit</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-4">Estas configurações irão se sobrepor às cores do Portal.</p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium">
            <h2 className="font-display font-bold text-foreground mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold" /> Regulamento da Categoria (PDF)
            </h2>
            <div className="flex items-center gap-4">
               <label className="flex-1 cursor-pointer flex items-center justify-center h-14 rounded-2xl border-2 border-dashed border-border/60 hover:border-gold/50 transition-all bg-secondary/5">
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                        if (file.size > 5 * 1024 * 1024) return toast.error("O PDF deve ter menos de 5MB");
                        const reader = new FileReader();
                        reader.onloadend = () => setRegulation(reader.result as string);
                        reader.readAsDataURL(file);
                     }
                  }} />
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                     <Plus className="w-4 h-4" />
                     {regulation ? "SUBSTITUIR REGULAMENTO" : "CARREGAR REGULAMENTO (PDF)"}
                  </div>
               </label>
               {regulation && (
                  <Button variant="outline" size="sm" className="h-14 px-4 text-red-500 border-red-500/20 hover:bg-red-500/10" onClick={() => setRegulation(null)}>Remover</Button>
               )}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium">
             <h2 className="font-display font-bold text-foreground mb-6 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gold" /> Galeria & Slider do Topo
             </h2>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {heroSlider.map((img, i) => (
                   <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-border/50 bg-secondary/20">
                      <img src={img} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setHeroSlider(heroSlider.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Trash2 className="w-3 h-3 text-white" />
                      </button>
                   </div>
                ))}
                {heroSlider.length < 10 && (
                   <label className="aspect-video rounded-xl border-2 border-dashed border-border/60 hover:border-gold/50 flex flex-col items-center justify-center cursor-pointer transition-all bg-secondary/5">
                      <input type="file" className="hidden" multiple onChange={(e) => {
                         const files = Array.from(e.target.files || []);
                         files.forEach(file => {
                            if (file.size <= 2*1024*1024) {
                               const reader = new FileReader();
                               reader.onloadend = () => setHeroSlider(prev => [...prev, reader.result as string].slice(0, 10));
                               reader.readAsDataURL(file);
                            }
                         });
                      }} />
                      <Plus className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Adicionar Foto</span>
                   </label>
                )}
             </div>
             <p className="text-[10px] text-muted-foreground">Máximo 10 fotos para o carrossel do topo.</p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium">
            <h2 className="font-display font-bold text-foreground mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-gold" /> Cores Personalizadas (Opcional)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
               <div className="p-4 bg-secondary/5 rounded-2xl border border-border/40">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-3 text-center">Cor do Título</label>
                  <input type="color" value={heroTitleColor || "#ffffff"} onChange={e => setHeroTitleColor(e.target.value)} className="w-full h-10 rounded-xl cursor-pointer bg-transparent border-none shadow-sm" />
               </div>
               <div className="p-4 bg-secondary/5 rounded-2xl border border-border/40">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-3 text-center">Cor do Subtítulo</label>
                  <input type="color" value={heroSubtitleColor || "#ffffff"} onChange={e => setHeroSubtitleColor(e.target.value)} className="w-full h-10 rounded-xl cursor-pointer bg-transparent border-none shadow-sm" />
               </div>
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground italic text-center">* Deixe em branco para usar as cores padrão do portal.</p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" /> Equipes ({teams.length})
              </h2>
              <Button type="button" size="sm" variant="outline" className="text-[10px] font-bold" onClick={addTeam}><Plus className="w-3.5 h-3.5 mr-1" /> Adicionar</Button>
            </div>
            <div className="space-y-3">
              {teams.map((team, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl border border-border/30">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">#{i+1}</span>
                    <label className="cursor-pointer w-8 h-8 rounded-lg border border-border/60 hover:border-gold relative overflow-hidden group bg-background/50">
                       <input type="file" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.size <= 2*1024*1024) {
                            const reader = new FileReader();
                            reader.onloadend = () => updateTeamField(i, "logo", reader.result as string);
                            reader.readAsDataURL(file);
                          }
                       }} />
                       {team.logo ? <img src={team.logo} className="w-full h-full object-contain" /> : <ImageIcon className="w-3 h-3 text-muted-foreground m-auto" />}
                    </label>
                  </div>
                  <div className="flex-1 grid grid-cols-5 gap-2">
                    <input type="text" value={team.name} onChange={e => updateTeamField(i, "name", e.target.value)} placeholder="Equipe" className="col-span-2 px-2 py-1.5 bg-background border border-border/50 rounded text-xs" />
                    <input type="text" value={team.shortName} onChange={e => updateTeamField(i, "shortName", e.target.value.toUpperCase())} placeholder="Sigla" className="px-2 py-1.5 bg-background border border-border/50 rounded text-xs text-center font-bold" />
                    {groupCount > 1 && (
                      <select value={team.groupName} onChange={e => updateTeamField(i, "groupName", e.target.value)} className="px-1 py-1.5 bg-background border border-border/50 rounded text-[10px] font-bold">
                        {["A", "B", "C", "D"].slice(0, groupCount).map(g => <option key={g} value={g}>Gr. {g}</option>)}
                      </select>
                    )}
                    <div className="flex items-center gap-1 justify-end">
                      <input type="color" value={team.color} onChange={e => updateTeamField(i, "color", e.target.value)} className="w-6 h-6 rounded bg-transparent border-none cursor-pointer" />
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeTeam(i)} disabled={teams.length <= 2}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-amber-900/10 border border-gold/20 rounded-2xl">
             <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-6 rounded-full transition-all relative ${regenerateMatches ? 'bg-gold' : 'bg-zinc-700'}`}>
                   <input type="checkbox" className="sr-only" checked={regenerateMatches} onChange={e => setRegenerateMatches(e.target.checked)} />
                   <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${regenerateMatches ? 'translate-x-4' : ''}`} />
                </div>
                <div className="flex flex-col">
                   <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <RefreshCcw className="w-3 h-3" /> Regerar Confrontos da Fase de Grupos
                   </span>
                   <span className="text-[10px] text-muted-foreground">Marque se as equipes ou o formato (Turno/Returno) foram alterados. Isso limpará resultados existentes.</span>
                </div>
             </label>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => navigate(`/${portalSlug}/tournament/${tournamentId}`)}>Cancelar</Button>
            <Button type="submit" className="flex-1 h-12 rounded-xl gradient-gold text-amber-950 font-bold" disabled={updateMutation.isPending || generateMatchesMutation.isPending}>
               {(updateMutation.isPending || generateMatchesMutation.isPending) ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
