import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import {
  Trophy,
  ArrowLeft,
  Shield,
  Swords,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Plus,
  LayoutGrid,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-zinc-700/60 text-zinc-300" },
  group_stage: { label: "Fase de Grupos", color: "bg-blue-900/60 text-blue-300" },
  semifinals: { label: "Semifinais", color: "bg-purple-900/60 text-purple-300" },
  final: { label: "Final", color: "bg-amber-900/60 text-amber-300" },
  finished: { label: "Encerrado", color: "bg-green-900/60 text-green-300" },
};

const SPORT_CONFIG: Record<string, { emoji: string; label: string }> = {
  football: { emoji: "⚽", label: "Futebol" },
  basketball: { emoji: "🏀", label: "Basquete" },
  volleyball: { emoji: "🏐", label: "Vôlei" },
  handball: { emoji: "🤾", label: "Handebol" },
  futsal: { emoji: "👟", label: "Futsal" },
};

export default function AdminDashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"tournaments" | "settings">("tournaments");
  const [, navigate] = useLocation();
  const { portalSlug } = useParams<{ portalSlug?: string }>();

  // Determine if this is Super Admin OR Portal Admin
  const isSuperAdmin = isAuthenticated && user?.role === "admin" && !user.portalId;
  const isPortalAdmin = isAuthenticated && !!portalSlug;

  // Data for Portal Admin
  const { data: portal } = trpc.portal.getBySlug.useQuery(
    { slug: portalSlug ?? "" },
    { enabled: !!portalSlug }
  );

  // Data for Super Admin (Portals List)
  const { data: portals } = trpc.portal.list.useQuery(undefined, {
    enabled: isSuperAdmin && !portalSlug,
  });

  const { data: tournaments } = trpc.tournament.list.useQuery(
    { portalId: portal?.id },
    { enabled: isAuthenticated && (isSuperAdmin || !!portal) }
  );

  const utils = trpc.useUtils();
  const deletePortal = trpc.portal.delete.useMutation({
    onSuccess: () => {
      utils.portal.list.invalidate();
      toast.success("Liga excluída com sucesso.");
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      if (portalSlug) navigate(`/${portalSlug}/login-admin`);
      else navigate("/login-admin");
    }
  }, [loading, isAuthenticated, navigate, portalSlug]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  const activeTournaments = tournaments?.filter(
    (t) => t.status !== "pending" && t.status !== "finished"
  ).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate(portalSlug ? `/${portalSlug}` : "/")}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Site
            </Button>
            <div className="w-px h-5 bg-border/60" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold" />
              <span className="font-bold text-sm text-foreground uppercase tracking-wider">
                {isSuperAdmin && !portalSlug ? "Super Admin" : portal?.name || "Admin"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <Button
              size="sm"
              variant="outline"
              className="border-border/60 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => logout()}
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10">
        <div className="mb-10">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Olá, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            {isSuperAdmin && !portalSlug 
              ? "Gerencie os portais, ligas e configurações globais do sistema." 
              : `Gerencie os torneios e resultados da ${portal?.name || "sua liga"}.`}
          </p>
        </div>

        {/* --- SUPER ADMIN ONLY: PORTALS LISTING --- */}
        {isSuperAdmin && !portalSlug && (
           <div className="space-y-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-gold" />
                  <h2 className="text-xl font-bold">Gerenciar Ligas (Portais)</h2>
                </div>
                <Button size="sm" className="gradient-gold text-amber-950 font-bold" onClick={() => navigate("/create-portal")}>
                  <Plus className="w-4 h-4 mr-1" /> Nova Liga
                </Button>
              </div>

              {!portals || portals.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border/40 rounded-3xl bg-secondary/10">
                  <LayoutGrid className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-6">Nenhuma liga criada ainda.</p>
                  <Button size="sm" className="gradient-gold text-amber-950 font-bold" onClick={() => navigate("/create-portal")}>
                    Criar Primeira Liga
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {portals.map(p => (
                    <div key={p.id} className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium relative group overflow-hidden">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${p.logo})`, backgroundColor: p.primaryColor }} />
                        <Badge variant="outline" className="text-[10px] uppercase">{p.slug}</Badge>
                      </div>
                      <h3 className="text-lg font-bold mb-1">{p.name}</h3>
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.primaryColor }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.secondaryColor }} />
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Cores da Liga</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 gradient-gold text-amber-950 font-bold text-xs" onClick={() => navigate(`/${p.slug}/admin`)}>
                          Entrar Admin
                        </Button>
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="h-8 w-8"
                          onClick={() => {
                            if (window.confirm(`Excluir a liga "${p.name}" permanentemente?`)) {
                              deletePortal.mutate({ id: p.id });
                            }
                          }}
                          disabled={deletePortal.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        )}

        {/* --- PORTAL ADMIN OR SUPER ADMIN IN PORTAL CONTEXT --- */}
        {(isPortalAdmin || (isSuperAdmin && portalSlug)) && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {[
                { icon: Trophy, label: "Total de Torneios", value: tournaments?.length ?? 0, color: "text-gold" },
                { icon: Swords, label: "Em Andamento", value: activeTournaments, color: "text-blue-400" },
                { icon: CheckCircle2, label: "Encerrados", value: tournaments?.filter((t) => t.status === "finished").length ?? 0, color: "text-green-400" },
                { icon: Settings, label: "Personalização", value: "Ajustar", isConfig: true, color: "text-zinc-400" },
              ].map(({ icon: Icon, label, value, color, isConfig }) => (
                <div 
                  key={label} 
                  className={`bg-card border border-border/50 rounded-2xl p-5 shadow-premium transition-all ${isConfig ? 'hover:border-gold/50 cursor-pointer' : ''}`}
                  onClick={() => isConfig && setActiveTab("settings")}
                >
                  <Icon className={`w-5 h-5 ${color} mb-3`} />
                  <div className="text-2xl font-display font-bold text-foreground mb-1">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-1 p-1 bg-secondary/30 rounded-2xl mb-8 w-fit">
              {["tournaments", "settings"].map((t: any) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    activeTab === t
                      ? "bg-card text-gold shadow-premium border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "tournaments" ? "Torneios" : "Visual & Cores"}
                </button>
              ))}
            </div>

            {activeTab === "tournaments" ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl font-semibold text-foreground">Torneios da Liga</h2>
                  <Button size="sm" className="gradient-gold text-amber-950 font-bold" onClick={() => navigate(`/${portalSlug}/create`)}>
                    <Plus className="w-4 h-4 mr-1" /> Novo Torneio
                  </Button>
                </div>

                {!tournaments || tournaments.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                    <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm mb-4">Nenhum torneio criado nesta liga.</p>
                    <Button size="sm" className="gradient-gold text-amber-950 font-bold" onClick={() => navigate(`/${portalSlug}/create`)}>
                      Criar Torneio
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tournaments.map((t) => {
                      const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
                      const sport = SPORT_CONFIG[t.sport] || { emoji: "🏆", label: t.sport };
                      return (
                        <div key={t.id} className="bg-card border border-border/50 rounded-2xl p-5 shadow-premium hover:border-gold/30 transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
                              <Trophy className="w-5 h-5 text-amber-950" />
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <h3 className="font-bold text-foreground mb-1">{t.name}</h3>
                          <p className="text-xs text-muted-foreground mb-3">{t.category}</p>
                          
                          <div className="flex items-center gap-1.5 mb-4">
                            <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full uppercase">
                               {sport.emoji} {sport.label}
                            </span>
                          </div>

                          {t.champion && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-300 mb-4 bg-amber-900/10 p-2 rounded-lg">
                              <Trophy className="w-3 h-3 text-gold" />
                              Campeão: {t.champion}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 gradient-gold text-amber-950 font-bold text-xs" onClick={() => navigate(`/${portalSlug}/tournament/${t.id}`)}>
                              Gerenciar
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <PortalSettings portal={portal!} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PortalSettings({ portal }: { portal: any }) {
  const [name, setName] = useState(portal.name);
  const [primary, setPrimary] = useState(portal.primaryColor);
  const [secondary, setSecondary] = useState(portal.secondaryColor);
  const [font, setFont] = useState(portal.fontFamily || "Inter");
  const [logo, setLogo] = useState(portal.logo);
  const [banner, setBanner] = useState(portal.banner);
  const [heroTitle, setHeroTitle] = useState(portal.heroTitle || "");
  const [heroSubtitle, setHeroSubtitle] = useState(portal.heroSubtitle || "");
  const [aboutText, setAboutText] = useState(portal.aboutText || "");

  const updateMutation = trpc.portal.update.useMutation({
    onSuccess: () => toast.success("Configurações salvas!"),
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: portal.id,
      name,
      primaryColor: primary,
      secondaryColor: secondary,
      fontFamily: font,
      logo,
      banner,
      heroTitle: heroTitle || null,
      heroSubtitle: heroSubtitle || null,
      aboutText: aboutText || null,
    });
  };

  return (
    <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-premium max-w-2xl">
      <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
        <Settings className="w-5 h-5 text-gold" />
        Configurações Visuais da Liga
      </h2>

      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
           <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-2">Identidade (Logo)</label>
              <label className="cursor-pointer block w-20 h-20 rounded-2xl border-2 border-dashed border-border/60 hover:border-gold/50 transition-all overflow-hidden relative group">
                <input type="file" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setLogo(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                {logo ? <img src={logo} className="w-full h-full object-contain" /> : <div className="flex items-center justify-center h-full"><Plus className="w-5 h-5 text-muted-foreground" /></div>}
              </label>
           </div>
           <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-2">Capa / Background (Tela Cheia)</label>
              <label className="cursor-pointer block h-20 rounded-2xl border-2 border-dashed border-border/60 hover:border-gold/50 transition-all overflow-hidden relative group">
                <input type="file" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setBanner(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                {banner ? <img src={banner} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground font-bold">CARREGAR PLANO DE FUNDO</div>}
              </label>
           </div>
        </div>

        <div className="space-y-4">
           <label className="block text-[10px] font-bold text-muted-foreground uppercase">Título Principal na Página</label>
           <input 
             type="text" 
             value={heroTitle} 
             onChange={(e) => setHeroTitle(e.target.value)} 
             placeholder={`Ex: Acompanhe a ${portal.name}`}
             className="w-full px-4 py-3 bg-secondary/20 border border-border/60 rounded-xl text-foreground"
           />
           <label className="block text-[10px] font-bold text-muted-foreground uppercase mt-4">Subtítulo</label>
           <input 
             type="text" 
             value={heroSubtitle} 
             onChange={(e) => setHeroSubtitle(e.target.value)} 
             placeholder="Resultados em tempo real, tabelas..."
             className="w-full px-4 py-3 bg-secondary/20 border border-border/60 rounded-xl text-foreground"
           />
           <label className="block text-[10px] font-bold text-muted-foreground uppercase mt-4">Sobre a Liga (Texto Longo para a Home)</label>
           <textarea 
             value={aboutText} 
             onChange={(e) => setAboutText(e.target.value)} 
             placeholder="Escreva sobre a organização, regras gerais, ou patrocinadores..."
             rows={4}
             className="w-full px-4 py-3 bg-secondary/20 border border-border/60 rounded-xl text-foreground resize-none"
           />
        </div>

        <div className="space-y-4">
           <label className="block text-[10px] font-bold text-muted-foreground uppercase">Tipografia (Fonte)</label>
           <select 
             value={font} 
             onChange={(e) => setFont(e.target.value)}
             className="w-full px-4 py-3 bg-secondary/20 border border-border/60 rounded-xl text-foreground"
           >
              <option value="Inter">Inter (Padrão)</option>
              <option value="Montserrat">Montserrat (Esportivo)</option>
              <option value="Playfair Display">Playfair (Clássico)</option>
              <option value="Outfit">Outfit (Moderno)</option>
              <option value="Roboto">Roboto (Clean)</option>
           </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="p-4 bg-secondary/10 rounded-2xl border border-border/40">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-3 text-center">Cor Primária</label>
              <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer bg-transparent border-none" />
           </div>
           <div className="p-4 bg-secondary/10 rounded-2xl border border-border/40">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-3 text-center">Cor Secundária (Destaque)</label>
              <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer bg-transparent border-none" />
           </div>
        </div>

        <Button 
          className="w-full h-14 gradient-gold text-amber-950 font-bold rounded-2xl"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Salvando..." : "Salvar Customização"}
        </Button>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${variant === 'outline' ? 'border border-border/60' : ''} ${className}`}>
      {children}
    </span>
  );
}

