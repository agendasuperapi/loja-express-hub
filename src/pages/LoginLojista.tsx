import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmailInput } from "@/components/ui/email-input";
import { supabase } from "@/integrations/supabase/client";
import { Store, LogIn, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

export default function LoginLojista() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Redirect if already logged in as store_owner or employee
  useEffect(() => {
    const checkAccess = async () => {
      if (!user || roleLoading) return;
      
      if (hasRole('store_owner')) {
        navigate('/dashboard-lojista');
        return;
      }

      // Verificar se é funcionário ativo
      const { data: employeeData } = await supabase
        .from('store_employees' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (employeeData) {
        navigate('/dashboard-lojista');
      }
    };
    
    checkAccess();
  }, [user, hasRole, roleLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao fazer login");

      // Verificar se o usuário tem role de store_owner
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'store_owner')
        .maybeSingle();

      if (roleError) {
        console.error('Erro ao verificar role:', roleError);
      }

      let isStoreOwner = !!roleData;
      let isEmployee = false;
      let storeName = '';

      // Se não é store_owner, verificar se é funcionário ativo
      if (!isStoreOwner) {
        const { data: employeeData } = await supabase
          .from('store_employees' as any)
          .select(`
            id,
            is_active,
            stores:store_id (
              name
            )
          `)
          .eq('user_id', authData.user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (employeeData) {
          isEmployee = true;
          storeName = (employeeData as any).stores?.name || '';
        }
      }

      // Se não é nem lojista nem funcionário, fazer logout e mostrar erro
      if (!isStoreOwner && !isEmployee) {
        await supabase.auth.signOut();
        setError("Esta conta não está registrada como lojista ou funcionário. Use o login de clientes ou cadastre sua loja.");
        setIsLoading(false);
        return;
      }

      // Se é store_owner, verificar se tem loja cadastrada
      if (isStoreOwner) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('id, status, name')
          .eq('owner_id', authData.user.id)
          .maybeSingle();

        storeName = storeData?.name || '';
      }

      toast({
        title: "Login realizado!",
        description: isEmployee 
          ? `Bem-vindo, funcionário${storeName ? ` da loja ${storeName}` : ''}!`
          : storeName 
            ? `Bem-vindo de volta, ${storeName}!`
            : "Bem-vindo! Complete o cadastro da sua loja.",
      });

      // Redirecionar para dashboard
      navigate('/dashboard-lojista');
    } catch (error: any) {
      console.error('Erro no login:', error);
      setError(error.message || "Erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Login de Lojista
            </h1>
            <p className="text-muted-foreground">
              Acesse o painel de gerenciamento da sua loja ou área de funcionário
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Entrar na sua conta</CardTitle>
              <CardDescription>
                Digite suas credenciais de lojista para acessar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <EmailInput
                    id="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                    minLength={6}
                  />
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors inline-block"
                  >
                    Esqueceu sua senha?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-primary"
                >
                  {isLoading ? (
                    "Entrando..."
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-center text-muted-foreground">
                Ainda não tem uma loja?{" "}
                <Link 
                  to="/become-partner" 
                  className="text-primary hover:underline font-medium"
                >
                  Cadastre sua loja
                </Link>
              </div>
              <div className="text-sm text-center text-muted-foreground">
                É cliente?{" "}
                <Link 
                  to="/auth" 
                  className="text-primary hover:underline font-medium"
                >
                  Fazer login como cliente
                </Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
