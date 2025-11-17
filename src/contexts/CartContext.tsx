import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CartAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartFlavor {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  promotionalPrice?: number;
  quantity: number;
  imageUrl?: string;
  storeId: string;
  storeName: string;
  observation?: string;
  addons?: CartAddon[];
  flavors?: CartFlavor[];
}

export interface Cart {
  items: CartItem[];
  storeId: string | null;
  storeName: string | null;
  storeSlug: string | null;
  couponCode: string | null;
  couponDiscount: number;
}

interface CartContextType {
  cart: Cart;
  addToCart: (
    productId: string,
    productName: string,
    price: number,
    storeId: string,
    storeName: string,
    quantity?: number,
    promotionalPrice?: number,
    imageUrl?: string,
    observation?: string,
    storeSlug?: string,
    addons?: CartAddon[],
    flavors?: CartFlavor[]
  ) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateCartItem: (itemId: string, observation: string, addons: CartAddon[], flavors?: CartFlavor[]) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  validateAndSyncCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'shopping_cart';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart>(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    const initialCart = stored ? JSON.parse(stored) : { 
      items: [], 
      storeId: null, 
      storeName: null, 
      storeSlug: null,
      couponCode: null,
      couponDiscount: 0
    };
    console.log('🎬 CartProvider: initialized with', initialCart);
    return initialCart;
  });

  useEffect(() => {
    console.log('💾 CartProvider: saving to localStorage', cart);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = (
    productId: string,
    productName: string,
    price: number,
    storeId: string,
    storeName: string,
    quantity: number = 1,
    promotionalPrice?: number,
    imageUrl?: string,
    observation?: string,
    storeSlug?: string,
    addons?: CartAddon[],
    flavors?: CartFlavor[]
  ) => {
    console.log('🛒 CartProvider addToCart:', { productName, quantity });
    
    setCart((prev) => {
      if (prev.storeId && prev.storeId !== storeId) {
        const newCart = {
          items: [{
            id: `${productId}-${Date.now()}`,
            productId,
            productName,
            price,
            promotionalPrice,
            quantity,
            imageUrl,
            storeId,
            storeName,
            observation,
            addons,
            flavors,
          }],
          storeId,
          storeName,
          storeSlug: storeSlug || null,
          couponCode: null,
          couponDiscount: 0,
        };
        console.log('🛒 New cart (different store):', newCart);
        return newCart;
      }

      const existingIndex = prev.items.findIndex(
        item => item.productId === productId && 
                item.observation === observation &&
                JSON.stringify(item.addons) === JSON.stringify(addons) &&
                JSON.stringify(item.flavors) === JSON.stringify(flavors)
      );
      
      if (existingIndex >= 0) {
        const newItems = [...prev.items];
        newItems[existingIndex].quantity += quantity;
        const updatedCart = { ...prev, items: newItems };
        console.log('🛒 Updated cart (existing):', updatedCart);
        return updatedCart;
      }

      const updatedCart = {
        items: [...prev.items, {
          id: `${productId}-${Date.now()}`,
          productId,
          productName,
          price,
          promotionalPrice,
          quantity,
          imageUrl,
          storeId,
          storeName,
          observation,
          addons,
          flavors,
        }],
        storeId,
        storeName,
        storeSlug: prev.storeSlug || storeSlug || null,
        couponCode: prev.couponCode,
        couponDiscount: prev.couponDiscount,
      };
      console.log('🛒 Updated cart (new item):', updatedCart);
      return updatedCart;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const newItems = prev.items.filter(item => item.id !== itemId);
      return {
        items: newItems,
        storeId: newItems.length > 0 ? prev.storeId : null,
        storeName: newItems.length > 0 ? prev.storeName : null,
        storeSlug: newItems.length > 0 ? prev.storeSlug : null,
        couponCode: newItems.length > 0 ? prev.couponCode : null,
        couponDiscount: newItems.length > 0 ? prev.couponDiscount : 0,
      };
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart((prev) => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    }));
  };

  const updateCartItem = (itemId: string, observation: string, addons: CartAddon[], flavors?: CartFlavor[]) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, observation, addons, flavors } : item
      ),
    }));
  };

  const clearCart = () => {
    console.log('🗑️ CartProvider: clearing cart');
    setCart({ 
      items: [], 
      storeId: null, 
      storeName: null, 
      storeSlug: null,
      couponCode: null,
      couponDiscount: 0
    });
  };

  const getTotal = () => {
    const total = cart.items.reduce((sum, item) => {
      const itemPrice = item.promotionalPrice || item.price;
      const addonsPrice = item.addons?.reduce((addonSum, addon) => addonSum + addon.price, 0) || 0;
      const flavorsPrice = item.flavors?.reduce((flavorSum, flavor) => flavorSum + flavor.price, 0) || 0;
      return sum + ((itemPrice + addonsPrice + flavorsPrice) * item.quantity);
    }, 0);
    return total;
  };

  const getItemCount = () => {
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    return count;
  };

  const applyCoupon = (code: string, discount: number) => {
    setCart(prev => ({
      ...prev,
      couponCode: code,
      couponDiscount: discount
    }));
  };

  const removeCoupon = () => {
    setCart(prev => ({
      ...prev,
      couponCode: null,
      couponDiscount: 0
    }));
  };

  const validateAndSyncCart = async () => {
    if (!cart.storeId || cart.items.length === 0) return;

    try {
      // Buscar produtos atuais da loja
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, promotional_price, is_available, image_url')
        .eq('store_id', cart.storeId)
        .eq('is_available', true);

      if (error) throw error;

      const removedItems: string[] = [];
      const updatedItems: string[] = [];
      let hasChanges = false;

      setCart(prev => {
        const newItems = prev.items.filter(item => {
          const product = products?.find(p => p.id === item.productId);
          
          // Produto não existe mais ou não está disponível
          if (!product) {
            removedItems.push(item.productName);
            hasChanges = true;
            return false;
          }

          // Verificar se preço mudou
          const currentPrice = product.promotional_price || product.price;
          const cartPrice = item.promotionalPrice || item.price;
          
          if (currentPrice !== cartPrice) {
            updatedItems.push(item.productName);
            hasChanges = true;
            item.price = product.price;
            item.promotionalPrice = product.promotional_price || undefined;
          }

          // Atualizar imagem se mudou
          if (product.image_url !== item.imageUrl) {
            item.imageUrl = product.image_url || undefined;
            hasChanges = true;
          }

          return true;
        });

        if (!hasChanges) return prev;

        return {
          ...prev,
          items: newItems.length > 0 ? newItems : [],
          storeId: newItems.length > 0 ? prev.storeId : null,
          storeName: newItems.length > 0 ? prev.storeName : null,
          storeSlug: newItems.length > 0 ? prev.storeSlug : null,
          couponCode: newItems.length > 0 ? prev.couponCode : null,
          couponDiscount: newItems.length > 0 ? prev.couponDiscount : 0,
        };
      });

      // Mostrar mensagens sobre as mudanças
      if (removedItems.length > 0) {
        toast.warning(`${removedItems.length} ${removedItems.length === 1 ? 'item removido' : 'itens removidos'} do carrinho (indisponível)`);
      }
      if (updatedItems.length > 0) {
        toast.info(`${updatedItems.length} ${updatedItems.length === 1 ? 'item atualizado' : 'itens atualizados'} com novos preços`);
      }
    } catch (error) {
      console.error('Erro ao validar carrinho:', error);
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateCartItem,
      clearCart,
      getTotal,
      getItemCount,
      applyCoupon,
      removeCoupon,
      validateAndSyncCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
