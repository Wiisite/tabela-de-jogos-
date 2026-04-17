import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Lock, Shield, ArrowLeft, Trophy } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AdminLogin() {
  const { portalSlug } = useParams<{ portalSlug?: string }>();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Portal Context
  const { data: portal } = trpc.portal.getBySlug.useQuery(
    { slug: portalSlug ?? "" },
    { enabled: !!portalSlug }
  );

  // Branding Injection
  useEffect(() => {
    if (portal) {
      document.documentElement.style.setProperty('--primary', portal.primaryColor);
      document.documentElement.style.setProperty('--gold', portal.secondaryColor);
    }
  }, [portal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email || undefined,
          password,
          portalId: portal?.id // Backend might use this for portal-specific login
        }),
      });

      if (response.ok) {
        toast.success("Login realizado com sucesso!");
        // Refresh page to update auth state and navigate to correct admin dashboard
        window.location.href = portalSlug ? `/${portalSlug}/admin` : "/admin";
      } else {
        const data = await response.json();
        toast.error(data.error || "Senha incorreta");
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao tentar logar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <button 
        onClick={() => navigate(portalSlug ? `/${portalSlug}` : "/")}
        className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para {portal?.name || "Home"}
      </button>

      <Card className="w-full max-w-md border-border/50 bg-card/50 glass shadow-premium">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
            {portal?.logo ? (
              <img src={portal.logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full gradient-gold flex items-center justify-center shadow-gold">
                <Shield className="w-8 h-8 text-amber-950" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-display font-bold">
            {portal ? `Acesso ${portal.name}` : "Acesso Administrativo"}
          </CardTitle>
          <CardDescription>
            {portal 
              ? `Faça login para gerenciar a liga ${portal.name}`
              : "Insira sua senha mestra para gerenciar o sistema"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="E-mail ou Usuário (admin)"
                  className="pl-10 h-12 bg-background/50 border-border/60"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="password"
                  placeholder="Senha Administrativa"
                  className="pl-10 h-12 bg-background/50 border-border/60"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full h-12 gradient-gold text-amber-950 font-bold hover:opacity-90 shadow-gold"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-amber-950 border-t-transparent animate-spin" />
              ) : (
                "Acessar Painel"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground text-center max-w-xs">
        {portal 
          ? `Painel de controle exclusivo para administradores da liga ${portal.name}.`
          : "Este painel é reservado para gestão global de portais e torneios."}
      </p>
    </div>
  );
}
