import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Função para gerar ID único para cada item do carrinho
// Baseado em: storeId + productId + customizações (size, addons, flavors, observation)
const generateCartItemId = (
  storeId: string,
  productId: string,
  observation?: string,
  addons?: CartAddon[],
  flavors?: CartFlavor[],
  size?: CartSize
): string => {
  const parts = [
    `store:${storeId}`,
    `product:${productId}`,
    observation ? `obs:${observation}` : '',
    size ? `size:${size.id}` : '',
    addons && addons.length > 0 ? `addons:${addons.map(a => a.id).sort().join(',')}` : '',
    flavors && flavors.length > 0 ? `flavors:${flavors.map(f => f.id).sort().join(',')}` : ''
  ].filter(Boolean);
  
  return parts.join('|');
};

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
  getCartForStore: (storeId: string) => Cart;
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
  validateAndSyncCart: (targetStoreId?: string) => Promise<void>;
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
      try {
        const parsed = JSON.parse(stored);
        console.log('🎬 CartProvider: initialized with multi-cart', {
          activeStore: parsed.activeStoreId,
          storesWithCarts: Object.keys(parsed.carts || {}),
          totalItems: Object.values(parsed.carts || {}).reduce((sum: number, cart: any) => sum + (cart.items?.length || 0), 0)
        });
        return parsed;
      } catch (e) {
        console.error('❌ Error parsing stored cart:', e);
        localStorage.removeItem(MULTI_CART_STORAGE_KEY);
      }
    }
    
    // Migrar carrinho antigo se existir
    const oldCart = localStorage.getItem('shopping_cart');
    if (oldCart) {
      try {
        const parsed = JSON.parse(oldCart);
        if (parsed.storeId && parsed.items.length > 0) {
          console.log('🔄 Migrating old cart to multi-cart system');
          localStorage.removeItem('shopping_cart');
          return {
            carts: { [parsed.storeId]: parsed },
            activeStoreId: parsed.storeId
          };
        }
      } catch (e) {
        console.error('❌ Error migrating old cart:', e);
        localStorage.removeItem('shopping_cart');
      }
    }
    
    return { carts: {}, activeStoreId: null };
  });

  // Computed current cart
  const cart = multiCart.activeStoreId && multiCart.carts[multiCart.activeStoreId]
    ? multiCart.carts[multiCart.activeStoreId]
    : emptyCart();

  useEffect(() => {
    const cartSummary = {
      activeStore: multiCart.activeStoreId,
      storesWithCarts: Object.keys(multiCart.carts),
      itemsPerStore: Object.entries(multiCart.carts).map(([storeId, cart]) => ({
        storeId,
        storeName: cart.storeName,
        itemCount: cart.items.length,
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      }))
    };
    console.log('💾 CartProvider: saving multi-cart to localStorage', cartSummary);
    localStorage.setItem(MULTI_CART_STORAGE_KEY, JSON.stringify(multiCart));
  }, [multiCart]);

  const switchToStore = useCallback((storeId: string) => {
    console.log('🔄 CartContext: switchToStore called for', storeId);
    setMultiCart(prev => {
      // Early return if already on this store
      if (prev.activeStoreId === storeId) {
        console.log('✅ CartContext: already on this store, no change needed');
        return prev;
      }
      
      console.log('🔄 CartContext: switching from', prev.activeStoreId, 'to', storeId);
      console.log('📦 Previous multiCart state:', {
        activeStoreId: prev.activeStoreId,
        carts: Object.keys(prev.carts),
        cartItems: Object.entries(prev.carts).map(([id, cart]) => ({
          storeId: id,
          itemCount: cart.items.length
        }))
      });
      
      // CRITICAL: Preserve ALL existing carts when switching
      const newState: MultiStoreCart = {
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

  // Safety filter: returns cart with only items from the specified store
  const getCartForStore = (storeId: string): Cart => {
    const storeCart = multiCart.carts[storeId];
    if (!storeCart) return emptyCart();
    
    // Extra safety: filter items to ensure they belong to this store
    const filteredItems = storeCart.items.filter(item => item.storeId === storeId);
    
    return {
      ...storeCart,
      items: filteredItems
    };
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

      // Generate unique ID for this item
      const itemUniqueId = generateCartItemId(storeId, productId, observation, addons, flavors, size);
      console.log('🆔 Generated cart item ID:', itemUniqueId);
      
      // Check if item already exists in this store's cart
      const existingIndex = storeCart.items.findIndex(item => item.id === itemUniqueId);
      
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
            id: itemUniqueId, // Usar o ID único gerado
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

  const validateAndSyncCart = async (targetStoreId?: string) => {
    // Use targetStoreId explícito ou fallback para activeStoreId
    const storeIdToValidate = targetStoreId || multiCart.activeStoreId;
    
    console.log('🔍 validateAndSyncCart called:', {
      targetStoreId,
      activeStoreId: multiCart.activeStoreId,
      storeIdToValidate,
      cartsAvailable: Object.keys(multiCart.carts),
      itemsInTargetCart: multiCart.carts[storeIdToValidate || '']?.items.length
    });
    
    if (!storeIdToValidate) return;
    
    const cartToValidate = multiCart.carts[storeIdToValidate];
    if (!cartToValidate || cartToValidate.items.length === 0) return;

    try {
      console.log('🔍 Validating cart for store:', storeIdToValidate);
      
      // Buscar produtos usando storeIdToValidate (não activeStoreId)
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, promotional_price, is_available, image_url')
        .eq('store_id', storeIdToValidate)
        .eq('is_available', true);

      if (error) throw error;

      const removedItems: string[] = [];
      const updatedItems: string[] = [];
      let hasChanges = false;

      setMultiCart(prevMulti => {
        // Usar storeIdToValidate em vez de activeStoreId para garantir validação correta
        const prev = prevMulti.carts[storeIdToValidate];
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
          const { [storeIdToValidate]: removed, ...remainingCarts } = prevMulti.carts;
          return {
            carts: remainingCarts,
            activeStoreId: Object.keys(remainingCarts)[0] || null
          };
        }

        return {
          ...prevMulti,
          carts: {
            ...prevMulti.carts,
            [storeIdToValidate]: {
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
      getCartForStore,
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
