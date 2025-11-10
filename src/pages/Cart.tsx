import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
import { useCart } from "@/contexts/CartContext";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, Trash2, ShoppingBag, Clock, Store, Pencil, ArrowLeft, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { isStoreOpen, getStoreStatusText } from "@/lib/storeUtils";
import { EditCartItemDialog } from "@/components/cart/EditCartItemDialog";
import { LoginModal } from "@/components/auth/LoginModal";

export default function Cart() {
  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();
  const { cart, updateQuantity, removeFromCart, getTotal, clearCart, updateCartItem } = useCart();
  const { createOrder, isCreating, orders } = useOrders();
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [lastStore, setLastStore] = useState<{ slug: string; name: string } | null>(null);
  
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryComplement, setDeliveryComplement] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao'>('pix');
  const [changeAmount, setChangeAmount] = useState("");
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [pendingOrderAfterSignup, setPendingOrderAfterSignup] = useState(false);
  const [pendingOrderAfterLogin, setPendingOrderAfterLogin] = useState(false);
  const [authModalEmail, setAuthModalEmail] = useState("");
  const [authModalFullName, setAuthModalFullName] = useState("");
  const [authModalPhone, setAuthModalPhone] = useState("");
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>(undefined);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | undefined>(undefined);
  
  const [storeData, setStoreData] = useState<any>(null);
  const storeIsOpen = storeData ? isStoreOpen(storeData.operating_hours) : true;
  const storeStatusText = storeData ? getStoreStatusText(storeData.operating_hours) : '';

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
          .select('operating_hours, name')
          .eq('id', cart.storeId)
          .single();
        
        if (data) {
          setStoreData(data);
        }
      }
    };
    
    loadStoreData();
  }, [cart.storeId]);

  // Load user profile data when logged in
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, street, street_number, neighborhood, complement')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setCustomerName(profile.full_name || "");
          setCustomerPhone(profile.phone || "");
          setDeliveryStreet(profile.street || "");
          setDeliveryNumber(profile.street_number || "");
          setDeliveryNeighborhood(profile.neighborhood || "");
          setDeliveryComplement(profile.complement || "");
        }
        
        // Set email from user auth data
        if (user.email) {
          setCustomerEmail(user.email);
        }

        // If there's a pending order after signup or login, finalize it
        if (pendingOrderAfterSignup) {
          setPendingOrderAfterSignup(false);
          handleCheckout();
        } else if (pendingOrderAfterLogin) {
          setPendingOrderAfterLogin(false);
          handleCheckout();
        }
      }
    };

    loadUserProfile();
  }, [user, pendingOrderAfterSignup, pendingOrderAfterLogin]);

  const deliveryFee = deliveryType === 'pickup' ? 0 : 5;
  const total = getTotal() + deliveryFee;

  const handleModalSignUp = async (email: string, password: string, fullName: string, phone: string) => {
    setIsAuthLoading(true);

    try {
      // Tentar criar conta
      const { error } = await signUp(email, password, fullName, phone, true);

      if (error) {
        // Se o erro for que o usuário já existe, redirecionar para login
        if (error.message.includes('already') || error.message.includes('exists') || error.message.includes('registered')) {
          setAuthModalEmail(email);
          setAuthModalFullName("");
          setAuthModalPhone("");
          setAuthModalMessage("Esse email já possui cadastro, efetue login para finalizar");
          setAuthModalMode('login');
          toast({
            title: "Email já cadastrado",
            description: "Redirecionando para login...",
          });
          setIsAuthLoading(false);
          return;
        }
        
        // Outros erros
        toast({
          title: "Erro ao criar conta",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conta criada com sucesso!",
          description: "Finalizando seu pedido...",
        });
        setShowAuthDialog(false);
        setPendingOrderAfterSignup(true);
      }
    } catch (err: any) {
      // Capturar qualquer outro erro
      console.error('Signup error:', err);
      toast({
        title: "Erro ao criar conta",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleModalSignIn = async (email: string, password: string) => {
    setIsAuthLoading(true);

    try {
      const { error } = await signIn(email, password, true);

      if (error) {
        toast({
          title: "Erro ao fazer login",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login realizado!",
          description: "Finalizando seu pedido...",
        });
        setShowAuthDialog(false);
        setPendingOrderAfterLogin(true);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      // Verificar campos obrigatórios antes de continuar
      if (!customerName || !customerEmail || !customerPhone) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha nome, email e telefone antes de continuar.",
          variant: "destructive",
        });
        return;
      }

      // Verificar se o email já existe no sistema
      try {
        const { data, error } = await supabase.functions.invoke('check-email-exists', {
          body: { email: customerEmail }
        });
        
        if (!error && data?.exists) {
          // Email já existe - abrir modal em modo signup para mostrar botão "Já tem conta? Faça login"
          setAuthModalEmail(customerEmail);
          setAuthModalFullName(customerName);
          setAuthModalPhone(customerPhone);
          setAuthModalMessage("Esse email já possui cadastro, efetue login para finalizar");
          setAuthModalMode('signup');
          setShowAuthDialog(true);
          return;
        } else {
          // Email não existe - direcionar para cadastro com dados preenchidos
          setAuthModalEmail(customerEmail);
          setAuthModalFullName(customerName);
          setAuthModalPhone(customerPhone);
          setAuthModalMessage(undefined);
          setAuthModalMode('signup');
          setShowAuthDialog(true);
          return;
        }
      } catch (error) {
        console.error('Error checking email:', error);
        // Se edge function falhar, apenas abrir modal de signup
        // O tratamento de email existente será feito no handleModalSignUp
        setAuthModalEmail(customerEmail);
        setAuthModalFullName(customerName);
        setAuthModalPhone(customerPhone);
        setAuthModalMessage(undefined);
        setAuthModalMode('signup');
        setShowAuthDialog(true);
        return;
      }
    }

    if (!storeIsOpen) {
      toast({
        title: "Loja fechada",
        description: `Não é possível finalizar pedidos. ${storeStatusText}`,
        variant: "destructive",
      });
      return;
    }

    if (deliveryType === 'delivery' && (!deliveryStreet || !deliveryNumber || !deliveryNeighborhood)) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios de entrega.",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting checkout process...');
    
    // Update user profile with current data
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: customerName,
        phone: customerPhone,
        street: deliveryType === 'delivery' ? deliveryStreet : null,
        street_number: deliveryType === 'delivery' ? deliveryNumber : null,
        neighborhood: deliveryType === 'delivery' ? deliveryNeighborhood : null,
        complement: deliveryType === 'delivery' ? deliveryComplement : null,
      })
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

    console.log('Profile updated, creating order...');

    // Create order
    try {
      await createOrder({
        storeId: cart.storeId!,
        items: cart.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.promotionalPrice || item.price,
          observation: item.observation,
          addons: item.addons,
        })),
        customerName,
        customerPhone,
        deliveryType,
        deliveryStreet: deliveryType === 'delivery' ? deliveryStreet : '',
        deliveryNumber: deliveryType === 'delivery' ? deliveryNumber : '',
        deliveryNeighborhood: deliveryType === 'delivery' ? deliveryNeighborhood : '',
        deliveryComplement: deliveryType === 'delivery' ? deliveryComplement : '',
        notes,
        paymentMethod,
        changeAmount: paymentMethod === 'dinheiro' && changeAmount ? parseFloat(changeAmount) : undefined,
      });

      console.log('Order created successfully, clearing cart...');
      
      // Clear cart and navigate after successful order
      clearCart();
      console.log('Cart cleared successfully');
      
      // Small delay to ensure state updates
      setTimeout(() => {
        console.log('Navigating to orders page...');
        navigate('/orders');
      }, 100);
      
    } catch (error) {
      console.error('Order creation failed:', error);
      // Error toast is already shown by the mutation
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-4 md:pt-24 pb-12">
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
      
      <main className="container mx-auto px-4 pt-4 md:pt-24 pb-12">
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
          <div className="lg:col-span-2 space-y-4">
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
                          {item.addons && item.addons.length > 0 && (
                            <span className="text-sm text-muted-foreground ml-2">
                              + R$ {item.addons.reduce((sum, addon) => sum + addon.price, 0).toFixed(2)}
                            </span>
                          )}
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
                <div>
                  <h3 className="text-xl font-bold mb-4">Tipo de Entrega</h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
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
                      <div className="text-xs text-muted-foreground">R$ 5,00</div>
                    </button>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-4">Dados do Cliente</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <EmailInput
                        id="email"
                        value={customerEmail}
                        onChange={setCustomerEmail}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Telefone *</Label>
                      <PhoneInput
                        id="phone"
                        value={customerPhone}
                        onChange={setCustomerPhone}
                      />
                    </div>
                    
                    {deliveryType === 'delivery' && (
                      <>
                        <Separator className="my-4" />
                        <h3 className="text-lg font-semibold mb-4">Endereço de Entrega</h3>
                        
                        <div>
                          <Label htmlFor="street">Rua *</Label>
                          <Input
                            id="street"
                            value={deliveryStreet}
                            onChange={(e) => setDeliveryStreet(e.target.value)}
                            placeholder="Nome da rua"
                            required
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="number">Número *</Label>
                            <Input
                              id="number"
                              value={deliveryNumber}
                              onChange={(e) => setDeliveryNumber(e.target.value)}
                              placeholder="123"
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="neighborhood">Bairro *</Label>
                            <Input
                              id="neighborhood"
                              value={deliveryNeighborhood}
                              onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                              placeholder="Nome do bairro"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="complement">Complemento (opcional)</Label>
                          <Input
                            id="complement"
                            value={deliveryComplement}
                            onChange={(e) => setDeliveryComplement(e.target.value)}
                            placeholder="Apto, bloco, etc."
                          />
                        </div>
                      </>
                    )}
                    
                    {deliveryType === 'pickup' && (
                      <Alert>
                        <Store className="h-4 w-4" />
                        <AlertDescription>
                          Você poderá retirar seu pedido diretamente na loja após a confirmação.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div>
                      <Label htmlFor="payment">Forma de Pagamento *</Label>
                      <Select value={paymentMethod} onValueChange={(value: 'pix' | 'dinheiro' | 'cartao') => setPaymentMethod(value)}>
                        <SelectTrigger id="payment">
                          <SelectValue placeholder="Selecione a forma de pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cartao">Cartão</SelectItem>
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
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>R$ {getTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{deliveryType === 'pickup' ? 'Retirada' : 'Taxa de entrega'}</span>
                    <span>{deliveryType === 'pickup' ? 'Grátis' : `R$ ${deliveryFee.toFixed(2)}`}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                {!storeIsOpen && storeData && (
                  <Alert variant="destructive">
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{storeData.name} está fechada.</strong> {storeStatusText}. Você pode adicionar itens ao carrinho, mas não poderá finalizar o pedido até que a loja abra.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full bg-gradient-primary"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={
                    !storeIsOpen || 
                    isCreating || 
                    !customerName || 
                    !customerEmail ||
                    !customerPhone || 
                    (deliveryType === 'delivery' && (!deliveryStreet || !deliveryNumber || !deliveryNeighborhood))
                  }
                >
                  {!storeIsOpen 
                    ? 'Loja Fechada - Pedido Indisponível' 
                    : isCreating 
                      ? 'Finalizando...' 
                      : 'Finalizar Pedido'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Login Modal */}
      <LoginModal
        open={showAuthDialog}
        onClose={() => {
          setShowAuthDialog(false);
          setAuthModalEmail("");
          setAuthModalFullName("");
          setAuthModalPhone("");
          setAuthModalMessage(undefined);
          setAuthModalMode(undefined);
        }}
        onSignUp={handleModalSignUp}
        onSignIn={handleModalSignIn}
        isLoading={isAuthLoading}
        initialEmail={authModalEmail}
        initialFullName={authModalFullName}
        initialPhone={authModalPhone}
        customMessage={authModalMessage}
        forceMode={authModalMode}
      />
      
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
