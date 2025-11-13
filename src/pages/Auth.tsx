import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, User, Lock, Check } from "lucide-react";
import { Navigation } from "@/components/layout/Navigation";
import { signUpSchema, signInSchema } from "@/hooks/useAuthValidation";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();

  useEffect(() => {
    if (user && !roleLoading) {
      const dashboardPath = hasRole('store_owner') ? '/dashboard-lojista' : '/dashboard';
      navigate(dashboardPath);
    }
  }, [user, hasRole, roleLoading, navigate]);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Validate login data
        const validatedData = signInSchema.parse({ email, password });
        await signIn(validatedData.email, validatedData.password);
      } else {
        // Validate signup data
        const validatedData = signUpSchema.parse({ email, password, fullName, phone });
        await signUp(validatedData.email, validatedData.password, validatedData.fullName, validatedData.phone);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Dados inválidos',
          description: error.errors[0]?.message || 'Por favor, verifique os campos',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    "Acompanhe o status do seu pedido",
    "Otimize o preenchimento de dados nas próximas compras",
    "Receba ofertas e promoções especiais"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="px-4 py-6 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-foreground mb-6">
          {isLogin ? "Faça seu login" : "Crie sua conta"}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nome completo
                </label>
                <Input
                  type="text"
                  placeholder="João Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Telefone
                </label>
                <Input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12"
                />
              </div>
            </>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email
            </label>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted border-r flex items-center justify-center">
                <User className="text-muted-foreground" size={18} />
              </div>
              <Input
                type="email"
                placeholder="email@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 pl-16"
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Senha
              </label>
              {isLogin && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted border-r flex items-center justify-center">
                <Lock className="text-muted-foreground" size={18} />
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 pl-16"
              />
            </div>
          </div>

          {/* Entrar Button */}
          <Button 
            type="submit" 
            className="w-full h-12 font-semibold bg-primary hover:bg-primary/90" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : isLogin ? (
              "Entrar"
            ) : (
              "Criar conta"
            )}
          </Button>
        </form>

        {/* Cadastro Section */}
        <div className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-center text-foreground">
            {isLogin ? "Ainda não é cadastrado?" : "Já tem uma conta?"}
          </h2>
          
          <Button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            variant="outline"
            className="w-full h-12 font-semibold"
          >
            {isLogin ? "Cadastre-se agora" : "Faça login"}
          </Button>

          {/* Benefits */}
          {isLogin && (
            <div className="mt-6 space-y-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="text-primary mt-0.5 flex-shrink-0" size={16} />
                  <p className="text-sm text-muted-foreground">{benefit}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
