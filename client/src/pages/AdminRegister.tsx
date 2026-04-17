import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { UserPlus, Shield, ArrowLeft, Mail, Lock, User } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminRegister() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Cadastro realizado com sucesso!");
        navigate("/login-admin");
      } else {
        toast.error(data.error || "Erro ao realizar cadastro");
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao tentar cadastrar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <button 
        onClick={() => navigate("/login-admin")}
        className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Login
      </button>

      <Card className="w-full max-w-md border-border/50 bg-card/50 glass shadow-premium">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
            <div className="w-full h-full gradient-gold flex items-center justify-center shadow-gold">
              <UserPlus className="w-8 h-8 text-amber-950" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display font-bold">
            Novo Administrador
          </CardTitle>
          <CardDescription>
            Crie sua conta para gerenciar ligas e torneios no LEG
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Nome Completo"
                  className="pl-10 h-12 bg-background/50 border-border/60"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  className="pl-10 h-12 bg-background/50 border-border/60"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="password"
                  placeholder="Crie uma senha forte"
                  className="pl-10 h-12 bg-background/50 border-border/60"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full h-12 gradient-gold text-amber-950 font-bold hover:opacity-90 shadow-gold"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-amber-950 border-t-transparent animate-spin" />
              ) : (
                "Criar Conta"
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Já tem uma conta?{" "}
              <button 
                type="button"
                onClick={() => navigate("/login-admin")}
                className="text-primary hover:underline font-bold"
              >
                Faça login
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
