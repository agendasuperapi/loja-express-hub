import { CartItem } from '@/contexts/CartContext';

export interface CouponScope {
  appliesTo: 'all' | 'category' | 'product';
  categoryNames: string[];
  productIds: string[];
}

/**
 * Calcula o subtotal dos itens elegíveis baseado no escopo do cupom
 */
export const calculateEligibleSubtotal = (
  items: CartItem[],
  scope: CouponScope
): { eligibleSubtotal: number; eligibleItems: CartItem[] } => {
  const { appliesTo, categoryNames, productIds } = scope;

  // Se aplica a todos, retorna o subtotal total
  if (appliesTo === 'all') {
    const eligibleSubtotal = items.reduce((sum, item) => {
      return sum + calculateItemSubtotal(item);
    }, 0);
    return { eligibleSubtotal, eligibleItems: items };
  }

  // Filtrar itens elegíveis
  const eligibleItems = items.filter(item => {
    if (appliesTo === 'product') {
      return productIds.includes(item.productId);
    }
    if (appliesTo === 'category') {
      const itemCategory = (item as any).category || '';
      return categoryNames.some(cat => 
        cat.toLowerCase() === itemCategory.toLowerCase()
      );
    }
    return false;
  });

  const eligibleSubtotal = eligibleItems.reduce((sum, item) => {
    return sum + calculateItemSubtotal(item);
  }, 0);

  return { eligibleSubtotal, eligibleItems };
};

/**
 * Calcula o subtotal de um item individual
 */
export const calculateItemSubtotal = (item: CartItem): number => {
  const basePrice = item.size ? item.size.price : (item.promotionalPrice || item.price);
  const addonsPrice = item.addons?.reduce((s, a) => s + a.price * (a.quantity || 1), 0) || 0;
  const flavorsPrice = item.flavors?.reduce((s, f) => s + f.price * (f.quantity || 1), 0) || 0;
  const colorPrice = item.color?.price || 0;
  
  return (basePrice + addonsPrice + flavorsPrice + colorPrice) * item.quantity;
};

/**
 * Calcula o desconto baseado no tipo e valor do cupom
 */
export const calculateDiscount = (
  eligibleSubtotal: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number => {
  if (eligibleSubtotal <= 0) return 0;

  if (discountType === 'percentage') {
    const discount = (eligibleSubtotal * discountValue) / 100;
    return Math.min(discount, eligibleSubtotal);
  }

  return Math.min(discountValue, eligibleSubtotal);
};
