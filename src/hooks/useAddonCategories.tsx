import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AddonCategory {
  id: string;
  store_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  min_items: number;
  max_items: number | null;
  is_exclusive: boolean;
  created_at: string;
  updated_at: string;
}

export const useAddonCategories = (storeId: string | undefined) => {
  const [categories, setCategories] = useState<AddonCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchCategories();
    }
  }, [storeId]);

  const fetchCategories = async () => {
    if (!storeId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('addon_categories')
        .select('*')
        .eq('store_id', storeId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching addon categories:', error);
      toast.error('Erro ao carregar categorias de adicionais');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (name: string, minItems = 0, maxItems: number | null = null, isExclusive = false) => {
    if (!storeId) return;

    try {
      const maxOrder = categories.length > 0
        ? Math.max(...categories.map(c => c.display_order))
        : -1;

      const { data, error } = await (supabase as any)
        .from('addon_categories')
        .insert({
          store_id: storeId,
          name,
          display_order: maxOrder + 1,
          is_active: true,
          min_items: minItems,
          max_items: isExclusive ? 1 : maxItems,
          is_exclusive: isExclusive
        })
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      toast.success('Categoria adicionada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Error adding addon category:', error);
      toast.error(error.message || 'Erro ao adicionar categoria');
      throw error;
    }
  };

  const updateCategory = async (categoryId: string, updates: Partial<AddonCategory>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('addon_categories')
        .update(updates)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;

      setCategories(categories.map(c => c.id === categoryId ? data : c));
      toast.success('Categoria atualizada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Error updating addon category:', error);
      toast.error(error.message || 'Erro ao atualizar categoria');
      throw error;
    }
  };

  const toggleCategoryStatus = async (categoryId: string, isActive: boolean) => {
    try {
      const { data, error } = await (supabase as any)
        .from('addon_categories')
        .update({ is_active: isActive })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;

      setCategories(categories.map(c => c.id === categoryId ? data : c));
      toast.success(isActive ? 'Categoria ativada!' : 'Categoria desativada!');
      return data;
    } catch (error: any) {
      console.error('Error toggling addon category status:', error);
      toast.error(error.message || 'Erro ao alterar status da categoria');
      throw error;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      // Check if there are addons using this category
      const { data: addonsInCategory, error: checkError } = await (supabase as any)
        .from('product_addons')
        .select('id')
        .eq('category_id', categoryId)
        .limit(1);

      if (checkError) throw checkError;

      if (addonsInCategory && addonsInCategory.length > 0) {
        toast.error('Não é possível excluir uma categoria com adicionais associados. Remova ou altere a categoria dos adicionais primeiro.');
        return;
      }

      const { error } = await (supabase as any)
        .from('addon_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(categories.filter(c => c.id !== categoryId));
      toast.success('Categoria excluída com sucesso!');
    } catch (error: any) {
      console.error('Error deleting addon category:', error);
      toast.error(error.message || 'Erro ao excluir categoria');
      throw error;
    }
  };

  const reorderCategories = async (newOrder: AddonCategory[]) => {
    try {
      // Update local state immediately for smooth UX
      setCategories(newOrder);

      // Update all categories with their new display_order
      const updates = newOrder.map((category, index) => 
        (supabase as any)
          .from('addon_categories')
          .update({ display_order: index })
          .eq('id', category.id)
      );

      await Promise.all(updates);
      toast.success('Ordem das categorias atualizada!');
    } catch (error: any) {
      console.error('Error reordering categories:', error);
      toast.error('Erro ao reordenar categorias');
      // Revert on error
      fetchCategories();
      throw error;
    }
  };

  const refetch = () => {
    fetchCategories();
  };

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    reorderCategories,
    refetch
  };
};
