import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Trophy, Plus, ChevronRight, Shield, Users, Calendar, Star, LayoutGrid, ArrowRight } from "lucide-react";
import { useEffect } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-zinc-700 text-zinc-300" },
  group_stage: { label: "Fase de Grupos", color: "bg-blue-900/60 text-blue-300" },
  semifinals: { label: "Semifinais", color: "bg-purple-900/60 text-purple-300" },
  final: { label: "Final", color: "bg-amber-900/60 text-amber-300" },
  finished: { label: "Encerrado", color: "bg-green-900/60 text-green-300" },
};

const SPORT_EMOJI: Record<string, string> = {
  football: "⚽", basketball: "🏀", volleyball: "🏐", handball: "🤾", futsal: "👟",
};

const SPORT_LABEL: Record<string, string> = {
  football: "Futebol", basketball: "Basquete", volleyball: "Vôlei", handball: "Handebol", futsal: "Futsal",
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { portalSlug } = useParams<{ portalSlug?: string }>();

  // Global list of portals (for landing page)
  const { data: allPortals } = trpc.portal.list.useQuery(undefined, {
    enabled: !portalSlug
  });

  // Specific portal data
  const { data: portal, isLoading: loadingPortal } = trpc.portal.getBySlug.useQuery(
    { slug: portalSlug ?? "" },
    { enabled: !!portalSlug }
  );

  const { data: tournaments, refetch } = trpc.tournament.list.useQuery(
    { portalId: portal?.id },
    { enabled: !portalSlug || !!portal }
  );

  const { data: stats } = trpc.tournament.getGlobalStats.useQuery();

  // Apply Portal Branding
  useEffect(() => {
    if (portal) {
      document.documentElement.style.setProperty('--primary', portal.primaryColor);
      document.documentElement.style.setProperty('--gold', portal.secondaryColor);
      document.title = `${portal.name} - Portal de Esportes`;
    } else {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--gold');
      document.title = "LEGG - LIGA DAS ESCOLAS DE GUARULHOS";
    }
  }, [portal]);

  if (portalSlug && loadingPortal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  // --- GLOBAL LANDING PAGE ---
  if (!portalSlug) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/50 sticky top-0 z-50 glass">
          <div className="container flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shadow-gold">
                <Trophy className="w-5 h-5 text-amber-950" />
              </div>
              <span className="font-display font-semibold text-lg tracking-tight">
                LEGG Portal
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-border/60"
              onClick={() => navigate("/login-admin")}
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Geral
            </Button>
          </div>
        </header>

        <section className="py-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, var(--gold) 0%, transparent 70%)' }} 
          />
          <div className="container relative">
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6">
              Plataforma de <span className="text-gold">Ligas Escolares</span>
            </h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto mb-10">
              Gerencie competições, portais e resultados esportivos com eficiência e elegância.
            </p>
          </div>
        </section>

        <section className="container py-12">
          <div className="flex items-center gap-3 mb-8">
            <LayoutGrid className="w-6 h-6 text-gold" />
            <h2 className="text-2xl font-display font-bold">Ligas Ativas</h2>
          </div>

          {!allPortals || allPortals.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-border/40 rounded-3xl">
              <p className="text-muted-foreground">Nenhuma liga cadastrada no momento.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {allPortals.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/${p.slug}`)}
                  className="group bg-card border border-border/50 rounded-3xl p-8 text-left hover:border-gold/40 hover:shadow-premium transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-6">
                    {p.logo ? (
                      <div className="w-16 h-16 rounded-2xl bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${p.logo})` }} />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: p.primaryColor }}>
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-gold group-hover:text-amber-950 transition-colors">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-2 group-hover:text-gold transition-colors">{p.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">Acesse os torneios, classificação e resultados da {p.name}.</p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // --- LOCAL PORTAL PAGE ---
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {portal?.logo ? (
              <div 
                className="w-10 h-10 bg-contain bg-center bg-no-repeat cursor-pointer" 
                style={{ backgroundImage: `url(${portal.logo})` }}
                onClick={() => navigate(`/${portalSlug}`)}
              />
            ) : (
              <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shadow-gold">
                <Trophy className="w-5 h-5 text-amber-950" />
              </div>
            )}
            <span className="font-display font-semibold text-lg text-foreground tracking-tight">
              {portal?.name || "Carregando..."}
            </span>
          </div>
          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                size="sm"
                className="gradient-gold text-amber-950 font-semibold shadow-gold"
                onClick={() => navigate(`/${portalSlug}/admin`)}
              >
                <Shield className="w-4 h-4 mr-1.5" />
                Painel Admin
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-border/60"
                onClick={() => navigate(`/${portalSlug}/login-admin`)}
              >
                Entrar
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20">
        <div className="container relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-card/50 text-[10px] font-bold text-muted-foreground mb-6 tracking-widest uppercase">
            <Star className="w-3 h-3 text-gold" />
            Portal Oficial de Torneios
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-foreground mb-5 leading-tight">
            Acompanhe a <span className="text-gold">{portal?.name}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Resultados em tempo real, tabelas de classificação e toda a emoção dos esportes escolares.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/40 py-10 bg-secondary/10">
        <div className="container">
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
            {[
              { icon: Trophy, label: "Torneios", value: stats?.tournaments ?? 0 },
              { icon: Users, label: "Equipes", value: stats?.teams ?? 0 },
              { icon: Calendar, label: "Partidas", value: stats?.matches ?? 0 },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <div className="text-3xl font-display font-bold text-gold mb-1">{value}</div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tournament List */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground">Competições</h2>
            {isAuthenticated && (
              <Button size="sm" className="gradient-gold text-amber-950 font-bold" onClick={() => navigate(`/${portalSlug}/create`)}>
                <Plus className="w-4 h-4 mr-1" /> Novo Torneio
              </Button>
            )}
          </div>

          {!tournaments || tournaments.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/40 rounded-2xl">
              <Trophy className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma competição encontrada neste portal.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => {
                const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/${portalSlug}/tournament/${t.id}`)}
                    className="group bg-card border border-border/50 rounded-2xl p-6 hover:border-gold/40 hover:shadow-gold transition-all duration-300 shadow-premium text-left"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
                        <Trophy className="w-5 h-5 text-amber-950" />
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-foreground text-xl mb-1 group-hover:text-gold transition-colors">
                      {t.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{t.category}</p>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full uppercase">
                        {SPORT_EMOJI[t.sport] ?? "🏆"} {SPORT_LABEL[t.sport]}
                      </span>
                    </div>

                    {t.champion && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-900/20 border border-amber-700/30 mb-4">
                        <Star className="w-4 h-4 text-gold fill-gold" />
                        <span className="text-xs text-amber-300 font-bold uppercase tracking-tight truncate">
                          Campeão: {t.champion}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gold opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                      Ver Detalhes <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border/40 py-12 mt-12 bg-secondary/5">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            {portal?.logo ? (
               <div className="w-8 h-8 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${portal.logo})` }} />
            ) : (
              <Trophy className="w-5 h-5 text-gold" />
            )}
            <span className="font-display font-bold text-foreground text-xl">{portal?.name}</span>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">O portal oficial de competições esportivas. Fomentando o esporte e a integração escolar.</p>
          <button 
            onClick={() => navigate(`/${portalSlug}/login-admin`)}
            className="text-[10px] font-bold text-muted-foreground/40 hover:text-gold transition-colors uppercase tracking-widest flex items-center gap-2 mx-auto"
          >
            <Shield className="w-3.5 h-3.5" /> Área Restrita
          </button>
        </div>
      </footer>
    </div>
  );
}

