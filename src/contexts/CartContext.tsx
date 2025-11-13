import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartAddon {
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
    addons?: CartAddon[]
  ) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateCartItem: (itemId: string, observation: string, addons: CartAddon[]) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
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
    addons?: CartAddon[]
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
                JSON.stringify(item.addons) === JSON.stringify(addons)
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

  const updateCartItem = (itemId: string, observation: string, addons: CartAddon[]) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, observation, addons } : item
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
      return sum + ((itemPrice + addonsPrice) * item.quantity);
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
