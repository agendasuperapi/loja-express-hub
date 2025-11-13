import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Lock, Check, Mail } from "lucide-react";
import { Navigation } from "@/components/layout/Navigation";
import { signUpSchema, signInSchema } from "@/hooks/useAuthValidation";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();

  useEffect(() => {
    const checkAccessAndRedirect = async () => {
      if (!user || roleLoading) return;
      
      if (hasRole('store_owner')) {
        navigate('/dashboard-lojista');
        return;
      }
      
      // Verificar se é funcionário ativo
      const { data } = await supabase
        .from('store_employees' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (data) {
        navigate('/dashboard-lojista');
      } else {
        navigate('/dashboard');
      }
    };
    
    checkAccessAndRedirect();
  }, [user, hasRole, roleLoading, navigate]);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  // Formatar telefone com máscara
  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara (XX) XXXXX-XXXX
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Validate login data
        const validatedData = signInSchema.parse({ email, password });
        await signIn(validatedData.email, validatedData.password);
      } else {
        // Remove formatação do telefone e adiciona +55
        const cleanPhone = phone.replace(/\D/g, '');
        const phoneWithCountryCode = `+55${cleanPhone}`;
        
        // Validate signup data
        const validatedData = signUpSchema.parse({ 
          email, 
          password, 
          fullName, 
          phone: phoneWithCountryCode 
        });
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
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-16 bg-muted border-r flex items-center justify-center rounded-l-md">
                    <span className="text-2xl" title="Brasil (+55)">🇧🇷</span>
                  </div>
                  <Input
                    type="tel"
                    placeholder="(38) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                    className="h-12 pl-20"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Código do país +55 adicionado automaticamente
                </p>
              </div>
            </>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email
            </label>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted border-r flex items-center justify-center rounded-l-md">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                type="email"
                placeholder="seuemail@exemplo.com"
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
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted border-r flex items-center justify-center rounded-l-md">
                <Lock className="h-5 w-5 text-muted-foreground" />
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
