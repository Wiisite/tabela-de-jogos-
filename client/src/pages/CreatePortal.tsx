import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Trophy, ArrowLeft, Image as ImageIcon, Palette, Globe, Shield } from "lucide-react";

export default function CreatePortal() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logo: "",
    primaryColor: "#1e3a8a",
    secondaryColor: "#f59e0b",
    adminPassword: "",
  });

  const createMutation = trpc.portal.create.useMutation({
    onSuccess: () => {
      toast.success("Liga criada com sucesso!");
      navigate("/admin");
    },
    onError: (error) => {
      const msg = error.message || "Erro ao criar liga";
      toast.error(msg.length > 200 ? msg.substring(0, 200) + "..." : msg);
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        toast.error("O logo deve ter menos de 500KB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error("Nome e Slug são obrigatórios");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-8 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Painel
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center shadow-gold">
            <Trophy className="w-6 h-6 text-amber-950" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Nova Liga</h1>
            <p className="text-muted-foreground">Crie um novo portal dedicado a uma competição específica.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-8 md:grid-cols-3">
          <Card className="md:col-span-2 border-border/50 bg-card/50 glass">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Globe className="w-5 h-5 text-gold" />
                Informações Gerais
              </CardTitle>
              <CardDescription>Defina o nome e o endereço (slug) da liga.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Liga</Label>
                <Input
                  id="name"
                  placeholder="Ex: Liga das Escolas de Guarulhos"
                  value={formData.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      name: val,
                      slug: prev.slug === "" ? val.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') : prev.slug
                    }));
                  }}
                  className="bg-background/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <div className="bg-secondary/50 px-3 py-2 rounded-lg text-sm text-muted-foreground font-mono">
                    meusite.com/
                  </div>
                  <Input
                    id="slug"
                    placeholder="ex: legg"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    className="bg-background/50 font-mono"
                    required
                  />
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Identificador único na URL</p>
              </div>

              <div className="space-y-2 pt-4">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gold" />
                  Senha Administrativa da Liga
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Senha para o organizador desta liga"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                  className="bg-background/50"
                />
                <p className="text-[10px] text-muted-foreground">Senha exclusiva para gerenciar esta liga específica.</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/50 bg-card/50 glass">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Palette className="w-5 h-5 text-gold" />
                  Branding
                </CardTitle>
                <CardDescription>Identidade Visual.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Cores do Portal</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="w-full h-10 rounded-lg border border-border shadow-inner" style={{ backgroundColor: formData.primaryColor }} />
                      <Input 
                        type="color" 
                        value={formData.primaryColor} 
                        onChange={(e) => setFormData(p => ({ ...p, primaryColor: e.target.value }))}
                        className="h-8 p-1 cursor-pointer"
                      />
                      <span className="text-[10px] text-center block text-muted-foreground uppercase font-bold">Primária</span>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-10 rounded-lg border border-border shadow-inner" style={{ backgroundColor: formData.secondaryColor }} />
                      <Input 
                        type="color" 
                        value={formData.secondaryColor} 
                        onChange={(e) => setFormData(p => ({ ...p, secondaryColor: e.target.value }))}
                        className="h-8 p-1 cursor-pointer"
                      />
                      <span className="text-[10px] text-center block text-muted-foreground uppercase font-bold">Secundária</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Escudo / Logo</Label>
                  <div className="flex flex-col items-center gap-4 p-4 border border-dashed border-border/60 rounded-xl bg-background/30">
                    {formData.logo ? (
                      <div className="relative w-24 h-24 group">
                        <img src={formData.logo} alt="Preview" className="w-full h-full object-contain" />
                        <button 
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, logo: "" }))}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <Label
                      htmlFor="logo-upload"
                      className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                      Selecionar Logo
                    </Label>
                    <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              size="lg"
              className="w-full gradient-gold text-amber-950 font-bold shadow-gold hover:opacity-90 py-8"
              disabled={createMutation.isLoading}
            >
              {createMutation.isLoading ? "Criando..." : "Criar Liga Profissional"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
