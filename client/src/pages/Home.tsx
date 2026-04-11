import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Trophy, Plus, ChevronRight, Shield, Users, Calendar, Star } from "lucide-react";
import { useEffect } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-zinc-700 text-zinc-300" },
  group_stage: { label: "Fase de Grupos", color: "bg-blue-900/60 text-blue-300" },
  semifinals: { label: "Semifinais", color: "bg-purple-900/60 text-purple-300" },
  final: { label: "Final", color: "bg-amber-900/60 text-amber-300" },
  finished: { label: "Encerrado", color: "bg-green-900/60 text-green-300" },
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: tournaments, refetch } = trpc.tournament.list.useQuery();
  const { data: stats } = trpc.tournament.getGlobalStats.useQuery();
  const seedMutation = trpc.seed.checkAndSeed.useMutation({
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    seedMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.1 0.015 260)" }}>
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shadow-gold">
              <Trophy className="w-5 h-5 text-amber-950" />
            </div>
            <span className="font-display font-semibold text-lg text-foreground tracking-tight">
              TournamentPro
            </span>
          </div>
          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user?.name}
                </span>
                <Button
                  size="sm"
                  className="gradient-gold text-amber-950 font-semibold hover:opacity-90 transition-opacity"
                  onClick={() => navigate("/admin")}
                >
                  <Shield className="w-4 h-4 mr-1.5" />
                  Admin
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-border/60 text-foreground hover:bg-accent"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Entrar
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.82 0.14 85 / 0.25), transparent)",
          }}
        />
        <div className="container relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-card/50 text-xs text-muted-foreground mb-6 tracking-widest uppercase">
            <Star className="w-3 h-3 text-gold" />
            Sistema de Gerenciamento de Torneios
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-5 leading-tight">
            Gerencie seus torneios
            <br />
            <span className="text-gold">com elegância</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Crie torneios completos com fase de grupos, semifinais e final. Acompanhe
            classificações, resultados e o campeão em tempo real.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {isAuthenticated ? (
              <Button
                size="lg"
                className="gradient-gold text-amber-950 font-semibold shadow-gold hover:opacity-90 transition-opacity"
                onClick={() => navigate("/create")}
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Torneio
              </Button>
            ) : (
              <Button
                size="lg"
                className="gradient-gold text-amber-950 font-semibold shadow-gold hover:opacity-90 transition-opacity"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Começar agora
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="border-border/60 text-foreground hover:bg-accent"
              onClick={() => {
                document.getElementById("tournaments")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Ver torneios
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/40 py-10">
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
      <section id="tournaments" className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Torneios</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Acompanhe todos os torneios em andamento
              </p>
            </div>
            {isAuthenticated && (
              <Button
                size="sm"
                className="gradient-gold text-amber-950 font-semibold hover:opacity-90"
                onClick={() => navigate("/create")}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Novo
              </Button>
            )}
          </div>

          {!tournaments || tournaments.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/40 rounded-2xl">
              <Trophy className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum torneio encontrado</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => {
                const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/tournament/${t.id}`)}
                    className="group text-left bg-card border border-border/50 rounded-2xl p-6 hover:border-gold/40 hover:shadow-gold transition-all duration-300 shadow-premium"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl gradient-gold flex items-center justify-center shadow-gold group-hover:scale-110 transition-transform">
                        <Trophy className="w-5 h-5 text-amber-950" />
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-foreground text-lg leading-snug mb-1">
                      {t.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{t.category}</p>
                    {t.champion && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-900/20 border border-amber-700/30">
                        <Trophy className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span className="text-xs text-amber-300 font-medium truncate">
                          {t.champion}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3 group-hover:text-gold transition-colors">
                      Ver detalhes
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-8">
        <div className="container text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-gold" />
            <span className="font-display font-semibold text-foreground">TournamentPro</span>
          </div>
          <p>Sistema profissional de gerenciamento de torneios esportivos</p>
          <button 
            onClick={() => navigate("/login-admin")}
            className="mt-6 text-xs text-muted-foreground/40 hover:text-gold transition-colors flex items-center gap-1.5 mx-auto"
          >
            <Shield className="w-3 h-3" />
            Acesso Administrativo
          </button>
        </div>
      </footer>
    </div>
  );
}
