import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, MapPin, Mail, Search, Loader2 } from "lucide-react";
import { fetchCepData, formatCep, isValidCepFormat } from "@/lib/cepValidation";
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
  cep: z
    .string()
    .trim()
    .max(9, "CEP inválido")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .trim()
    .max(100, "Cidade deve ter no máximo 100 caracteres")
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

export const PersonalDataSettings = () => {
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const { user } = useAuth();
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState<string>("");

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      cep: "",
      city: "",
      street: "",
      street_number: "",
      neighborhood: "",
      complement: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        cep: profile.cep || "",
        city: profile.city || "",
        street: profile.street || "",
        street_number: profile.street_number || "",
        neighborhood: profile.neighborhood || "",
        complement: profile.complement || "",
      });
    }
  }, [profile, form]);

  const handleCepSearch = async () => {
    const cep = form.getValues("cep");
    
    if (!cep || !isValidCepFormat(cep)) {
      setCepError("CEP inválido");
      return;
    }

    setIsSearchingCep(true);
    setCepError("");

    const data = await fetchCepData(cep);

    if (data) {
      form.setValue("city", data.localidade);
      form.setValue("neighborhood", data.bairro);
      form.setValue("street", data.logradouro);
      toast({
        title: "CEP encontrado!",
        description: "Endereço preenchido automaticamente.",
      });
    } else {
      setCepError("CEP não encontrado");
      toast({
        title: "CEP não encontrado",
        description: "Verifique o CEP digitado.",
        variant: "destructive",
      });
    }

    setIsSearchingCep(false);
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    form.setValue("cep", formatted);
    setCepError("");
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfile(data);
  };

  if (isLoading) {
    return (
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
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Informações Pessoais
        </CardTitle>
        <CardDescription>
          Atualize seus dados pessoais
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
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Endereço de Entrega</span>
              </div>

              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          {...field}
                          placeholder="00000-000"
                          maxLength={9}
                          disabled={isUpdating}
                          onChange={handleCepChange}
                          className={cepError ? "border-destructive" : ""}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCepSearch}
                          disabled={isSearchingCep || isUpdating}
                        >
                          {isSearchingCep ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    {cepError && (
                      <p className="text-sm text-destructive">{cepError}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nome da cidade"
                        maxLength={100}
                        disabled={isUpdating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rua</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nome da rua"
                        disabled={isUpdating}
                      />
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
                        <Input
                          {...field}
                          placeholder="123"
                          disabled={isUpdating}
                        />
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
                        <Input
                          {...field}
                          placeholder="Nome do bairro"
                          disabled={isUpdating}
                        />
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
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Apartamento, bloco, etc. (opcional)"
                        disabled={isUpdating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full mt-6" disabled={isUpdating}>
              {isUpdating ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
