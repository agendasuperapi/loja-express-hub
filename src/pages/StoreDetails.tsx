import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Navigation } from "@/components/layout/Navigation";
import { FloatingCartButton } from "@/components/cart/FloatingCartButton";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { Star, Clock, MapPin, ArrowLeft, Search, Share2, Plus, ShoppingBag, Phone } from "lucide-react";
import whatsappIcon from "@/assets/whatsapp-icon.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useStore } from "@/hooks/useStores";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useCart } from "@/contexts/CartContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast as sonnerToast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { isStoreOpen, getStoreStatusText } from "@/lib/storeUtils";
import { formatDisplayPhone } from "@/lib/phone";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProductDetailsDialog } from "@/components/product/ProductDetailsDialog";
import { useFeaturedProducts } from "@/hooks/useFeaturedProducts";
import { FeaturedProductsCarousel } from "@/components/store/FeaturedProductsCarousel";

export default function StoreDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: store, isLoading: storeLoading } = useStore(slug!);
  const { data: products, isLoading: productsLoading } = useProducts(store?.id || '');
  const { data: featuredProducts } = useFeaturedProducts(store?.id || '');
  const { categories: storeCategories } = useCategories(store?.id);
  const { addToCart, cart, switchToStore, allCarts, getStoreCartCount } = useCart();
  const { toast } = useToast();
  const [detailsProduct, setDetailsProduct] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastSwitchRef = useRef<string | null>(null);
  
  // Get layout templates from store (separate for desktop and mobile)
  const layoutTemplateDesktop = (store as any)?.product_layout_template_desktop || 'template-4';
  const layoutTemplateMobile = (store as any)?.product_layout_template_mobile || 'template-2';
  
  // Function to get grid classes based on template and screen size
  const getGridClasses = () => {
    // Mobile classes (base and sm breakpoint)
    const mobileClasses = (() => {
      switch (layoutTemplateMobile) {
        case 'template-2':
          return 'grid-cols-2';
        case 'template-3':
          return 'grid-cols-2 sm:grid-cols-3';
        case 'template-4':
          return 'grid-cols-2 sm:grid-cols-3';
        case 'template-6':
          return 'grid-cols-3 sm:grid-cols-4';
        case 'template-list':
          return 'grid-cols-1';
        case 'template-horizontal':
          return 'flex flex-col';
        default:
          return 'grid-cols-2';
      }
    })();

    // Desktop classes (lg breakpoint and above)
    const desktopClasses = (() => {
      switch (layoutTemplateDesktop) {
        case 'template-2':
          return 'lg:grid-cols-2';
        case 'template-3':
          return 'lg:grid-cols-3';
        case 'template-4':
          return 'lg:grid-cols-4';
        case 'template-6':
          return 'lg:grid-cols-6';
        case 'template-list':
          return 'lg:grid-cols-1';
        case 'template-horizontal':
          return 'lg:flex lg:flex-col';
        default:
          return 'lg:grid-cols-4';
      }
    })();

    return `${mobileClasses} ${desktopClasses}`;
  };

  // Check layout type separately for mobile and desktop
  const isMobileHorizontal = layoutTemplateMobile === 'template-horizontal';
  const isDesktopHorizontal = layoutTemplateDesktop === 'template-horizontal';
  
  // Detect shared product from URL and open in popup
  const sharedProductShortId = searchParams.get('product');

  // Open product in popup when URL has ?product=short_id
  useEffect(() => {
    const productShortId = searchParams.get('product');
    if (productShortId && products && products.length > 0) {
      const product = products.find(p => p.short_id === productShortId);
      if (product) {
        setDetailsProduct(product);
      }
    }
  }, [searchParams, products]);

  // Update sharedProduct for meta tags
  const sharedProduct = products?.find(p => p.short_id === sharedProductShortId);

  // Check if product is in cart and get its quantity
  const getProductCartQuantity = (productId: string) => {
    return cart.items
      .filter(item => item.productId === productId)
      .reduce((total, item) => total + item.quantity, 0);
  };

  const handleShareProduct = async (product: any) => {
    if (!store) return;
    
    // Nova URL limpa usando short_id
    const shareUrl = `https://ofertas.app/p/${product.short_id}`;
    
    const shareText = `${product.name}\nR$ ${Number(product.promotional_price || product.price).toFixed(2)}\n\n${product.description || ''}\n\n${store.name}`;

    try {
      if (navigator.share && navigator.canShare) {
        await navigator.share({
          title: `${product.name} - ${store.name}`,
          text: shareText,
          url: shareUrl,
        });
        toast({
          title: "Compartilhado com sucesso!",
          description: "O link do produto foi compartilhado.",
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast({
          title: "Link copiado!",
          description: "O link do produto foi copiado para a área de transferência.",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast({
          title: "Link copiado!",
          description: "O link foi copiado para a área de transferência.",
        });
      } catch (clipboardError) {
        toast({
          title: "Erro ao compartilhar",
          description: "Não foi possível compartilhar o produto. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const groupedProducts = products?.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, typeof products>);

  // Filter products based on search query
  const filteredGroupedProducts = searchQuery
    ? Object.entries(groupedProducts || {}).reduce((acc, [category, categoryProducts]) => {
        const filtered = categoryProducts.filter(product =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
        return acc;
      }, {} as Record<string, typeof products>)
    : groupedProducts;

  // Get categories in the correct display_order, filtering only those with products
  const categories = storeCategories && storeCategories.length > 0
    ? storeCategories
        .filter(cat => cat.is_active && groupedProducts?.[cat.name] && groupedProducts[cat.name].length > 0)
        .map(cat => cat.name)
    : Object.keys(groupedProducts || {}).sort();

  const scrollToCategory = (category: string) => {
    setSelectedCategory(category);
    categoryRefs.current[category]?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start',
      inline: 'nearest'
    });
  };

  const storeIsOpen = store ? isStoreOpen(store.operating_hours) : false;
  const storeStatus = store ? getStoreStatusText(store.operating_hours) : '';
  const allowOrdersWhenClosed = (store as any)?.allow_orders_when_closed ?? false;
  const canAcceptOrders = storeIsOpen || allowOrdersWhenClosed;

  // Auto-switch to store cart when entering a store page (with protection against duplicate calls)
  useEffect(() => {
    if (store && store.id !== lastSwitchRef.current) {
      console.log('🏪 StoreDetails: Switching to store', store.id);
      lastSwitchRef.current = store.id;
      switchToStore(store.id);
      
      localStorage.setItem('lastVisitedStore', JSON.stringify({
        slug: store.slug,
        name: store.name
      }));
    }
  }, [store?.id, switchToStore]);

  // Show notification about other carts (separate effect to avoid re-triggering switchToStore)
  useEffect(() => {
    if (store && allCarts) {
      const otherCarts = Object.entries(allCarts).filter(([storeId]) => storeId !== store.id);
      if (otherCarts.length > 0) {
        const totalOtherItems = otherCarts.reduce((sum, [_, storeCart]) => 
          sum + storeCart.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        );
        
        if (totalOtherItems > 0) {
          sonnerToast.info("Carrinhos de outras lojas salvos", {
            description: `Você tem ${totalOtherItems} ${totalOtherItems === 1 ? 'item' : 'itens'} em ${otherCarts.length} ${otherCarts.length === 1 ? 'outra loja' : 'outras lojas'}. Eles serão mantidos.`,
            duration: 4000
          });
        }
      }
    }
  }, [store?.id]);

  // Open product from URL parameter and show dialog
  useEffect(() => {
    if (!products || products.length === 0 || !sharedProductShortId) return;
    
    if (sharedProduct) {
      // Aguarda um pequeno delay para garantir que a página carregou
      setTimeout(() => {
        setDetailsProduct(sharedProduct);
        
        // Scroll suave até a categoria do produto
        const category = sharedProduct.category;
        if (category && categoryRefs.current[category]) {
          categoryRefs.current[category]?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
          });
        }
        
        // Mostra toast de confirmação
        toast({
          title: "Produto encontrado!",
          description: `Abrindo ${sharedProduct.name}...`,
        });
      }, 500);
    } else {
      toast({
        title: "Produto não encontrado",
        description: "O produto compartilhado não está mais disponível.",
        variant: "destructive",
      });
    }
  }, [products, sharedProduct, sharedProductShortId, toast]);

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-12 w-64 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Loja não encontrada</h1>
          <Button onClick={() => navigate('/stores')}>Voltar para Lojas</Button>
        </main>
      </div>
    );
  }

  // Meta tags configuration
  const menuLabel = (store as any).menu_label || 'Cardápio';
  const menuLabelLower = menuLabel.toLowerCase();
  
  const pageTitle = sharedProduct 
    ? `${sharedProduct.name} - ${store.name}` 
    : `${store.name} - ${menuLabel}`;
  const pageDescription = sharedProduct
    ? `${sharedProduct.description || sharedProduct.name} - R$ ${Number(sharedProduct.promotional_price || sharedProduct.price).toFixed(2)} - Peça agora em ${store.name}`
    : store.description || `Confira ${menuLabel === 'Produtos' ? 'o catálogo de produtos' : 'o cardápio completo'} de ${store.name}`;
  const pageImage = sharedProduct?.image_url || store.logo_url || store.banner_url;
  const currentUrl = window.location.href;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-50 relative overflow-hidden">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:site_name" content="App Delivery" />
        {pageImage && <meta property="og:image" content={pageImage} />}
        {pageImage && <meta property="og:image:secure_url" content={pageImage} />}
        {pageImage && <meta property="og:image:type" content="image/jpeg" />}
        {pageImage && <meta property="og:image:width" content="1200" />}
        {pageImage && <meta property="og:image:height" content="630" />}
        {pageImage && <meta property="og:image:alt" content={pageTitle} />}
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={currentUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {pageImage && <meta name="twitter:image" content={pageImage} />}
        {pageImage && <meta name="twitter:image:alt" content={pageTitle} />}
      </Helmet>
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-0 right-0 w-96 h-96 bg-gray-200/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-0 left-0 w-96 h-96 bg-gray-300/20 rounded-full blur-3xl"
        />
      </div>
      <Navigation />
      
      <main className="container mx-auto px-4 pt-0 md:pt-20 pb-20">
        {/* Back Button */}

        {/* Store Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl overflow-hidden mb-4 md:mb-6 shadow-2xl hover:shadow-3xl transition-shadow duration-500 w-full max-w-full"
        >
          {/* Banner */}
          <div className="relative h-32 md:h-64 lg:h-80 bg-muted overflow-hidden group border-2 border-orange-300 hover:shadow-[0_0_20px_rgba(251,146,60,0.6)] transition-shadow duration-500 w-full max-w-full">
            {store.banner_url ? (
              <>
                <motion.img 
                  initial={{ scale: 1.15, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                  src={store.banner_url} 
                  alt={store.name}
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-1000 ease-out"
                />
                {/* Animated shine effect */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{
                    duration: 3,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 5
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  style={{ width: '50%' }}
                />
                {/* Vignette effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20 pointer-events-none" />
              </>
            ) : (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  duration: 0.8,
                  ease: [0.34, 1.56, 0.64, 1]
                }}
                className="w-full h-full flex items-center justify-center text-5xl md:text-7xl lg:text-8xl"
              >
                <motion.span
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  🏪
                </motion.span>
              </motion.div>
            )}
          </div>

          {/* Store Info Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="bg-gradient-to-br from-gray-200 via-white to-gray-100 p-4 md:p-6 border-2 border-orange-300 hover:shadow-[0_0_20px_rgba(251,146,60,0.6)] transition-shadow duration-500"
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="flex flex-col items-center md:items-start gap-3 md:gap-4 flex-1">
                {store.logo_url && (
                  <motion.img 
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    src={store.logo_url} 
                    alt={store.name}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-4 border-background shadow-lg"
                  />
                )}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-2xl md:text-4xl font-bold gradient-text">{store.name}</h1>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-full"
                    >
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span className="font-semibold">{store.rating || 5}</span>
                      {store.total_reviews > 0 && (
                        <span className="text-muted-foreground">({store.total_reviews})</span>
                      )}
                    </motion.div>
                    {(store as any).show_avg_delivery_time !== false && (
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full"
                      >
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-medium">{store.avg_delivery_time || 30} min</span>
                      </motion.div>
                    )}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                    >
                      <Badge 
                        className={`${
                          canAcceptOrders
                            ? storeIsOpen 
                              ? 'bg-green-500/90 hover:bg-green-600' 
                              : 'bg-amber-500/90 hover:bg-amber-600'
                            : 'bg-red-500/90 hover:bg-red-600'
                        } text-white px-4 py-1.5 shadow-lg text-sm font-medium`}
                      >
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        {canAcceptOrders
                          ? storeIsOpen 
                            ? `Aberto - ${storeStatus}`
                            : "Aceitando pedidos agendados"
                          : `Fechado - ${storeStatus}`
                        }
                      </Badge>
                    </motion.div>
                  </div>
                  
                  <p className="text-muted-foreground mb-2 text-sm md:text-base leading-relaxed text-center md:text-left">{store.description}</p>
                  
                  {(() => {
                    const storeData = store as any;
                    const showAddressOnStorePage = (storeData.show_address_on_store_page ?? true) as boolean;
                    const hasAddress = storeData.store_street || storeData.store_city || storeData.store_neighborhood;
                    
                    if (!hasAddress || !showAddressOnStorePage) return null;
                    
                    const addressParts = [];
                    if (storeData.store_street) {
                      const streetLine = [
                        storeData.store_street,
                        storeData.store_street_number
                      ].filter(Boolean).join(', ');
                      addressParts.push(streetLine);
                    }
                    
                    if (storeData.store_complement) {
                      addressParts.push(storeData.store_complement);
                    }
                    
                    if (storeData.store_neighborhood) {
                      addressParts.push(storeData.store_neighborhood);
                    }
                    
                    if (storeData.store_city) {
                      addressParts.push(storeData.store_city);
                    }
                    
                    if (storeData.store_cep) {
                      addressParts.push(`CEP: ${storeData.store_cep}`);
                    }
                    
                    const fullAddress = addressParts.join(' - ');
                    
                     return (
                       <motion.div 
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         transition={{ delay: 0.6 }}
                         className="flex items-start gap-2 text-sm text-muted-foreground mt-4 bg-muted/50 px-3 py-2 rounded-lg w-fit max-w-full mx-auto md:mx-0"
                       >
                         <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                         <span className="break-words">{fullAddress}</span>
                       </motion.div>
                     );
                   })()}

                  {(() => {
                    const storeData = store as any;
                    const showPhoneOnStorePage = (storeData.show_phone_on_store_page ?? true) as boolean;
                    const hasPhone = storeData.phone;
                    
                    if (!hasPhone || !showPhoneOnStorePage) return null;

                    // Remove country code for display
                    const formatPhoneWithoutCountry = (phone: string) => {
                      const digits = (phone || '').replace(/\D/g, '');
                      const withoutCC = digits.startsWith('55') ? digits.slice(2) : digits;
                      
                      if (withoutCC.length === 11) {
                        return `(${withoutCC.slice(0,2)}) ${withoutCC.slice(2,7)}-${withoutCC.slice(7)}`;
                      } else if (withoutCC.length === 10) {
                        return `(${withoutCC.slice(0,2)}) ${withoutCC.slice(2,6)}-${withoutCC.slice(6)}`;
                      }
                      return withoutCC;
                    };

                    return (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground mt-2 bg-muted/50 px-3 py-2 rounded-lg w-fit cursor-pointer hover:bg-muted/70 transition-colors mx-auto md:mx-0"
                        onClick={() => window.open(`tel:${storeData.phone}`, '_self')}
                      >
                        <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{formatPhoneWithoutCountry(storeData.phone)}</span>
                      </motion.div>
                    );
                  })()}

                  {(() => {
                    const storeData = store as any;
                    const showWhatsAppOnStorePage = (storeData.show_whatsapp_on_store_page ?? true) as boolean;
                    const hasWhatsApp = storeData.whatsapp;
                    
                    if (!hasWhatsApp || !showWhatsAppOnStorePage) return null;

                    // Remove country code for display
                    const formatPhoneWithoutCountry = (phone: string) => {
                      const digits = (phone || '').replace(/\D/g, '');
                      const withoutCC = digits.startsWith('55') ? digits.slice(2) : digits;
                      
                      if (withoutCC.length === 11) {
                        return `(${withoutCC.slice(0,2)}) ${withoutCC.slice(2,7)}-${withoutCC.slice(7)}`;
                      } else if (withoutCC.length === 10) {
                        return `(${withoutCC.slice(0,2)}) ${withoutCC.slice(2,6)}-${withoutCC.slice(6)}`;
                      }
                      return withoutCC;
                    };

                    return (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground mt-2 bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded-lg w-fit cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors mx-auto md:mx-0"
                        onClick={() => window.open(`https://wa.me/${storeData.whatsapp}`, '_blank')}
                      >
                        <img src={whatsappIcon} alt="WhatsApp" className="w-6 h-6 flex-shrink-0" />
                        <span>{formatPhoneWithoutCountry(storeData.whatsapp)}</span>
                      </motion.div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Products and Cart Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Products Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="lg:col-span-2 space-y-4 pb-16 md:pb-24"
          >
            {/* Carrossel de Produtos em Destaque */}
            {featuredProducts && featuredProducts.length > 0 && (
              <FeaturedProductsCarousel
                products={featuredProducts}
                onAddToCart={(product) => {
                  setDetailsProduct(product);
                }}
                onProductClick={(product) => {
                  setDetailsProduct(product);
                }}
              />
            )}

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2"
          >
            <ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold gradient-text">
              {menuLabel}
            </h2>
          </motion.div>

          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 text-foreground" />
            <Input
              type="text"
              placeholder={`Buscar ${menuLabelLower}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-6 text-base bg-card/50 backdrop-blur-sm border-muted/50 focus:border-primary transition-all"
            />
          </div>

          {/* Horizontal Category Menu */}
          {categories.length > 0 && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="sticky top-20 z-10 bg-background/80 backdrop-blur-lg border-y border-border/50 -mx-4 px-4 py-3 shadow-sm"
            >
              <ScrollArea className="w-full">
                <div className="flex gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      onClick={() => scrollToCategory(category)}
                      className={`whitespace-nowrap transition-all duration-300 ${
                        selectedCategory === category 
                          ? 'shadow-lg' 
                          : 'hover:bg-primary/10'
                      }`}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </motion.div>
          )}

          {productsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : !products || products.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="shadow-lg border-muted/50">
                <CardContent className="py-16 text-center">
                  <div className="text-6xl mb-4 animate-float">📦</div>
                  <p className="text-muted-foreground text-lg">Nenhum produto disponível no momento</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : searchQuery && Object.keys(filteredGroupedProducts || {}).length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="shadow-lg border-muted/50">
                <CardContent className="py-16 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-muted-foreground text-lg">Nenhum produto encontrado para "{searchQuery}"</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchQuery("")}
                    className="mt-4"
                  >
                    Limpar busca
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            categories.filter(category => filteredGroupedProducts?.[category]?.length > 0).map((category, categoryIndex) => {
              const categoryProducts = filteredGroupedProducts?.[category] || [];
              return (
              <motion.div 
                key={category}
                ref={(el) => (categoryRefs.current[category] = el)}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + categoryIndex * 0.1, duration: 0.5 }}
                className="space-y-4 scroll-mt-32"
              >
                <div className="flex items-center gap-3">
                  <div className="h-1 w-12 bg-orange-500 rounded-full" />
                  <h3 className="text-xl md:text-2xl font-bold">{category}</h3>
                  <div className="h-1 flex-1 bg-gradient-to-r from-orange-500/50 to-transparent rounded-full" />
                </div>
                
                {/* Mobile Horizontal Layout - Only shown on mobile when template is horizontal */}
                {isMobileHorizontal && (
                  <div className="flex flex-col gap-4 lg:hidden">
                    {categoryProducts.map((product, index) => {
                      const cartQuantity = getProductCartQuantity(product.id);
                      const isInCart = cartQuantity > 0;
                      
                      return (
                        <motion.div
                          key={`${product.id}-${cartQuantity}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.03 }}
                          className="group"
                        >
                          <Card
                            className={`flex items-center gap-4 p-3 transition-all duration-300 cursor-pointer relative ${
                              isInCart 
                                ? 'border border-primary ring-2 ring-primary/40 bg-primary/5' 
                                : 'border border-border hover:border-primary/50 shadow-md hover:shadow-lg'
                            }`}
                            onClick={() => setDetailsProduct(product)}
                          >
                            {/* Product Image on Left */}
                            <div className="flex-shrink-0 relative">
                              <div className="w-36 h-24 md:w-48 md:h-32 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <span className="text-3xl">🍕</span>
                                  </div>
                                )}
                              </div>
                              {isInCart && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-1 -right-1 bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                                >
                                  {cartQuantity}
                                </motion.div>
                              )}
                            </div>
                            
                            {/* Product Info in Center */}
                            <div className="flex-1 min-w-0 pr-2">
                              <h4 className="font-bold text-base md:text-lg mb-0.5 group-hover:text-primary transition-colors">
                                {product.name}
                              </h4>
                              {product.description && (
                                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-1">
                                  {product.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                {product.promotional_price ? (
                                  <>
                                    <span className="text-xs text-muted-foreground line-through">
                                      R$ {Number(product.price).toFixed(2)}
                                    </span>
                                     <span className="text-lg md:text-xl font-bold text-success">
                                       R$ {Number(product.promotional_price).toFixed(2)}
                                     </span>
                                  </>
                                ) : (
                                   <span className="text-lg md:text-xl font-bold text-success">
                                     R$ {Number(product.price).toFixed(2)}
                                   </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Add Button on Right */}
                            <div className="flex-shrink-0">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Button 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailsProduct(product);
                                  }}
                                  className="rounded-full w-12 h-12 bg-success hover:bg-success/90 shadow-lg"
                                >
                                  <Plus className="w-5 h-5" />
                                </Button>
                              </motion.div>
                            </div>
                            
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Desktop Horizontal Layout - Only shown on desktop when template is horizontal */}
                {isDesktopHorizontal && (
                  <div className="hidden lg:flex lg:flex-col gap-4">
                    {categoryProducts.map((product, index) => {
                      const cartQuantity = getProductCartQuantity(product.id);
                      const isInCart = cartQuantity > 0;
                      
                      return (
                        <motion.div
                          key={`${product.id}-${cartQuantity}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.03 }}
                          className="group"
                        >
                          <Card
                            className={`flex items-center gap-4 p-3 transition-all duration-300 cursor-pointer relative ${
                              isInCart 
                                ? 'border border-primary ring-2 ring-primary/40 bg-primary/5' 
                                : 'border border-border hover:border-primary/50 shadow-md hover:shadow-lg'
                            }`}
                            onClick={() => setDetailsProduct(product)}
                          >
                            {/* Product Image on Left */}
                            <div className="flex-shrink-0 relative">
                              <div className="w-36 h-24 md:w-48 md:h-32 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <span className="text-3xl">🍕</span>
                                  </div>
                                )}
                              </div>
                              {isInCart && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-1 -right-1 bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                                >
                                  {cartQuantity}
                                </motion.div>
                              )}
                            </div>
                            
                            {/* Product Info in Center */}
                            <div className="flex-1 min-w-0 pr-2">
                              <h4 className="font-bold text-base md:text-lg mb-0.5 group-hover:text-primary transition-colors">
                                {product.name}
                              </h4>
                              {product.description && (
                                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-1">
                                  {product.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                {product.promotional_price ? (
                                  <>
                                    <span className="text-xs text-muted-foreground line-through">
                                      R$ {Number(product.price).toFixed(2)}
                                    </span>
                                     <span className="text-lg md:text-xl font-bold text-success">
                                       R$ {Number(product.promotional_price).toFixed(2)}
                                     </span>
                                  </>
                                ) : (
                                   <span className="text-lg md:text-xl font-bold text-success">
                                     R$ {Number(product.price).toFixed(2)}
                                   </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Add Button on Right */}
                            <div className="flex-shrink-0">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Button 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailsProduct(product);
                                  }}
                                  className="rounded-full w-12 h-12 bg-success hover:bg-success/90 shadow-lg"
                                >
                                  <Plus className="w-5 h-5" />
                                </Button>
                              </motion.div>
                            </div>
                            
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Grid Layout - Shown when NOT horizontal on respective screen size */}
                {!isMobileHorizontal && (
                  <div className={`grid ${getGridClasses()} gap-2 md:gap-3 lg:hidden`}>
                    {categoryProducts.map((product, index) => {
                      const cartQuantity = getProductCartQuantity(product.id);
                      const isInCart = cartQuantity > 0;
                      
                      return (
                      <motion.div
                        key={`${product.id}-${cartQuantity}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        whileHover={{ y: -8 }}
                        className="group"
                      >
                        <motion.div
                          key={`card-${product.id}-${cartQuantity}`}
                          initial={isInCart ? { scale: 1 } : false}
                          animate={isInCart ? {
                            scale: [1, 1.08, 1.02],
                          } : { scale: 1 }}
                          transition={{ 
                            duration: 0.5, 
                            ease: "easeOut",
                            times: [0, 0.5, 1]
                          }}
                        >
                          <Card
                          className={`overflow-hidden h-full flex flex-col transition-all duration-300 cursor-pointer ${
                            isInCart 
                              ? 'border border-primary ring-2 ring-primary/40 bg-primary/5 scale-[1.02]' 
                              : 'border-2 border-orange-300 hover:border-orange-400 shadow-lg hover:shadow-2xl bg-card/50 backdrop-blur-sm'
                          }`}
                          onClick={() => setDetailsProduct(product)}
                        >
                          {product.image_url && (
                            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                              <motion.img
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                whileHover={{ scale: 1.15 }}
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-500 ease-out"
                              />
                              {/* Subtle gray-blue gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/15 via-blue-900/10 to-transparent pointer-events-none" />
                              {isInCart && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                  className={`absolute top-3 ${product.promotional_price ? 'left-3' : 'right-3'} bg-primary text-primary-foreground px-3 py-2 rounded-full text-sm font-bold shadow-lg z-10`}
                                >
                                  <span>{cartQuantity}</span>
                                </motion.div>
                              )}
                            </div>
                          )}
                          <CardContent className="p-2 sm:p-3 pt-1.5 flex-1 flex flex-col">
                            <div className="flex-grow">
                              <h4 className="font-bold text-base sm:text-lg group-hover:text-primary transition-colors line-clamp-2 h-[2.75rem]">{product.name}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-snug h-[2.25rem]">
                                {product.description || ' '}
                              </p>
                            </div>
                            <Separator className="my-0.5" />
                            <div className="mt-auto">
                              <div className="mb-1.5 h-[3rem] flex flex-col justify-center">
                                {product.promotional_price ? (
                                  <>
                                    <span className="text-xs sm:text-sm text-muted-foreground line-through block">
                                      R$ {Number(product.price).toFixed(2)}
                                    </span>
                                    <span className="text-lg sm:text-xl font-bold text-primary">
                                      R$ {Number(product.promotional_price).toFixed(2)}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs sm:text-sm text-muted-foreground line-through block opacity-0 select-none">
                                      R$ {Number(product.price).toFixed(2)}
                                    </span>
                                    <span className="text-lg sm:text-xl font-bold gradient-text block">
                                      R$ {Number(product.price).toFixed(2)}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex-shrink-0"
                                >
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareProduct(product);
                                    }}
                                    className="shadow-md hover:shadow-lg transition-all duration-300 h-8 w-8 p-0 sm:h-9 sm:w-9"
                                  >
                                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </Button>
                                </motion.div>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex-1 min-w-0"
                                >
                                  <Button 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailsProduct(product);
                                    }}
                                    className="w-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4"
                                  >
                                    Adicionar
                                  </Button>
                                </motion.div>
                              </div>
                            </div>
                          </CardContent>
                          </Card>
                        </motion.div>
                      </motion.div>
                    );
                    })}
                  </div>
                )}

                {/* Desktop Grid Layout - Only shown on desktop when template is NOT horizontal */}
                {!isDesktopHorizontal && (
                  <div className={`hidden lg:grid ${getGridClasses()} gap-3`}>
                    {categoryProducts.map((product, index) => {
                      const cartQuantity = getProductCartQuantity(product.id);
                      const isInCart = cartQuantity > 0;
                      
                      return (
                      <motion.div
                        key={`desktop-${product.id}-${cartQuantity}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        whileHover={{ y: -8 }}
                        className="group"
                      >
                        <motion.div
                          key={`card-${product.id}-${cartQuantity}`}
                          initial={isInCart ? { scale: 1 } : false}
                          animate={isInCart ? {
                            scale: [1, 1.08, 1.02],
                          } : { scale: 1 }}
                          transition={{ 
                            duration: 0.5, 
                            ease: "easeOut",
                            times: [0, 0.5, 1]
                          }}
                        >
                          <Card
                          className={`overflow-hidden h-full flex flex-col transition-all duration-300 cursor-pointer ${
                            isInCart 
                              ? 'border border-primary ring-2 ring-primary/40 bg-primary/5 scale-[1.02]' 
                              : 'border-2 border-orange-300 hover:border-orange-400 shadow-lg hover:shadow-2xl bg-card/50 backdrop-blur-sm'
                          }`}
                          onClick={() => setDetailsProduct(product)}
                        >
                          {product.image_url && (
                            <div className="relative h-56 md:h-44 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                              <motion.img
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                whileHover={{ scale: 1.15 }}
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-500 ease-out"
                              />
                              {/* Subtle gray-blue gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/15 via-blue-900/10 to-transparent pointer-events-none" />
                              {isInCart && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                  className="absolute top-2 right-2 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-xl ring-2 ring-background z-10"
                                >
                                  {cartQuantity}
                                </motion.div>
                              )}
                            </div>
                          )}
                          <CardContent className="p-3 md:p-4 pt-1.5 md:pt-2 space-y-0 flex-1 flex flex-col">
                            <div className="flex-grow">
                              <h4 className="font-bold text-lg md:text-xl group-hover:text-primary transition-colors line-clamp-2 h-[3.25rem]">
                                {product.name}
                              </h4>
                              <p className="text-sm text-muted-foreground line-clamp-2 h-[2.75rem]">
                                {product.description || ' '}
                              </p>
                            </div>
                            <div className="space-y-2 mt-auto">
                              <div className="space-y-0.5 h-[3rem] flex flex-col justify-center">
                                {product.promotional_price ? (
                                  <>
                                    <div className="text-sm text-muted-foreground line-through">
                                      R$ {Number(product.price).toFixed(2)}
                                    </div>
                                    <div className="text-2xl md:text-2xl font-bold text-success flex items-baseline gap-1">
                                      <span className="text-lg">R$</span>
                                      {Number(product.promotional_price).toFixed(2)}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-sm text-muted-foreground line-through opacity-0 select-none">
                                      R$ {Number(product.price).toFixed(2)}
                                    </div>
                                    <div className="text-2xl md:text-2xl font-bold text-success flex items-baseline gap-1">
                                      <span className="text-lg">R$</span>
                                      {Number(product.price).toFixed(2)}
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex-shrink-0"
                                >
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareProduct(product);
                                    }}
                                    className="shadow-md hover:shadow-lg transition-all duration-300"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                </motion.div>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex-1"
                                >
                                  <Button 
                                    className="w-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailsProduct(product);
                                    }}
                                  >
                                    Adicionar
                                  </Button>
                                </motion.div>
                              </div>
                            </div>
                          </CardContent>
                          </Card>
                        </motion.div>
                      </motion.div>
                    );
                    })}
                  </div>
                )}
              </motion.div>
              );
            })
            )}
          </motion.div>

          {/* Cart Sidebar */}
          <CartSidebar storeId={store.id} />
        </div>
      </main>

      <ProductDetailsDialog
        product={detailsProduct}
        store={store}
        open={!!detailsProduct}
        onOpenChange={(open) => !open && setDetailsProduct(null)}
      />

      <FloatingCartButton />
    </div>
  );
}
