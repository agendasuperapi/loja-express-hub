import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { useCoupons } from "@/hooks/useCoupons";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, Trash2, ShoppingBag, Clock, Store, Pencil, ArrowLeft, Package, Tag, X, Loader2, Search, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { isStoreOpen, getStoreStatusText } from "@/lib/storeUtils";
import { EditCartItemDialog } from "@/components/cart/EditCartItemDialog";
import { normalizePhone } from "@/lib/phone";
import { fetchCepData, formatCep, isValidCepFormat } from "@/lib/cepValidation";

export default function Cart() {
  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();
  const { cart, updateQuantity, removeFromCart, getTotal, clearCart, updateCartItem, applyCoupon, removeCoupon } = useCart();
  const { createOrder, isCreating, orders } = useOrders();
  const { validateCoupon } = useCoupons(cart.storeId || undefined);
  const { zones: deliveryZones } = useDeliveryZones(cart.storeId || undefined);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [couponInput, setCouponInput] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  
  const [lastStore, setLastStore] = useState<{ slug: string; name: string } | null>(null);
  
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryCep, setDeliveryCep] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryComplement, setDeliveryComplement] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao'>('pix');
  const [changeAmount, setChangeAmount] = useState("");
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup' | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailExistsAlert, setShowEmailExistsAlert] = useState(false);
  
  const [storeData, setStoreData] = useState<any>(null);
  const deliveryTypeRef = useRef<HTMLDivElement>(null);
  const cartItemsRef = useRef<HTMLDivElement>(null);

  // Reset email exists alert when email changes
  useEffect(() => {
    setShowEmailExistsAlert(false);
  }, [authEmail]);
  const storeIsOpen = storeData ? isStoreOpen(storeData.operating_hours) : true;
  const storeStatusText = storeData ? getStoreStatusText(storeData.operating_hours) : '';
  const allowOrdersWhenClosed = (storeData as any)?.allow_orders_when_closed ?? false;
  const canAcceptOrders = storeIsOpen || allowOrdersWhenClosed;
  const isScheduledOrder = !storeIsOpen && allowOrdersWhenClosed;

  // Calculate delivery fee based on city from delivery zones
  const calculateDeliveryFee = () => {
    if (!deliveryCity || !deliveryZones) return storeData?.delivery_fee || 5;
    
    const normalizedCity = deliveryCity.trim().toUpperCase();
    const zone = deliveryZones.find(z => 
      z.city.trim().toUpperCase() === normalizedCity && z.is_active
    );
    
    return zone ? zone.delivery_fee : storeData?.delivery_fee || 5;
  };
  
  const storeDeliveryFee = deliveryType === 'delivery' ? calculateDeliveryFee() : 0;

  // Auto-advance to step 2 if user is already logged in
  useEffect(() => {
    if (user) {
      setCurrentStep(2);
    }
  }, [user]);

  // Scroll to cart items section when reaching step 2 (optimized for mobile)
  useEffect(() => {
    if (currentStep === 2 && cartItemsRef.current) {
      setTimeout(() => {
        const element = cartItemsRef.current;
        if (element) {
          // Get element position
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - 80; // 80px offset for better visibility
          
          // Smooth scroll with offset
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 300);
    }
  }, [currentStep]);

  // Load last visited store from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lastVisitedStore');
    if (stored) {
      setLastStore(JSON.parse(stored));
    }
  }, []);

  // Load store data
  useEffect(() => {
    const loadStoreData = async () => {
      if (cart.storeId) {
        const { data } = await supabase
          .from('stores')
          .select('operating_hours, name, accepts_delivery, accepts_pickup, delivery_fee, accepts_pix, accepts_card, accepts_cash, pickup_address, address, allow_orders_when_closed')
          .eq('id', cart.storeId)
          .single();
        
        if (data) {
          setStoreData(data);
          
          // Remove auto-selection - user must choose delivery type manually
          
          // Set default payment method based on what store accepts
          const acceptsPix = (data as any).accepts_pix ?? true;
          const acceptsCard = (data as any).accepts_card ?? true;
          const acceptsCash = (data as any).accepts_cash ?? true;

          if (acceptsPix) {
            setPaymentMethod('pix');
          } else if (acceptsCard) {
            setPaymentMethod('cartao');
          } else if (acceptsCash) {
            setPaymentMethod('dinheiro');
          }
        }
      }
    };
    
    loadStoreData();
  }, [cart.storeId]);

  // Load user profile data when logged in
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, phone, cep, city, street, street_number, neighborhood, complement')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile:', error);
          return;
        }

        if (profile) {
          console.log('📋 Carregando perfil do usuário:', profile);
          
          setCustomerName(profile.full_name || "");
          setCustomerPhone(profile.phone || "");
          
          // Format CEP with hyphen if it exists
          if (profile.cep) {
            const formattedCep = formatCep(profile.cep);
            console.log('📍 CEP carregado:', profile.cep, '-> formatado:', formattedCep);
            setDeliveryCep(formattedCep);
          }
          
          // Load city
          if (profile.city) {
            console.log('🏙️ Cidade carregada:', profile.city);
            setDeliveryCity(profile.city);
          }
          
          setDeliveryStreet(profile.street || "");
          setDeliveryNumber(profile.street_number || "");
          setDeliveryNeighborhood(profile.neighborhood || "");
          setDeliveryComplement(profile.complement || "");
        }
        
        // Set email from user auth data
        if (user.email) {
          setCustomerEmail(user.email);
        }
      }
    };

    loadUserProfile();
  }, [user]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast({
        title: "Cupom inválido",
        description: "Digite um código de cupom",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingCoupon(true);
    
    try {
      const subtotal = getTotal();
      const result = await validateCoupon(couponInput.trim().toUpperCase(), subtotal);
      
      if (result.is_valid && result.discount_amount > 0) {
        applyCoupon(couponInput.trim().toUpperCase(), result.discount_amount);
        setCouponInput("");
        toast({
          title: "Cupom aplicado!",
          description: `Você ganhou R$ ${result.discount_amount.toFixed(2)} de desconto`,
        });
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      toast({
        title: "Erro ao validar cupom",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast({
      title: "Cupom removido",
      description: "O desconto foi removido do seu pedido",
    });
  };

  const deliveryFee = deliveryType === 'pickup' ? 0 : storeDeliveryFee;
  const subtotal = getTotal();
  const total = Math.max(0, subtotal + deliveryFee - (cart.couponDiscount || 0));

  // Handle CEP search
  const handleCepSearch = async () => {
    if (!deliveryCep || !isValidCepFormat(deliveryCep)) {
      setCepError("CEP inválido. Use o formato: 12345-678");
      return;
    }

    setIsSearchingCep(true);
    setCepError("");

    try {
      const data = await fetchCepData(deliveryCep);
      
      if (data) {
        setDeliveryCity(data.localidade);
        setDeliveryNeighborhood(data.bairro || "");
        setDeliveryStreet(data.logradouro || "");
        
        toast({
          title: "CEP encontrado!",
          description: `${data.localidade} - ${data.uf}`,
        });
      } else {
        setCepError("CEP não encontrado");
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP e tente novamente",
          variant: "destructive",
        });
      }
    } catch (error) {
      setCepError("Erro ao buscar CEP");
      toast({
        title: "Erro",
        description: "Erro ao consultar o CEP. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    setDeliveryCep(formatted);
    setCepError("");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);

    try {
      if (authMode === 'signup') {
        if (!authEmail || !authPassword || !authFullName || !authPhone) {
          toast({
            title: "Campos obrigatórios",
            description: "Preencha todos os campos para criar sua conta",
            variant: "destructive",
          });
          setIsAuthLoading(false);
          return;
        }

        const { error } = await signUp(authEmail, authPassword, authFullName, authPhone, true);

        if (error) {
          if (error.message.includes('already') || error.message.includes('exists') || error.message.includes('registered')) {
            setAuthMode('login');
            setAuthPassword("");
            setShowEmailExistsAlert(true);
            setIsAuthLoading(false);
            return;
          }
          
          toast({
            title: "Erro ao criar conta",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Conta criada com sucesso!",
            description: "Agora preencha seus dados para continuar",
          });
          // Avançar para Step 2 após signup
          setTimeout(() => setCurrentStep(2), 500);
        }
      } else {
        if (!authEmail || !authPassword) {
          toast({
            title: "Campos obrigatórios",
            description: "Preencha email e senha para fazer login",
            variant: "destructive",
          });
          setIsAuthLoading(false);
          return;
        }

        const { error } = await signIn(authEmail, authPassword, true);

        if (error) {
          toast({
            title: "Erro ao fazer login",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login realizado!",
            description: "Agora preencha seus dados para continuar",
          });
          // Avançar para Step 2 após login
          setTimeout(() => setCurrentStep(2), 500);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      toast({
        title: "Erro",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsAuthLoading(false);
    }
  };



  const handleNextStep = () => {
    if (!customerName || !customerEmail || !customerPhone) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos para continuar.",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep(2);
  };

  const handleCheckout = async () => {
    // 🔒 PROTEÇÃO DUPLA contra múltiplos cliques
    if (isSubmitting || isCreating) {
      console.warn("⚠️ Checkout já em andamento, ignorando clique");
      return;
    }
    
    console.log("🚀 Iniciando checkout...");
    setIsSubmitting(true);

    try {
      if (!user) {
        toast({
          title: "Login necessário",
          description: "Por favor, faça login para finalizar o pedido",
          variant: "destructive",
        });
        setCurrentStep(1);
        return;
      }
  
      if (!canAcceptOrders) {
        toast({
          title: "Pedidos não disponíveis",
          description: `Não é possível finalizar pedidos. ${storeStatusText}`,
          variant: "destructive",
        });
        return;
      }
  
      if (!deliveryType) {
        deliveryTypeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast({
          title: "Tipo de entrega não selecionado",
          description: "Por favor, selecione se deseja entrega ou retirada na loja.",
          variant: "destructive",
        });
        return;
      }
  
      if (deliveryType === 'delivery' && (!deliveryCep || !deliveryCity || !deliveryStreet || !deliveryNumber || !deliveryNeighborhood)) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios de entrega, incluindo CEP e cidade.",
          variant: "destructive",
        });
        return;
      }
  
      // Update user profile with current data
      const cleanedCep = deliveryType === 'delivery' && deliveryCep 
        ? deliveryCep.replace(/\D/g, '') 
        : null;
      
      const profileData = {
        full_name: customerName,
        phone: normalizePhone(customerPhone),
        cep: cleanedCep,
        city: deliveryType === 'delivery' ? deliveryCity.trim() : null,
        street: deliveryType === 'delivery' ? deliveryStreet : null,
        street_number: deliveryType === 'delivery' ? deliveryNumber : null,
        neighborhood: deliveryType === 'delivery' ? deliveryNeighborhood : null,
        complement: deliveryType === 'delivery' ? deliveryComplement : null,
      };
      
      console.log('💾 Salvando perfil do usuário:', profileData);
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);
  
      if (profileError) {
        console.error('Profile update error:', profileError);
        toast({
          title: "Erro ao atualizar perfil",
          description: profileError.message,
          variant: "destructive",
        });
        return;
      }
  
      // Create order
      try {
        // Auto-aplicar cupom no submit caso o usuário tenha digitado mas não clicado em "Aplicar"
        if (couponInput.trim() && !cart.couponCode) {
          try {
            const result = await validateCoupon(couponInput.trim().toUpperCase(), getTotal());
            if (result.is_valid && result.discount_amount > 0) {
              applyCoupon(couponInput.trim().toUpperCase(), result.discount_amount);
            }
          } catch (e) {
            console.warn("⚠️ Falha ao validar cupom no submit:", e);
          }
        }

        console.log("📦 Criando pedido com cupom:", {
          couponCode: cart.couponCode,
          couponDiscount: cart.couponDiscount
        });
        
        await createOrder({
          storeId: cart.storeId!,
          items: cart.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.promotionalPrice || item.price,
            observation: item.observation || undefined,
            addons: Array.isArray(item.addons) 
              ? item.addons
                  .filter(addon => addon && addon.name && typeof addon.price === 'number')
                  .map(addon => ({
                    name: String(addon.name),
                    price: Number(addon.price),
                  }))
              : [],
            flavors: Array.isArray(item.flavors)
              ? item.flavors
                  .filter(flavor => flavor && flavor.name && typeof flavor.price === 'number')
                  .map(flavor => ({
                    name: String(flavor.name),
                    price: Number(flavor.price),
                  }))
              : [],
          })),
          customerName,
          customerPhone,
          deliveryType: deliveryType!,
          deliveryStreet: deliveryType === 'delivery' ? (deliveryStreet || undefined) : undefined,
          deliveryNumber: deliveryType === 'delivery' ? (deliveryNumber || undefined) : undefined,
          deliveryNeighborhood: deliveryType === 'delivery' ? (deliveryNeighborhood || undefined) : undefined,
          deliveryComplement: deliveryType === 'delivery' ? (deliveryComplement || undefined) : undefined,
          paymentMethod,
          changeAmount: paymentMethod === 'dinheiro' && changeAmount ? Number(parseFloat(changeAmount)) : undefined,
          couponCode: cart.couponCode || undefined,
          couponDiscount: cart.couponDiscount || undefined,
        });
  
        console.log('✅ Order created successfully, clearing cart...');
        
        // Clear cart and navigate after successful order
        clearCart();
        console.log('🗑️ Cart cleared successfully');
        
        // Small delay to ensure state updates
        setTimeout(() => {
          console.log('➡️ Navigating to orders page...');
          navigate('/orders');
        }, 100);
        
      } catch (error) {
        console.error('❌ Order creation failed:', error);
        // Error toast is already shown by the mutation
      }
    } finally {
      console.log("🔓 Liberando checkout...");
      setIsSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-4 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Seu carrinho está vazio</h2>
            <p className="text-muted-foreground mb-6">
              Adicione produtos ao carrinho para continuar
            </p>
            {lastStore && (
              <Button
                onClick={() => navigate(`/${lastStore.slug}`)}
                className="bg-gradient-primary"
              >
                <Store className="w-4 h-4 mr-2" />
                Voltar para {lastStore.name}
              </Button>
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => {
              if (cart.storeSlug) {
                navigate(`/${cart.storeSlug}`);
              } else {
                navigate('/');
              }
            }}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <h1 className="text-4xl font-bold gradient-text mb-2">Meu Carrinho</h1>
          <p className="text-muted-foreground">
            {cart.storeName}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div ref={cartItemsRef} className="lg:col-span-2 space-y-4">
            <Button
              variant="outline"
              onClick={() => {
                console.log('🔍 Navegando para loja, storeSlug:', cart.storeSlug);
                if (cart.storeSlug) {
                  navigate(`/${cart.storeSlug}`);
                } else {
                  console.error('❌ storeSlug não encontrado no carrinho');
                  navigate('/');
                }
              }}
              className="gap-2 w-full"
            >
              <Plus className="w-4 h-4" />
              Adicionar Mais Produtos
            </Button>
            {cart.items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{item.productName}</h3>
                        {item.flavors && item.flavors.length > 0 && (
                          <div className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium">Sabores:</span>
                            {item.flavors.map((flavor, idx) => (
                              <div key={idx} className="flex justify-between ml-2">
                                <span>• {flavor.name}</span>
                                {flavor.price > 0 && (
                                  <span>R$ {flavor.price.toFixed(2)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {item.addons && item.addons.length > 0 && (
                          <div className="text-sm text-muted-foreground mb-2">
                            {item.addons.map((addon, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>+ {addon.name}</span>
                                <span>R$ {addon.price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.observation && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Obs: {item.observation}
                          </p>
                        )}
                        <p className="text-lg font-bold text-primary mb-2">
                          R$ {(item.promotionalPrice || item.price).toFixed(2)}
                          {(item.addons && item.addons.length > 0) || (item.flavors && item.flavors.length > 0) ? (
                            <span className="text-sm text-muted-foreground ml-2">
                              + R$ {(
                                (item.addons?.reduce((sum, addon) => sum + addon.price, 0) || 0) +
                                (item.flavors?.reduce((sum, flavor) => sum + flavor.price, 0) || 0)
                              ).toFixed(2)}
                            </span>
                          ) : null}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingItem(item)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Checkout Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-6">
                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className={`flex flex-col items-center ${
                    currentStep === 1 ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                      currentStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      1
                    </div>
                    <span className="text-xs mt-1">Login</span>
                  </div>
                  <div className={`h-1 w-12 ${currentStep === 2 ? 'bg-primary' : 'bg-muted'}`} />
                  <div className={`flex flex-col items-center ${
                    currentStep === 2 ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                      currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      2
                    </div>
                    <span className="text-xs mt-1">Finalizar</span>
                  </div>
                </div>

                {/* Step 1: Authentication Only */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-xl font-bold mb-4">
                        {authMode === 'login' ? 'Fazer Login' : 'Criar Conta'}
                      </h3>
                      
                      <form onSubmit={handleAuthSubmit} className="space-y-4">
                        {authMode === 'signup' && (
                          <>
                            <div>
                              <Label htmlFor="auth-name">Nome Completo *</Label>
                              <Input
                                id="auth-name"
                                value={authFullName}
                                onChange={(e) => setAuthFullName(e.target.value)}
                                placeholder="Seu nome completo"
                                required
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="auth-phone">Telefone *</Label>
                              <PhoneInput
                                id="auth-phone"
                                value={authPhone}
                                onChange={setAuthPhone}
                              />
                            </div>
                          </>
                        )}
                        
                        {showEmailExistsAlert && (
                          <Alert variant="destructive">
                            <AlertDescription className="text-center">
                              <p className="font-bold">E-mail já cadastrado,</p>
                              <p className="font-bold mt-1">Digite sua senha e faça Login.</p>
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        <div>
                          <Label htmlFor="auth-email">Email *</Label>
                          <Input
                            id="auth-email"
                            type="email"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="auth-password">Senha *</Label>
                            {authMode === 'login' && (
                              <Link
                                to="/forgot-password"
                                className="text-xs text-primary hover:underline"
                              >
                                Esqueci minha senha
                              </Link>
                            )}
                          </div>
                          <Input
                            id="auth-password"
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-gradient-primary"
                          size="lg"
                          disabled={isAuthLoading}
                        >
                          {isAuthLoading 
                            ? 'Aguarde...' 
                            : authMode === 'login' 
                              ? 'Entrar' 
                              : 'Criar Conta'}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setAuthMode(authMode === 'login' ? 'signup' : 'login');
                            setAuthPassword("");
                            setShowEmailExistsAlert(false);
                          }}
                        >
                          {authMode === 'login' 
                            ? 'Não tem conta? Cadastre-se' 
                            : 'Já tem conta? Faça login'}
                        </Button>
                      </form>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Delivery & Payment */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Customer Data Section */}
                    <div>
                      <h3 className="text-xl font-bold mb-4">Dados do Cliente</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name-step2">Nome Completo *</Label>
                          <Input
                            id="name-step2"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Seu nome"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="email-step2">Email *</Label>
                          <Input
                            id="email-step2"
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                            disabled
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="phone-step2">Telefone *</Label>
                          <PhoneInput
                            id="phone-step2"
                            value={customerPhone}
                            onChange={setCustomerPhone}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Delivery Type and Address Section */}
                    <div ref={deliveryTypeRef}>
                      <h3 className="text-xl font-bold mb-4">Tipo de Entrega</h3>
                      
                      {(!storeData || (!(storeData as any).accepts_delivery && !(storeData as any).accepts_pickup)) && (
                        <Alert>
                          <AlertDescription>
                            Esta loja não possui opções de entrega configuradas. Entre em contato com a loja.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        {((storeData as any)?.accepts_pickup ?? true) && (
                          <button
                            type="button"
                            onClick={() => setDeliveryType('pickup')}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              deliveryType === 'pickup'
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Store className="w-6 h-6 mx-auto mb-2" />
                            <div className="font-semibold">Retirar na Loja</div>
                            <div className="text-xs text-muted-foreground">Grátis</div>
                          </button>
                        )}
                        
                        {((storeData as any)?.accepts_delivery ?? true) && (
                          <button
                            type="button"
                            onClick={() => setDeliveryType('delivery')}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              deliveryType === 'delivery'
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Package className="w-6 h-6 mx-auto mb-2" />
                            <div className="font-semibold">Entrega</div>
                            <div className="text-xs text-muted-foreground">
                              R$ {storeDeliveryFee.toFixed(2)}
                            </div>
                          </button>
                        )}
                      </div>

                      {deliveryType === 'pickup' && (
                        <Alert className="mb-6">
                          <Store className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-semibold mb-1">Endereço para retirada:</div>
                            <div className="text-sm">
                              {(storeData as any)?.pickup_address || (storeData as any)?.address || 'Endereço não disponível'}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {deliveryType === 'delivery' && (
                        <>
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="text-lg font-semibold">Endereço de Entrega</h3>
                              <Badge variant="outline" className="text-xs">
                                * Obrigatório
                              </Badge>
                            </div>
                            
                            <Alert>
                              <MapPin className="h-4 w-4" />
                              <AlertDescription className="text-sm">
                                Preencha seu endereço completo para calcularmos o frete
                              </AlertDescription>
                            </Alert>

                            {/* CEP Field */}
                            <div>
                              <Label htmlFor="cep" className="text-sm font-medium">
                                CEP <span className="text-destructive">*</span>
                              </Label>
                              <div className="flex gap-2 mt-1.5">
                                <Input
                                  id="cep"
                                  value={deliveryCep}
                                  onChange={(e) => handleCepChange(e.target.value)}
                                  placeholder="00000-000"
                                  maxLength={9}
                                  required
                                  className={cepError ? "border-destructive" : ""}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={handleCepSearch}
                                  disabled={isSearchingCep || !deliveryCep}
                                  title="Buscar CEP"
                                >
                                  {isSearchingCep ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Search className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              {cepError && (
                                <p className="text-sm text-destructive mt-1.5">{cepError}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1.5">
                                Digite o CEP e clique em buscar para preencher automaticamente
                              </p>
                            </div>

                            {/* City and Neighborhood in same row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="city" className="text-sm font-medium">
                                  Cidade <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="city"
                                  value={deliveryCity}
                                  onChange={(e) => setDeliveryCity(e.target.value)}
                                  placeholder="Ex: São Paulo"
                                  required
                                  maxLength={100}
                                  className="mt-1.5"
                                />
                              </div>

                              <div>
                                <Label htmlFor="neighborhood" className="text-sm font-medium">
                                  Bairro <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="neighborhood"
                                  value={deliveryNeighborhood}
                                  onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                                  placeholder="Ex: Centro"
                                  required
                                  maxLength={100}
                                  className="mt-1.5"
                                />
                              </div>
                            </div>

                            {/* Street Field */}
                            <div>
                              <Label htmlFor="street" className="text-sm font-medium">
                                Rua/Avenida <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="street"
                                value={deliveryStreet}
                                onChange={(e) => setDeliveryStreet(e.target.value)}
                                placeholder="Ex: Rua das Flores"
                                required
                                className="mt-1.5"
                              />
                            </div>
                            
                            {/* Number and Complement */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="number" className="text-sm font-medium">
                                  Número <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="number"
                                  value={deliveryNumber}
                                  onChange={(e) => setDeliveryNumber(e.target.value)}
                                  placeholder="Ex: 123"
                                  required
                                  className="mt-1.5"
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="complement" className="text-sm font-medium">
                                  Complemento
                                </Label>
                                <Input
                                  id="complement"
                                  value={deliveryComplement}
                                  onChange={(e) => setDeliveryComplement(e.target.value)}
                                  placeholder="Apto, Bloco..."
                                  className="mt-1.5"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {deliveryType === 'pickup' && (
                        <Alert className="mb-4">
                          <Store className="h-4 w-4" />
                          <AlertDescription>
                            Você poderá retirar seu pedido diretamente na loja após a confirmação.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <Separator />

                    {/* Payment Section */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="payment">Forma de Pagamento *</Label>
                        <Select value={paymentMethod} onValueChange={(value: 'pix' | 'dinheiro' | 'cartao') => setPaymentMethod(value)}>
                          <SelectTrigger id="payment">
                            <SelectValue placeholder="Selecione a forma de pagamento" />
                          </SelectTrigger>
                          <SelectContent>
                            {((storeData as any)?.accepts_pix ?? true) && (
                              <SelectItem value="pix">PIX</SelectItem>
                            )}
                            {((storeData as any)?.accepts_card ?? true) && (
                              <SelectItem value="cartao">Cartão</SelectItem>
                            )}
                            {((storeData as any)?.accepts_cash ?? true) && (
                              <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {paymentMethod === 'dinheiro' && (
                        <div>
                          <Label htmlFor="change">Troco para quanto? (opcional)</Label>
                          <Input
                            id="change"
                            type="number"
                            step="0.01"
                            value={changeAmount}
                            onChange={(e) => setChangeAmount(e.target.value)}
                            placeholder="R$ 50,00"
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="notes">Observações (opcional)</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Alguma observação sobre seu pedido?"
                          rows={3}
                        />
                      </div>

                      {/* Cupom de Desconto */}
                      <div>
                        <Label htmlFor="coupon">Cupom de Desconto (opcional)</Label>
                        {cart.couponCode ? (
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                            <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="font-mono font-semibold text-green-700 dark:text-green-300">
                              {cart.couponCode}
                            </span>
                            <Badge variant="secondary" className="ml-auto">
                              -R$ {cart.couponDiscount.toFixed(2)}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleRemoveCoupon}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              id="coupon"
                              value={couponInput}
                              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                              placeholder="Digite o código do cupom"
                              maxLength={20}
                              disabled={isValidatingCoupon}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleApplyCoupon();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleApplyCoupon}
                              disabled={isValidatingCoupon || !couponInput.trim()}
                            >
                              {isValidatingCoupon ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Validando...
                                </>
                              ) : (
                                <>
                                  <Tag className="w-4 h-4 mr-2" />
                                  Aplicar
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>R$ {subtotal.toFixed(2)}</span>
                      </div>
                      {deliveryType !== 'pickup' && (
                        <div className="flex justify-between text-sm">
                          <span>Taxa de entrega</span>
                          <span>R$ {deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                      {cart.couponDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Desconto do Cupom
                          </span>
                          <span>-R$ {cart.couponDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">R$ {total.toFixed(2)}</span>
                      </div>
                    </div>

                    {!canAcceptOrders && storeData && (
                      <Alert variant="destructive">
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{storeData.name} está fechada.</strong> {storeStatusText}. Você pode adicionar itens ao carrinho, mas não poderá finalizar o pedido até que a loja esteja disponível para receber pedidos.
                        </AlertDescription>
                      </Alert>
                    )}

                    {!storeIsOpen && canAcceptOrders && storeData && (
                      <Alert className="border-amber-500 bg-amber-500/10">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <AlertDescription className="text-amber-700 dark:text-amber-400">
                          <div className="space-y-1">
                            <p><strong>📅 Pedido Agendado</strong></p>
                            <p className="text-sm">A loja está fechada no momento. Seu pedido será processado assim que a loja abrir.</p>
                            <p className="text-sm font-medium">{storeStatusText}</p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-primary"
                        size="lg"
                        onClick={handleCheckout}
                        disabled={
                          !canAcceptOrders || 
                          isCreating || 
                          isSubmitting ||
                          !customerName ||
                          !customerPhone ||
                          (deliveryType === 'delivery' && (!deliveryStreet || !deliveryNumber || !deliveryNeighborhood))
                        }
                      >
                        {!canAcceptOrders 
                          ? 'Pedidos Indisponíveis' 
                          : !storeIsOpen && canAcceptOrders
                            ? '📅 Agendar Pedido'
                            : isCreating 
                              ? 'Finalizando...' 
                              : 'Finalizar Pedido'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      
      {/* Edit Item Dialog */}
      {editingItem && (
        <EditCartItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onUpdate={updateCartItem}
        />
      )}
    </div>
  );
}
