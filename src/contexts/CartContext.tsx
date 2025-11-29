import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

export interface CartSize {
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
  size?: CartSize;
}

export interface Cart {
  items: CartItem[];
  storeId: string | null;
  storeName: string | null;
  storeSlug: string | null;
  couponCode: string | null;
  couponDiscount: number;
}

export interface MultiStoreCart {
  carts: Record<string, Cart>; // storeId -> Cart
  activeStoreId: string | null;
}

interface CartContextType {
  cart: Cart;
  allCarts: Record<string, Cart>;
  activeStoreId: string | null;
  switchToStore: (storeId: string) => void;
  getStoreCartCount: (storeId: string) => number;
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
    flavors?: CartFlavor[],
    size?: CartSize
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

const MULTI_CART_STORAGE_KEY = 'multi_store_cart';

const emptyCart = (): Cart => ({
  items: [],
  storeId: null,
  storeName: null,
  storeSlug: null,
  couponCode: null,
  couponDiscount: 0
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [multiCart, setMultiCart] = useState<MultiStoreCart>(() => {
    const stored = localStorage.getItem(MULTI_CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('🎬 CartProvider: initialized with multi-cart', parsed);
      return parsed;
    }
    
    // Migrar carrinho antigo se existir
    const oldCart = localStorage.getItem('shopping_cart');
    if (oldCart) {
      const parsed = JSON.parse(oldCart);
      if (parsed.storeId && parsed.items.length > 0) {
        console.log('🔄 Migrating old cart to multi-cart system');
        return {
          carts: { [parsed.storeId]: parsed },
          activeStoreId: parsed.storeId
        };
      }
    }
    
    return { carts: {}, activeStoreId: null };
  });

  // Computed current cart
  const cart = multiCart.activeStoreId && multiCart.carts[multiCart.activeStoreId]
    ? multiCart.carts[multiCart.activeStoreId]
    : emptyCart();

  useEffect(() => {
    console.log('💾 CartProvider: saving multi-cart to localStorage', multiCart);
    localStorage.setItem(MULTI_CART_STORAGE_KEY, JSON.stringify(multiCart));
  }, [multiCart]);

  const switchToStore = useCallback((storeId: string) => {
    console.log('🔄 switchToStore called:', storeId);
    setMultiCart(prev => {
      // Don't do anything if already on this store
      if (prev.activeStoreId === storeId) {
        console.log('⏭️ Already on store', storeId, '- skipping switch');
        return prev;
      }
      
      console.log('📦 Previous multiCart state:', {
        activeStoreId: prev.activeStoreId,
        carts: Object.keys(prev.carts),
        cartItems: Object.entries(prev.carts).map(([id, cart]) => ({
          storeId: id,
          itemCount: cart.items.length
        }))
      });
      
      // Just change activeStoreId, preserve ALL existing carts
      const newState = {
        carts: { ...prev.carts }, // Spread to ensure immutability
        activeStoreId: storeId
      };
      
      console.log('✅ New multiCart state after switch:', {
        activeStoreId: newState.activeStoreId,
        carts: Object.keys(newState.carts),
        cartItems: Object.entries(newState.carts).map(([id, cart]) => ({
          storeId: id,
          itemCount: cart.items.length
        }))
      });
      
      return newState;
    });
  }, []);

  const getStoreCartCount = (storeId: string): number => {
    const storeCart = multiCart.carts[storeId];
    if (!storeCart) return 0;
    return storeCart.items.reduce((sum, item) => sum + item.quantity, 0);
  };

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
    flavors?: CartFlavor[],
    size?: CartSize
  ) => {
    console.log('🛒 CartProvider addToCart:', { productName, quantity, size, storeId });
    
    setMultiCart((prev) => {
      console.log('📥 Adding to cart - Previous state:', {
        activeStoreId: prev.activeStoreId,
        targetStoreId: storeId,
        existingCarts: Object.keys(prev.carts)
      });
      
      // Switch to this store if not already active
      const newActiveStoreId = storeId;
      
      // Get or create cart for this store
      const storeCart = prev.carts[storeId] || {
        items: [],
        storeId,
        storeName,
        storeSlug: storeSlug || null,
        couponCode: null,
        couponDiscount: 0
      };

      // Check if item already exists in this store's cart
      const existingIndex = storeCart.items.findIndex(
        item => item.productId === productId && 
                item.observation === observation &&
                JSON.stringify(item.addons) === JSON.stringify(addons) &&
                JSON.stringify(item.flavors) === JSON.stringify(flavors) &&
                JSON.stringify(item.size) === JSON.stringify(size)
      );
      
      let updatedStoreCart: Cart;
      if (existingIndex >= 0) {
        const newItems = [...storeCart.items];
        newItems[existingIndex].quantity += quantity;
        updatedStoreCart = { ...storeCart, items: newItems };
        console.log('🛒 Updated cart (existing item):', updatedStoreCart);
      } else {
        updatedStoreCart = {
          ...storeCart,
          items: [...storeCart.items, {
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
            size,
          }],
        };
        console.log('🛒 Updated cart (new item):', updatedStoreCart);
      }

      const newState = {
        carts: {
          ...prev.carts,
          [storeId]: updatedStoreCart
        },
        activeStoreId: newActiveStoreId
      };
      
      console.log('✅ addToCart final state:', {
        activeStoreId: newState.activeStoreId,
        allCarts: Object.keys(newState.carts),
        targetCartItems: newState.carts[storeId].items.length
      });

      return newState;
    });
  };

  const removeFromCart = (itemId: string) => {
    if (!multiCart.activeStoreId) return;
    
    setMultiCart((prev) => {
      const storeCart = prev.carts[prev.activeStoreId!];
      if (!storeCart) return prev;
      
      const newItems = storeCart.items.filter(item => item.id !== itemId);
      
      if (newItems.length === 0) {
        // Remove empty cart
        const { [prev.activeStoreId!]: removed, ...remainingCarts } = prev.carts;
        return {
          carts: remainingCarts,
          activeStoreId: Object.keys(remainingCarts)[0] || null
        };
      }
      
      return {
        ...prev,
        carts: {
          ...prev.carts,
          [prev.activeStoreId!]: {
            ...storeCart,
            items: newItems
          }
        }
      };
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    if (!multiCart.activeStoreId) return;

    setMultiCart((prev) => {
      const storeCart = prev.carts[prev.activeStoreId!];
      if (!storeCart) return prev;

      return {
        ...prev,
        carts: {
          ...prev.carts,
          [prev.activeStoreId!]: {
            ...storeCart,
            items: storeCart.items.map(item =>
              item.id === itemId ? { ...item, quantity } : item
            )
          }
        }
      };
    });
  };

  const updateCartItem = (itemId: string, observation: string, addons: CartAddon[], flavors?: CartFlavor[]) => {
    if (!multiCart.activeStoreId) return;

    setMultiCart((prev) => {
      const storeCart = prev.carts[prev.activeStoreId!];
      if (!storeCart) return prev;

      return {
        ...prev,
        carts: {
          ...prev.carts,
          [prev.activeStoreId!]: {
            ...storeCart,
            items: storeCart.items.map(item =>
              item.id === itemId ? { ...item, observation, addons, flavors } : item
            )
          }
        }
      };
    });
  };

  const clearCart = () => {
    console.log('🗑️ CartProvider: clearing active cart');
    if (!multiCart.activeStoreId) return;

    setMultiCart((prev) => {
      const { [prev.activeStoreId!]: removed, ...remainingCarts } = prev.carts;
      return {
        carts: remainingCarts,
        activeStoreId: Object.keys(remainingCarts)[0] || null
      };
    });
  };

  const getTotal = () => {
    const total = cart.items.reduce((sum, item) => {
      // If size is selected, use size price instead of base price
      const basePrice = item.size ? item.size.price : (item.promotionalPrice || item.price);
      const addonsPrice = item.addons?.reduce((addonSum, addon) => addonSum + addon.price, 0) || 0;
      const flavorsPrice = item.flavors?.reduce((flavorSum, flavor) => flavorSum + flavor.price, 0) || 0;
      return sum + ((basePrice + addonsPrice + flavorsPrice) * item.quantity);
    }, 0);
    return total;
  };

  const getItemCount = () => {
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    return count;
  };

  const applyCoupon = (code: string, discount: number) => {
    if (!multiCart.activeStoreId) return;

    setMultiCart(prev => {
      const storeCart = prev.carts[prev.activeStoreId!];
      if (!storeCart) return prev;

      return {
        ...prev,
        carts: {
          ...prev.carts,
          [prev.activeStoreId!]: {
            ...storeCart,
            couponCode: code,
            couponDiscount: discount
          }
        }
      };
    });
  };

  const removeCoupon = () => {
    if (!multiCart.activeStoreId) return;

    setMultiCart(prev => {
      const storeCart = prev.carts[prev.activeStoreId!];
      if (!storeCart) return prev;

      return {
        ...prev,
        carts: {
          ...prev.carts,
          [prev.activeStoreId!]: {
            ...storeCart,
            couponCode: null,
            couponDiscount: 0
          }
        }
      };
    });
  };

  const validateAndSyncCart = async () => {
    if (!multiCart.activeStoreId) return;
    
    const activeCart = multiCart.carts[multiCart.activeStoreId];
    if (!activeCart || activeCart.items.length === 0) return;
    
    const cart = activeCart;

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

      setMultiCart(prevMulti => {
        const prev = prevMulti.carts[prevMulti.activeStoreId!];
        if (!prev) return prevMulti;
        
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

        if (!hasChanges) return prevMulti;

        if (newItems.length === 0) {
          // Remove empty cart
          const { [prevMulti.activeStoreId!]: removed, ...remainingCarts } = prevMulti.carts;
          return {
            carts: remainingCarts,
            activeStoreId: Object.keys(remainingCarts)[0] || null
          };
        }

        return {
          ...prevMulti,
          carts: {
            ...prevMulti.carts,
            [prevMulti.activeStoreId!]: {
              ...prev,
              items: newItems
            }
          }
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
      allCarts: multiCart.carts,
      activeStoreId: multiCart.activeStoreId,
      switchToStore,
      getStoreCartCount,
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
