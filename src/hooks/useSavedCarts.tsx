import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Cart } from '@/contexts/CartContext';

interface SavedCartDB {
  id: string;
  user_id: string;
  store_id: string;
  store_name: string;
  store_slug: string | null;
  items: any[];
  coupon_code: string | null;
  coupon_discount: number;
  updated_at: string;
  created_at: string;
}

export const useSavedCarts = () => {
  const { user } = useAuth();

  /**
   * Salva um carrinho no banco de dados
   * Usa upsert para criar ou atualizar
   * Filtra itens para garantir que pertencem à loja correta
   */
  const saveCartToDatabase = useCallback(async (cart: Cart, storeId: string) => {
    if (!user) {
      console.log('⚠️ User not logged in, skipping cart save');
      return;
    }

    if (!cart.items || cart.items.length === 0) {
      console.log('⚠️ Empty cart, skipping save');
      return;
    }

    // Filtrar itens para garantir que pertencem à loja correta
    const filteredItems = cart.items.filter(item => item.storeId === storeId);

    if (filteredItems.length === 0) {
      console.log('⚠️ No items for this store after filtering, skipping save');
      return;
    }

    try {
      console.log('💾 Saving cart to database:', {
        storeId,
        originalItemCount: cart.items.length,
        filteredItemCount: filteredItems.length,
        userId: user.id
      });

      const { error } = await supabase
        .from('saved_carts' as any)
        .upsert({
          user_id: user.id,
          store_id: storeId,
          store_name: cart.storeName,
          store_slug: cart.storeSlug,
          items: filteredItems,
          coupon_code: cart.couponCode || null,
          coupon_discount: cart.couponDiscount || 0,
          updated_at: new Date().toISOString()
        } as any, {
          onConflict: 'user_id,store_id'
        });

      if (error) {
        console.error('❌ Error saving cart:', error);
        throw error;
      }

      console.log('✅ Cart saved successfully with', filteredItems.length, 'items');
    } catch (error) {
      console.error('❌ Failed to save cart to database:', error);
    }
  }, [user]);

  /**
   * Carrega todos os carrinhos salvos do usuário
   */
  const loadCartsFromDatabase = useCallback(async (): Promise<SavedCartDB[] | null> => {
    if (!user) {
      console.log('⚠️ User not logged in, skipping cart load');
      return null;
    }

    try {
      console.log('📥 Loading carts from database for user:', user.id);

      const { data, error } = await supabase
        .from('saved_carts' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading carts:', error);
        throw error;
      }

      if (!data) return null;

      console.log('✅ Loaded carts:', {
        count: data?.length || 0,
        stores: data?.map((c: any) => ({
          name: c.store_name,
          storeId: c.store_id,
          itemCount: c.items?.length || 0,
          validItemCount: (c.items || []).filter((i: any) => i.storeId === c.store_id).length
        }))
      });

      return data as unknown as SavedCartDB[];
    } catch (error) {
      console.error('❌ Failed to load carts from database:', error);
      return null;
    }
  }, [user]);

  /**
   * Remove um carrinho salvo do banco de dados
   * Usado após finalizar um pedido
   * @returns Promise<void> - Propaga erros para permitir retry
   */
  const deleteCartFromDatabase = useCallback(async (storeId: string): Promise<void> => {
    if (!user) {
      console.log('⚠️ User not logged in, skipping cart deletion');
      return;
    }

    console.log('🗑️ Deleting saved cart for store:', storeId);

    const { error } = await supabase
      .from('saved_carts' as any)
      .delete()
      .eq('user_id', user.id)
      .eq('store_id', storeId);

    if (error) {
      console.error('❌ Error deleting cart:', error);
      throw error; // Propagar erro para permitir retry
    }

    console.log('✅ Cart deleted successfully from database');
  }, [user]);

  /**
   * Mescla carrinhos do banco com carrinhos locais
   * Prioriza o mais recente (maior updated_at)
   * Filtra itens para garantir que pertencem à loja correta
   */
  const mergeWithLocalCarts = useCallback((
    dbCarts: SavedCartDB[],
    localCarts: Record<string, Cart>
  ): Record<string, Cart> => {
    console.log('🔄 Merging carts:', {
      dbCount: dbCarts.length,
      localCount: Object.keys(localCarts).length
    });

    const merged: Record<string, Cart> = { ...localCarts };
    let recoveredItems = 0;

    dbCarts.forEach(dbCart => {
      // Filtrar itens para garantir que pertencem à loja correta
      const validItems = (dbCart.items || []).filter(
        (item: any) => item.storeId === dbCart.store_id
      );

      if (validItems.length === 0) {
        console.log(`⚠️ No valid items for ${dbCart.store_name} after filtering (had ${dbCart.items?.length || 0} items)`);
        return; // Pular este carrinho
      }

      const localCart = localCarts[dbCart.store_id];
      
      // Se não existe local ou o do banco é mais recente
      const dbDate = new Date(dbCart.updated_at).getTime();
      const localStorageDate = localStorage.getItem(`cart_${dbCart.store_id}_date`);
      const localDate = localStorageDate ? new Date(localStorageDate).getTime() : 0;

      if (!localCart || dbDate > localDate) {
        console.log(`📦 Using database cart for ${dbCart.store_name} (more recent) - ${validItems.length} valid items`);
        
        merged[dbCart.store_id] = {
          storeId: dbCart.store_id,
          storeName: dbCart.store_name,
          storeSlug: dbCart.store_slug || undefined,
          items: validItems,
          couponCode: dbCart.coupon_code || undefined,
          couponDiscount: dbCart.coupon_discount || 0
        };
        
        recoveredItems += validItems.length;
      } else {
        console.log(`💻 Using local cart for ${dbCart.store_name} (more recent)`);
      }
    });

    if (recoveredItems > 0) {
      console.log(`✅ Recovered ${recoveredItems} valid items from database`);
    }

    return merged;
  }, []);

  return {
    saveCartToDatabase,
    loadCartsFromDatabase,
    deleteCartFromDatabase,
    mergeWithLocalCarts
  };
};
