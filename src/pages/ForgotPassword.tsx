import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmailInput } from "@/components/ui/email-input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { forgotPasswordSchema, type ForgotPasswordData } from "@/hooks/useAuthValidation";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validação com Zod
      const validatedData: ForgotPasswordData = forgotPasswordSchema.parse({ email });

      const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
        redirectTo: `https://ofertas.app/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success("Link de redefinição enviado para seu email");
    } catch (error: any) {
      if (error.errors) {
        // Erros de validação Zod
        toast.error(error.errors[0].message);
      } else {
        // Mensagem genérica para não revelar se email existe
        toast.success("Se este email estiver cadastrado, você receberá um link de redefinição");
        setEmailSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <Card className="border-2 shadow-lg">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Esqueceu sua senha?</CardTitle>
              <CardDescription>
                {emailSent 
                  ? "Verifique seu email para o link de redefinição"
                  : "Digite seu email para receber o link de redefinição"
                }
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!emailSent ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <EmailInput
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={setEmail}
                      required
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Enviando..." : "Enviar link de redefinição"}
                  </Button>

                  <div className="text-center">
                    <Link
                      to="/auth"
                      className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar ao login
                    </Link>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Um link de redefinição foi enviado para <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Não recebeu o email? Verifique sua caixa de spam ou tente novamente em alguns minutos.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setEmailSent(false)}
                  >
                    Tentar novamente
                  </Button>
                  <Link
                    to="/auth"
                    className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao login
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
