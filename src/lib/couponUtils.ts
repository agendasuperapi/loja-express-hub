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

  // Normalizar nomes de categorias para comparação (case-insensitive, sem espaços extras)
  const normalizedCategoryNames = categoryNames.map(cat => 
    cat.toLowerCase().trim()
  );

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
      const isEligible = productIds.includes(item.productId);
      return isEligible;
    }
    if (appliesTo === 'category') {
      const itemCategory = ((item as any).category || '').toLowerCase().trim();
      const isEligible = normalizedCategoryNames.includes(itemCategory);
      return isEligible;
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

/**
 * Verifica se um item é elegível para desconto com base no escopo do cupom
 */
export const isItemEligible = (
  item: CartItem,
  appliesTo: 'all' | 'category' | 'product',
  categoryNames: string[],
  productIds: string[]
): boolean => {
  if (appliesTo === 'all') return true;
  
  if (appliesTo === 'product') {
    return productIds.includes(item.productId);
  }
  
  if (appliesTo === 'category') {
    const itemCategory = ((item as any).category || '').toLowerCase().trim();
    const normalizedCategoryNames = categoryNames.map(cat => cat.toLowerCase().trim());
    return normalizedCategoryNames.includes(itemCategory);
  }
  
  return false;
};

/**
 * Calcula o desconto para um item específico do carrinho
 */
export const calculateItemDiscount = (
  item: CartItem,
  totalDiscount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  appliesTo: 'all' | 'category' | 'product',
  categoryNames: string[],
  productIds: string[],
  allItems: CartItem[]
): { isEligible: boolean; discount: number } => {
  // Verificar se o item é elegível
  const isEligible = isItemEligible(item, appliesTo, categoryNames, productIds);
  
  if (!isEligible) {
    return { isEligible: false, discount: 0 };
  }
  
  const itemSubtotal = calculateItemSubtotal(item);
  
  // Para porcentagem: aplicar % diretamente ao subtotal do item
  if (discountType === 'percentage') {
    const discount = (itemSubtotal * discountValue) / 100;
    return { isEligible: true, discount };
  }
  
  // Para valor fixo: distribuir proporcionalmente entre itens elegíveis
  const eligibleItems = allItems.filter(i => 
    isItemEligible(i, appliesTo, categoryNames, productIds)
  );
  
  const totalEligibleSubtotal = eligibleItems.reduce((sum, i) => 
    sum + calculateItemSubtotal(i), 0
  );
  
  if (totalEligibleSubtotal <= 0) {
    return { isEligible: true, discount: 0 };
  }
  
  // Desconto proporcional = (subtotal do item / subtotal total elegível) * desconto total
  const proportionalDiscount = (itemSubtotal / totalEligibleSubtotal) * Math.min(discountValue, totalEligibleSubtotal);
  
  return { isEligible: true, discount: proportionalDiscount };
};
