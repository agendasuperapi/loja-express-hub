import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  store_id: string;
  created_at: string;
}

export const useCategories = (storeId: string | undefined) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('store_id', storeId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [storeId]);

  const addCategory = async (name: string) => {
    if (!storeId) return;

    try {
      const { data, error } = await supabase
        .from('product_categories')
        .insert([{ store_id: storeId, name }])
        .select()
        .single();

      if (error) throw error;
      
      setCategories([...categories, data]);
      toast.success('Categoria adicionada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Error adding category:', error);
      if (error.code === '23505') {
        toast.error('Esta categoria já existe');
      } else {
        toast.error('Erro ao adicionar categoria');
      }
      throw error;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      setCategories(categories.filter(c => c.id !== categoryId));
      toast.success('Categoria removida com sucesso!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao remover categoria');
    }
  };

  return {
    categories,
    loading,
    addCategory,
    deleteCategory,
    refetch: fetchCategories
  };
};
