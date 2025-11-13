import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailInput } from "@/components/ui/email-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Lock, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSignUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  initialEmail?: string;
  initialFullName?: string;
  initialPhone?: string;
  customMessage?: string;
  forceMode?: 'login' | 'signup';
}

export function LoginModal({ 
  open, 
  onClose, 
  onSignUp, 
  onSignIn, 
  isLoading = false, 
  initialEmail = "", 
  initialFullName = "",
  initialPhone = "",
  customMessage,
  forceMode
}: LoginModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [emailExistsError, setEmailExistsError] = useState(false);

  // Update fields when initial values change
  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialFullName) setFullName(initialFullName);
    if (initialPhone) setPhone(initialPhone);
  }, [initialEmail, initialFullName, initialPhone]);

  // Force login or signup mode
  useEffect(() => {
    if (forceMode === 'login') {
      setIsLogin(true);
    } else if (forceMode === 'signup') {
      setIsLogin(false);
    }
  }, [forceMode]);

  const checkEmailExists = async (emailToCheck: string) => {
    try {
      const { data } = await supabase.functions.invoke('check-email-exists', {
        body: { email: emailToCheck }
      });
      
      if (data?.exists) {
        setEmailExistsError(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailExistsError(false);
    
    if (isLogin) {
      await onSignIn(email, password);
    } else {
      // Check if email exists before signing up
      const exists = await checkEmailExists(email);
      if (exists) {
        return; // Don't proceed with signup
      }
      await onSignUp(email, password, fullName, phone);
    }
  };

  const benefits = [
    "Acompanhe o status do seu pedido",
    "Otimize o preenchimento de dados nas próximas compras",
    "Receba ofertas e promoções especiais"
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-0 gap-0 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b sticky top-0 bg-background z-10">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">
            Olá, faça seu login
          </h1>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={20} className="sm:hidden" />
            <X size={24} className="hidden sm:block" />
          </button>
        </div>

        <div className="px-3 py-4 sm:px-4 sm:py-6">
          {customMessage && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground font-medium">{customMessage}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-sm sm:text-base font-semibold text-foreground">
                    Nome completo
                  </label>
                  <Input
                    type="text"
                    placeholder="João Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="h-10 sm:h-12 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-sm sm:text-base font-semibold text-foreground">
                    Telefone
                  </label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    placeholder="(00) 00000-0000"
                    className="h-10 sm:h-12 text-sm sm:text-base"
                  />
                </div>
              </>
            )}

            {/* Email already exists alert */}
            {emailExistsError && !isLogin && (
              <Alert variant="destructive">
                <AlertDescription className="text-center">
                  <p className="font-semibold">Email já cadastrado</p>
                  <p className="text-sm mt-1">Por favor, faça login</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Email */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-sm sm:text-base font-semibold text-foreground">
                Email
              </label>
              <EmailInput
                value={email}
                onChange={setEmail}
                placeholder="email@email.com"
                className="h-10 sm:h-12 text-sm sm:text-base"
                required
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm sm:text-base font-semibold text-foreground">
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
                <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-14 bg-muted border-r flex items-center justify-center rounded-l-md">
                  <Lock className="text-muted-foreground" size={16} />
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10 sm:h-12 pl-14 sm:pl-16 text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Entrar Button */}
            <Button 
              type="submit" 
              className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
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
          <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-center text-foreground">
              Ainda não é cadastrado?
            </h2>
            
            <Button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setEmailExistsError(false);
              }}
              className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLogin ? "Cadastre-se agora" : "Já tem conta? Faça login"}
            </Button>

            {/* Benefits */}
            {isLogin && (
              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="text-muted-foreground mt-0.5 flex-shrink-0" size={16} />
                    <p className="text-xs sm:text-sm text-muted-foreground">{benefit}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
