import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, MapPin, Home, Mail, Lock, KeyRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s\-\(\)]+$/, "Telefone deve conter apenas números e caracteres especiais permitidos")
    .min(10, "Telefone deve ter no mínimo 10 dígitos")
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .optional()
    .or(z.literal("")),
  street: z
    .string()
    .trim()
    .max(200, "Rua deve ter no máximo 200 caracteres")
    .optional()
    .or(z.literal("")),
  street_number: z
    .string()
    .trim()
    .max(20, "Número deve ter no máximo 20 caracteres")
    .optional()
    .or(z.literal("")),
  neighborhood: z
    .string()
    .trim()
    .max(100, "Bairro deve ter no máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  complement: z
    .string()
    .trim()
    .max(200, "Complemento deve ter no máximo 200 caracteres")
    .optional()
    .or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres"),
  newPassword: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const { user } = useAuth();
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      street: "",
      street_number: "",
      neighborhood: "",
      complement: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        street: profile.street || "",
        street_number: profile.street_number || "",
        neighborhood: profile.neighborhood || "",
        complement: profile.complement || "",
      });
    }
  }, [profile, form]);

  const onSubmit = (data: ProfileFormData) => {
    updateProfile(data);
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso.",
      });
      
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <h1 className="text-4xl font-bold gradient-text mb-2">Meu Perfil</h1>
          <p className="text-muted-foreground mb-8">
            Gerencie suas informações pessoais e endereço de entrega
          </p>

          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Dados Pessoais
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Segurança
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Informações Pessoais
                    </CardTitle>
                    <CardDescription>
                      Atualize seus dados pessoais e endereço de entrega
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Personal Info Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Dados Pessoais
                          </h3>

                          <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome Completo</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seu nome completo" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <PhoneInput 
                                    value={field.value || ""} 
                                    onChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email
                            </Label>
                            <Input 
                              value={user?.email || ""} 
                              disabled 
                              className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                              O email não pode ser alterado
                            </p>
                          </div>
                        </div>

                        {/* Address Section */}
                        <div className="space-y-4 pt-6 border-t">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Endereço de Entrega
                          </h3>

                          <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rua</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nome da rua" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="street_number"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Número</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Nº" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="neighborhood"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Bairro</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Bairro" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="complement"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Complemento (Opcional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Apto, bloco, etc" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={isUpdating}>
                          {isUpdating ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5" />
                      Alterar Senha
                    </CardTitle>
                    <CardDescription>
                      Atualize sua senha de acesso
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha Atual</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Digite sua senha atual" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nova Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Digite sua nova senha" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirmar Nova Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirme sua nova senha" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button type="submit" className="w-full" disabled={isUpdatingPassword}>
                          {isUpdatingPassword ? "Atualizando..." : "Atualizar Senha"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      </main>
    </div>
  );
}
