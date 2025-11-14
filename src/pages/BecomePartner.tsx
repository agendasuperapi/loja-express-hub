import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { Store, Rocket, CheckCircle, TrendingUp, Users, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { storeSchema } from "@/hooks/useStoreValidation";
import { z } from "zod";

const categories = [
  "Restaurante",
  "Lanchonete",
  "Pizzaria",
  "Hamburgueria",
  "Japonês",
  "Italiano",
  "Brasileira",
  "Mercado",
  "Padaria",
  "Açougue",
  "Farmácia",
  "Pet Shop",
  "Flores",
  "Outros",
];

const benefits = [
  {
    icon: TrendingUp,
    title: "Aumente suas Vendas",
    description: "Alcance milhares de clientes em sua região",
  },
  {
    icon: Users,
    title: "Gestão Simplificada",
    description: "Dashboard completo para gerenciar pedidos e produtos",
  },
  {
    icon: DollarSign,
    title: "Sem Taxas Iniciais",
    description: "Comece a vender sem custos de adesão",
  },
];

export default function BecomePartner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasRole } = useUserRole();
  const { createStore, isCreating } = useStoreManagement();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    category: "Restaurante",
    address: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    delivery_fee: 5,
    min_order_value: 0,
    avg_delivery_time: 30,
    owner_name: "",
    owner_phone: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSlugGeneration = (name: string) => {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    return slug;
  };

  const sanitizeSlug = (value: string) => {
    // Remove espaços e caracteres inválidos em tempo real
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9-]/g, "") // Permite apenas letras minúsculas, números e hífens
      .replace(/-+/g, "-") // Remove hífens duplicados
      .replace(/^-|-$/g, ""); // Remove hífens no início e fim
  };

  const validateForm = () => {
    try {
      // Validate using zod schema
      storeSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);

        // Scroll to first error and focus the field
        const first = error.errors[0];
        const firstField = first?.path?.[0] ? String(first.path[0]) : undefined;
        if (firstField) {
          setTimeout(() => {
            const el = document.getElementById(firstField);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (el as HTMLInputElement | null)?.focus?.();
          }, 0);
        }

        // Show a specific toast message
        toast({
          title: 'Erro no formulário',
          description: first?.message || 'Por favor, corrija os campos destacados',
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // The validateForm already showed toast and focused the first error
      return;
    }

    createStore(formData, {
      onSuccess: (result: any) => {
        console.log('✅ Resultado do cadastro:', result);
        
        toast({
          title: "Bem-vindo!",
          description: result?.newUserCreated 
            ? "Conta criada e loja ativada! Você já está logado." 
            : "Sua loja foi criada e ativada com sucesso!",
          duration: 5000,
        });
        
        // Aguardar um momento para garantir que o estado do auth foi atualizado
        setTimeout(() => {
          navigate("/dashboard-lojista");
        }, 1000);
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Rocket className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Seja um Parceiro</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            Venda na Nossa Plataforma
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Cadastre sua loja e comece a vender para milhares de clientes
          </p>
        </motion.div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="text-center h-full">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Store className="w-6 h-6" />
                Cadastre sua Loja
              </CardTitle>
              <CardDescription>
                Preencha as informações abaixo para começar a vender
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Owner Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Dados do Proprietário
                  </h3>

                  <div>
                    <Label htmlFor="owner_name">Nome Completo *</Label>
                    <Input
                      id="owner_name"
                      value={formData.owner_name}
                      onChange={(e) =>
                        setFormData({ ...formData, owner_name: e.target.value })
                      }
                      placeholder="Ex: João Silva"
                      className={errors.owner_name ? "border-red-500" : ""}
                    />
                    {errors.owner_name && (
                      <p className="text-sm text-red-500 mt-1">{errors.owner_name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="owner_phone">Telefone do Proprietário *</Label>
                    <PhoneInput
                      id="owner_phone"
                      value={formData.owner_phone}
                      onChange={(value) =>
                        setFormData({ ...formData, owner_phone: value })
                      }
                      className={errors.owner_phone ? "border-red-500" : ""}
                    />
                    {errors.owner_phone && (
                      <p className="text-sm text-red-500 mt-1">{errors.owner_phone}</p>
                    )}
                  </div>
                </div>

                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Informações Básicas
                  </h3>

                  <div>
                    <Label htmlFor="name">Nome da Loja *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setFormData({
                          ...formData,
                          name,
                          slug: handleSlugGeneration(name),
                        });
                      }}
                      placeholder="Ex: Pizzaria Bella Italia"
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="slug">URL da Loja *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        /
                      </span>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => {
                          const sanitized = sanitizeSlug(e.target.value);
                          setFormData({ ...formData, slug: sanitized });
                        }}
                        placeholder="pizzaria-bella-italia"
                        className={errors.slug ? "border-red-500" : ""}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Apenas letras minúsculas, números e hífens
                    </p>
                    {errors.slug && (
                      <p className="text-sm text-red-500 mt-1">{errors.slug}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category">Categoria *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição da Loja</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Conte sobre sua loja e o que a torna especial..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Contact & Location */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Contato e Localização
                  </h3>

                  <div>
                    <Label htmlFor="address">Endereço Completo</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Rua, número, bairro, cidade - UF"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefone da Loja</Label>
                    <PhoneInput
                      id="phone"
                      value={formData.phone}
                      onChange={(value) =>
                        setFormData({ ...formData, phone: value })
                      }
                      className={errors.phone ? "border-red-500" : ""}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* User Account Section - Only if not logged in */}
                {!user && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Dados de Acesso
                    </h3>

                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <EmailInput
                        id="email"
                        value={formData.email}
                        onChange={(value) =>
                          setFormData({ ...formData, email: value })
                        }
                        className={errors.email ? "border-red-500" : ""}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="password">Senha *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          placeholder="Mínimo 6 caracteres"
                          className={errors.password ? "border-red-500" : ""}
                        />
                        {errors.password && (
                          <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, confirmPassword: e.target.value })
                          }
                          placeholder="Repita a senha"
                          className={errors.confirmPassword ? "border-red-500" : ""}
                        />
                        {errors.confirmPassword && (
                          <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Uma conta será criada automaticamente para você acessar o painel de gerenciamento.
                    </p>
                  </div>
                )}


                <Button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-gradient-primary"
                  size="lg"
                >
                  {isCreating ? (
                    "Cadastrando..."
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 mr-2" />
                      Cadastrar Minha Loja
                    </>
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  {!user ? (
                    <>
                      Ao cadastrar você automaticamente cria uma conta e faz login.
                      <br />
                      Já tem uma conta? <a href="/login-lojista" className="text-primary hover:underline">Faça login primeiro</a> ou{" "}
                      <a href="/" className="text-primary hover:underline">entre como cliente</a> e depois cadastre sua loja.
                    </>
                  ) : (
                    <>
                      Você está logado como <strong>{user.email}</strong>.
                      <br />
                      Sua loja será vinculada à sua conta atual.
                    </>
                  )}
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
