import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  store_id: string;
  created_at: string;
  is_active: boolean;
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
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

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

  const updateCategory = async (categoryId: string, newName: string) => {
    try {
      // Buscar o nome antigo da categoria
      const oldCategory = categories.find(c => c.id === categoryId);
      if (!oldCategory) {
        toast.error('Categoria não encontrada');
        return;
      }

      const oldName = oldCategory.name;
      console.log('🔄 Atualizando categoria:', { 
        categoryId, 
        oldName, 
        newName, 
        storeId: oldCategory.store_id 
      });

      // Atualizar a categoria
      const { data, error } = await supabase
        .from('product_categories')
        .update({ name: newName })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar categoria:', error);
        throw error;
      }

      console.log('✅ Categoria atualizada:', data);

      // Buscar produtos antes da atualização
      const { data: beforeProducts, error: beforeError } = await supabase
        .from('products')
        .select('id, name, category')
        .eq('store_id', oldCategory.store_id)
        .eq('category', oldName);

      if (beforeError) {
        console.error('❌ Erro ao buscar produtos:', beforeError);
      } else {
        console.log(`📦 Encontrados ${beforeProducts?.length || 0} produtos com categoria "${oldName}"`);
      }

      // Atualizar todos os produtos que usam essa categoria
      const { data: updatedProducts, error: productsError } = await supabase
        .from('products')
        .update({ category: newName })
        .eq('store_id', oldCategory.store_id)
        .eq('category', oldName)
        .select('id, name, category');

      if (productsError) {
        console.error('❌ Erro ao atualizar produtos:', productsError);
        toast.error('Categoria atualizada, mas houve erro ao atualizar os produtos');
      } else {
        console.log(`✅ ${updatedProducts?.length || 0} produtos atualizados para categoria "${newName}":`, updatedProducts);
      }
      
      setCategories(categories.map(c => c.id === categoryId ? data : c));
      toast.success(`Categoria e ${updatedProducts?.length || 0} produtos atualizados com sucesso!`);
      return data;
    } catch (error: any) {
      console.error('❌ Erro geral ao atualizar categoria:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma categoria com este nome');
      } else {
        toast.error('Erro ao atualizar categoria');
      }
      throw error;
    }
  };

  const toggleCategoryStatus = async (categoryId: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .update({ is_active: isActive })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;
      
      setCategories(categories.map(c => c.id === categoryId ? data : c));
      toast.success(isActive ? 'Categoria ativada!' : 'Categoria desativada!');
      return data;
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast.error('Erro ao atualizar status da categoria');
      throw error;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      // Verificar se há produtos vinculados a esta categoria
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', category.store_id)
        .eq('category', category.name);

      if (countError) throw countError;

      if (count && count > 0) {
        toast.error(`Não é possível excluir. Existem ${count} produto(s) vinculado(s) a esta categoria.`);
        return;
      }

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

  const reorderCategories = async (reorderedCategories: Category[]) => {
    try {
      const updates = reorderedCategories.map((category, index) => 
        supabase
          .from('product_categories')
          .update({ display_order: index } as any)
          .eq('id', category.id)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error('Erro ao reordenar categorias');
      }
      
      setCategories(reorderedCategories);
      toast.success('Ordem das categorias atualizada!');
    } catch (error: any) {
      console.error('Error reordering categories:', error);
      toast.error('Erro ao reordenar categorias');
      throw error;
    }
  };

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    reorderCategories,
    refetch: fetchCategories
  };
};
