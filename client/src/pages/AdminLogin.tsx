import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Lock, Shield, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        toast.success("Login realizado com sucesso!");
        // Refresh page to update auth state
        window.location.href = "/admin";
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
        onClick={() => navigate("/")}
        className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para a Home
      </button>

      <Card className="w-full max-w-md border-border/50 bg-card/50 glass">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl gradient-gold flex items-center justify-center shadow-gold mb-4">
            <Shield className="w-6 h-6 text-amber-950" />
          </div>
          <CardTitle className="text-2xl font-display font-bold">Acesso Administrativo</CardTitle>
          <CardDescription>Insira sua senha mestra para gerenciar o sistema</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
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
              className="w-full h-12 gradient-gold text-amber-950 font-bold hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Acessar Painel"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground text-center max-w-xs">
        Este portal é exclusivo para o administrador do sistema APEFI.
      </p>
    </div>
  );
}
