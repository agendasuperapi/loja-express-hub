import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ColorSizeVariant {
  id: string;
  product_id: string;
  color_id: string;
  size_id: string;
  is_available: boolean;
  stock_quantity: number | null;
  price_adjustment: number;
  created_at: string;
  updated_at: string;
}

export interface VariantFormData {
  product_id: string;
  color_id: string;
  size_id: string;
  is_available?: boolean;
  stock_quantity?: number | null;
  price_adjustment?: number;
}

export const useColorSizeVariants = (productId?: string) => {
  const queryClient = useQueryClient();

  // Fetch all variants for a product
  const variantsQuery = useQuery({
    queryKey: ['color-size-variants', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('color_size_variants' as any)
        .select('*')
        .eq('product_id', productId);

      if (error) throw error;
      return (data || []) as any as ColorSizeVariant[];
    },
    enabled: !!productId,
  });

  // Create single variant
  const createVariantMutation = useMutation({
    mutationFn: async (variantData: VariantFormData) => {
      const { data, error } = await supabase
        .from('color_size_variants' as any)
        .insert({
          ...variantData,
          is_available: variantData.is_available !== false,
          stock_quantity: variantData.stock_quantity || null,
          price_adjustment: variantData.price_adjustment || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as any as ColorSizeVariant;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['color-size-variants', data.product_id] });
      toast.success('Variante adicionada!');
    },
    onError: (error: any) => {
      console.error('Error creating variant:', error);
      if (error.code === '23505') {
        toast.error('Esta combinação de cor e tamanho já existe!');
      } else {
        toast.error('Erro ao criar variante');
      }
    },
  });

  // Batch create variants (for auto-generation)
  const batchCreateVariantsMutation = useMutation({
    mutationFn: async (variants: VariantFormData[]) => {
      const { data, error } = await supabase
        .from('color_size_variants' as any)
        .upsert(
          variants.map(v => ({
            ...v,
            is_available: v.is_available !== false,
            stock_quantity: v.stock_quantity || null,
            price_adjustment: v.price_adjustment || 0,
          })),
          { onConflict: 'product_id,color_id,size_id', ignoreDuplicates: true }
        )
        .select();

      if (error) throw error;
      return (data || []) as any as ColorSizeVariant[];
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['color-size-variants', variables[0].product_id] });
        toast.success(`${variables.length} variante(s) gerada(s)!`);
      }
    },
    onError: (error) => {
      console.error('Error batch creating variants:', error);
      toast.error('Erro ao gerar variantes');
    },
  });

  // Update variant
  const updateVariantMutation = useMutation({
    mutationFn: async ({ variantId, updates }: { variantId: string; updates: Partial<VariantFormData> }) => {
      const { data, error } = await supabase
        .from('color_size_variants' as any)
        .update(updates)
        .eq('id', variantId)
        .select()
        .single();

      if (error) throw error;
      return data as any as ColorSizeVariant;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['color-size-variants', data.product_id] });
      toast.success('Variante atualizada!');
    },
    onError: (error) => {
      console.error('Error updating variant:', error);
      toast.error('Erro ao atualizar variante');
    },
  });

  // Toggle variant availability
  const toggleVariantMutation = useMutation({
    mutationFn: async ({ variantId, isAvailable }: { variantId: string; isAvailable: boolean }) => {
      const { data, error } = await supabase
        .from('color_size_variants' as any)
        .update({ is_available: isAvailable })
        .eq('id', variantId)
        .select()
        .single();

      if (error) throw error;
      return data as any as ColorSizeVariant;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['color-size-variants', data.product_id] });
      toast.success(data.is_available ? 'Variante ativada!' : 'Variante desativada!');
    },
    onError: (error) => {
      console.error('Error toggling variant:', error);
      toast.error('Erro ao alterar disponibilidade');
    },
  });

  // Delete variant
  const deleteVariantMutation = useMutation({
    mutationFn: async ({ variantId, productId }: { variantId: string; productId: string }) => {
      const { error } = await supabase
        .from('color_size_variants' as any)
        .delete()
        .eq('id', variantId);

      if (error) throw error;
      return variantId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['color-size-variants', variables.productId] });
      toast.success('Variante removida!');
    },
    onError: (error) => {
      console.error('Error deleting variant:', error);
      toast.error('Erro ao remover variante');
    },
  });

  // Generate all possible combinations for a product
  const generateAllCombinationsMutation = useMutation({
    mutationFn: async ({ productId, colorIds, sizeIds }: { productId: string; colorIds: string[]; sizeIds: string[] }) => {
      const combinations: VariantFormData[] = [];
      
      for (const colorId of colorIds) {
        for (const sizeId of sizeIds) {
          combinations.push({
            product_id: productId,
            color_id: colorId,
            size_id: sizeId,
            is_available: true,
            price_adjustment: 0,
          });
        }
      }

      const { data, error } = await supabase
        .from('color_size_variants' as any)
        .upsert(combinations, { 
          onConflict: 'product_id,color_id,size_id',
          ignoreDuplicates: true 
        })
        .select();

      if (error) throw error;
      return (data || []) as any as ColorSizeVariant[];
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['color-size-variants', variables.productId] });
      toast.success(`${data.length} combinação(ões) gerada(s)!`);
    },
    onError: (error) => {
      console.error('Error generating combinations:', error);
      toast.error('Erro ao gerar combinações');
    },
  });

  return {
    variants: variantsQuery.data || [],
    isLoading: variantsQuery.isLoading,
    createVariant: createVariantMutation.mutate,
    batchCreateVariants: batchCreateVariantsMutation.mutate,
    updateVariant: updateVariantMutation.mutate,
    toggleVariant: toggleVariantMutation.mutate,
    deleteVariant: deleteVariantMutation.mutate,
    generateAllCombinations: generateAllCombinationsMutation.mutate,
  };
};
