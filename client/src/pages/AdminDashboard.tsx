import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Trophy,
  ArrowLeft,
  Shield,
  Users,
  Swords,
  CheckCircle2,
  Clock,
  ChevronRight,
  LogOut,
  Plus,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-zinc-700/60 text-zinc-300" },
  group_stage: { label: "Fase de Grupos", color: "bg-blue-900/60 text-blue-300" },
  semifinals: { label: "Semifinais", color: "bg-purple-900/60 text-purple-300" },
  final: { label: "Final", color: "bg-amber-900/60 text-amber-300" },
  finished: { label: "Encerrado", color: "bg-green-900/60 text-green-300" },
};

export default function AdminDashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: tournaments } = trpc.tournament.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login-admin");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  const totalMatches = tournaments?.reduce((acc) => acc, 0) ?? 0;
  const activeTournaments = tournaments?.filter(
    (t) => t.status !== "pending" && t.status !== "finished"
  ).length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.1 0.015 260)" }}>
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Início
            </Button>
            <div className="w-px h-5 bg-border/60" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold" />
              <span className="font-medium text-sm text-foreground">Painel Admin</span>
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
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Bem-vindo, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Gerencie torneios, registre placares e acompanhe o progresso das competições.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          {[
            {
              icon: Trophy,
              label: "Total de Torneios",
              value: tournaments?.length ?? 0,
              color: "text-gold",
            },
            {
              icon: Swords,
              label: "Em Andamento",
              value: activeTournaments,
              color: "text-blue-400",
            },
            {
              icon: CheckCircle2,
              label: "Encerrados",
              value: tournaments?.filter((t) => t.status === "finished").length ?? 0,
              color: "text-green-400",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="bg-card border border-border/50 rounded-2xl p-5 shadow-premium"
            >
              <Icon className={`w-5 h-5 ${color} mb-3`} />
              <div className="text-2xl font-display font-bold text-foreground mb-1">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold text-foreground">Torneios</h2>
          <Button
            size="sm"
            className="gradient-gold text-amber-950 font-semibold hover:opacity-90"
            onClick={() => navigate("/create")}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Torneio
          </Button>
        </div>

        {/* Tournament List */}
        {!tournaments || tournaments.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
            <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-4">Nenhum torneio criado ainda</p>
            <Button
              size="sm"
              className="gradient-gold text-amber-950 font-semibold hover:opacity-90"
              onClick={() => navigate("/create")}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Criar Torneio
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => {
              const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
              return (
                <div
                  key={t.id}
                  className="bg-card border border-border/50 rounded-2xl p-5 shadow-premium hover:border-gold/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
                      <Trophy className="w-5 h-5 text-amber-950" />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-1">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{t.category}</p>
                  {t.champion && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-300 mb-3">
                      <Trophy className="w-3 h-3 text-gold" />
                      {t.champion}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gradient-gold text-amber-950 font-semibold hover:opacity-90 text-xs"
                      onClick={() => navigate(`/tournament/${t.id}`)}
                    >
                      Gerenciar
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
