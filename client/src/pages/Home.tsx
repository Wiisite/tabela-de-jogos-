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
      document.documentElement.style.fontFamily = portal.fontFamily || "Inter";
      document.title = `${portal.name} - Portal de Esportes`;
    } else {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--gold');
      document.documentElement.style.fontFamily = "Inter";
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
      <div className="min-h-screen bg-white text-gray-900">
        <header className="border-b border-gray-200 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
          <div className="container flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shadow-gold">
                <Trophy className="w-5 h-5 text-amber-950" />
              </div>
              <span className="font-display font-semibold text-lg tracking-tight">
                Painel Esportivo
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-gray-200 text-gray-700"
              onClick={() => navigate("/login-admin")}
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Geral
            </Button>
          </div>
        </header>

        <section className="py-20 text-center relative overflow-hidden bg-white">
          <div className="absolute inset-0 opacity-5 pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, var(--primary) 0%, transparent 70%)' }} 
          />
          <div className="container relative">
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 text-gray-900">
              Plataforma de <span style={{ color: 'var(--primary)' }}>Esportes</span>
            </h1>
            <p className="text-gray-500 text-xl max-w-2xl mx-auto mb-10">
              Gerencie competições, portais e resultados esportivos com eficiência e elegância.
            </p>
          </div>
        </section>

        <section className="container py-12">
          <div className="flex items-center gap-3 mb-8">
            <LayoutGrid className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            <h2 className="text-2xl font-display font-bold text-gray-900">Ligas Ativas</h2>
          </div>

          {!allPortals || allPortals.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-gray-200 rounded-3xl">
              <p className="text-gray-500">Nenhuma liga cadastrada no momento.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {allPortals.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/${p.slug}`)}
                  className="group bg-white border border-gray-100 shadow-sm rounded-3xl p-8 text-left hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-6">
                    {p.logo ? (
                      <div className="w-16 h-16 rounded-2xl bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${p.logo})` }} />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white relative overflow-hidden" style={{ backgroundColor: p.primaryColor }}>
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors" style={{ '--tw-bg-opacity': 1, '--tw-text-opacity': 1, '--tw-bg-color': p.primaryColor } as any}>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-2 text-gray-900 group-hover:opacity-80 transition-opacity">{p.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">Acesse os torneios, classificação e resultados da {p.name}.</p>
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
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 sticky top-0 z-50 bg-white/90 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {portal?.logo ? (
              <div 
                className="w-10 h-10 bg-contain bg-center bg-no-repeat cursor-pointer" 
                style={{ backgroundImage: `url(${portal.logo})` }}
                onClick={() => navigate(`/${portalSlug}`)}
              />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: portal?.primaryColor || '#1e3a8a' }}>
                <Trophy className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="font-display font-semibold text-lg text-gray-900 tracking-tight">
              {portal?.name || "Carregando..."}
            </span>
          </div>
          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                size="sm"
                className="text-white font-semibold shadow-sm"
                style={{ backgroundColor: portal?.primaryColor || '#1e3a8a' }}
                onClick={() => navigate(`/${portalSlug}/admin`)}
              >
                <Shield className="w-4 h-4 mr-1.5" />
                Painel Admin
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => navigate(`/${portalSlug}/login-admin`)}
              >
                Entrar
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section 
        className={`relative overflow-hidden ${portal?.banner ? 'py-24 sm:py-40' : 'py-16 sm:py-24 bg-white border-b border-gray-100'}`}
        style={portal?.banner ? {
          backgroundImage: `linear-gradient(to bottom, rgba(17, 24, 39, 0.7), rgba(17, 24, 39, 0.9)), url(${portal.banner})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        <div className="container relative text-center z-10">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${portal?.banner ? 'border-white/20 bg-white/10 text-white/80 backdrop-blur-md' : 'border-gray-200 bg-gray-50 text-gray-500'} text-[10px] font-bold mb-6 tracking-widest uppercase`}>
            <Star className="w-3 h-3" style={{ color: 'var(--gold)' }} />
            Portal Oficial de Torneios
          </div>
          <h1 className={`font-display text-4xl sm:text-6xl font-bold mb-5 leading-tight ${portal?.banner ? 'text-white drop-shadow-md' : 'text-gray-900'}`}>
            {portal?.heroTitle || (
              <>Acompanhe a <span style={{ color: 'var(--primary)' }}>{portal?.name}</span></>
            )}
          </h1>
          <p className={`text-lg max-w-xl mx-auto mb-8 leading-relaxed ${portal?.banner ? 'text-white/80 drop-shadow-sm' : 'text-gray-500'}`}>
            {portal?.heroSubtitle || "Resultados em tempo real, tabelas de classificação e toda a emoção dos esportes escolares."}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 py-10 bg-gray-50/50">
        <div className="container">
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
            {[
              { icon: Trophy, label: "Torneios", value: stats?.tournaments ?? 0 },
              { icon: Users, label: "Equipes", value: stats?.teams ?? 0 },
              { icon: Calendar, label: "Partidas", value: stats?.matches ?? 0 },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <div className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--primary)' }}>{value}</div>
                <div className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About text */}
      {portal?.aboutText && (
        <section className="py-16 bg-white border-b border-gray-100">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-6 text-center">Sobre a Liga</h2>
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap text-center">
              {portal.aboutText}
            </div>
          </div>
        </section>
      )}

      {/* Tournament List */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-bold text-gray-900">Competições</h2>
            {isAuthenticated && (
              <Button size="sm" className="text-white font-bold" style={{ backgroundColor: portal?.primaryColor }} onClick={() => navigate(`/${portalSlug}/create`)}>
                <Plus className="w-4 h-4 mr-1" /> Novo Torneio
              </Button>
            )}
          </div>

          {!tournaments || tournaments.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma competição encontrada neste portal.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => {
                const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/${portalSlug}/tournament/${t.id}`)}
                    className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:border-gray-200 transition-all duration-300 shadow-sm text-left"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: t.primaryColor || 'var(--gold)' }}>
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider text-white`} style={{ backgroundColor: 'var(--primary)' }}>
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-gray-900 text-xl mb-1 group-hover:opacity-80 transition-colors">
                      {t.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">{t.category}</p>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full uppercase">
                        {SPORT_EMOJI[t.sport] ?? "🏆"} {SPORT_LABEL[t.sport]}
                      </span>
                    </div>

                    {t.champion && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 mb-4">
                        <Star className="w-4 h-4 fill-current" style={{ color: 'var(--gold)' }} />
                        <span className="text-xs font-bold uppercase tracking-tight truncate text-gray-700">
                          Campeão: {t.champion}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 text-xs font-bold opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" style={{ color: 'var(--primary)' }}>
                      Ver Detalhes <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-gray-100 py-12 mt-12 bg-gray-50">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            {portal?.logo ? (
               <div className="w-8 h-8 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${portal.logo})` }} />
            ) : (
              <Trophy className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            )}
            <span className="font-display font-bold text-gray-900 text-xl">{portal?.name}</span>
          </div>
          <p className="text-gray-500 max-w-md mx-auto mb-8">O portal oficial de competições esportivas. Fomentando o esporte e a integração escolar.</p>
          <button 
            onClick={() => navigate(`/${portalSlug}/login-admin`)}
            className="text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest flex items-center gap-2 mx-auto"
          >
            <Shield className="w-3.5 h-3.5" /> Área Restrita
          </button>
        </div>
      </footer>
    </div>
  );
}

