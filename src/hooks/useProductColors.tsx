import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductColor {
  id: string;
  product_id: string;
  name: string;
  hex_code: string;
  image_id: string | null;
  image_url?: string | null;
  price_adjustment: number;
  display_order: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ColorFormData {
  name: string;
  hex_code: string;
  image_id?: string | null;
  price_adjustment?: number;
  is_available?: boolean;
}

export const useProductColors = (productId?: string) => {
  const queryClient = useQueryClient();

  // Fetch colors for a product
  const colorsQuery = useQuery({
    queryKey: ['product-colors', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('product_colors' as any)
        .select(`
          *,
          product_images:image_id (
            image_url
          )
        `)
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      // Map the data to include image_url from the joined table
      const colors = (data || []).map((color: any) => ({
        ...color,
        image_url: color.product_images?.image_url || null,
        product_images: undefined, // Remove the nested object
      })) as ProductColor[];
      
      return colors;
    },
    enabled: !!productId,
  });

  // Create color mutation
  const createColorMutation = useMutation({
    mutationFn: async ({ productId, colorData }: { productId: string; colorData: ColorFormData }) => {
      // Get the highest display_order for this product
      const { data: existingColors } = await supabase
        .from('product_colors' as any)
        .select('display_order')
        .eq('product_id', productId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextDisplayOrder = existingColors && existingColors.length > 0 
        ? (existingColors[0] as any).display_order + 1 
        : 0;

      const { data, error } = await supabase
        .from('product_colors' as any)
        .insert({
          product_id: productId,
          name: colorData.name,
          hex_code: colorData.hex_code,
          image_id: colorData.image_id || null,
          price_adjustment: colorData.price_adjustment || 0,
          is_available: colorData.is_available !== false,
          display_order: nextDisplayOrder,
        })
        .select()
        .single();

      if (error) throw error;

      // Update product has_colors flag
      await supabase
        .from('products')
        .update({ has_colors: true } as any)
        .eq('id', productId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-colors', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Cor adicionada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating color:', error);
      toast.error('Erro ao adicionar cor');
    },
  });

  // Update color mutation
  const updateColorMutation = useMutation({
    mutationFn: async ({ colorId, colorData }: { colorId: string; colorData: Partial<ColorFormData> }) => {
      const { data, error } = await supabase
        .from('product_colors' as any)
        .update(colorData)
        .eq('id', colorId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['product-colors', data.product_id] });
      toast.success('Cor atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating color:', error);
      toast.error('Erro ao atualizar cor');
    },
  });

  // Delete color mutation
  const deleteColorMutation = useMutation({
    mutationFn: async ({ colorId, productId }: { colorId: string; productId: string }) => {
      const { error } = await supabase
        .from('product_colors' as any)
        .delete()
        .eq('id', colorId);

      if (error) throw error;

      // Check if there are any colors left for this product
      const { data: remainingColors } = await supabase
        .from('product_colors' as any)
        .select('id')
        .eq('product_id', productId);

      // If no colors left, update has_colors flag
      if (!remainingColors || remainingColors.length === 0) {
        await supabase
          .from('products')
          .update({ has_colors: false } as any)
          .eq('id', productId);
      }

      return colorId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-colors', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Cor removida com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting color:', error);
      toast.error('Erro ao remover cor');
    },
  });

  // Toggle color availability
  const toggleColorAvailability = useMutation({
    mutationFn: async ({ colorId, isAvailable }: { colorId: string; isAvailable: boolean }) => {
      const { data, error } = await supabase
        .from('product_colors' as any)
        .update({ is_available: isAvailable })
        .eq('id', colorId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['product-colors', data.product_id] });
      toast.success(data.is_available ? 'Cor ativada!' : 'Cor desativada!');
    },
    onError: (error) => {
      console.error('Error toggling color availability:', error);
      toast.error('Erro ao alterar disponibilidade');
    },
  });

  // Reorder colors
  const reorderColorsMutation = useMutation({
    mutationFn: async ({ productId, reorderedColors }: { productId: string; reorderedColors: ProductColor[] }) => {
      const updates = reorderedColors.map((color, index) => 
        supabase
          .from('product_colors' as any)
          .update({ display_order: index })
          .eq('id', color.id)
      );

      await Promise.all(updates);
      return reorderedColors;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-colors', variables.productId] });
      toast.success('Ordem das cores atualizada!');
    },
    onError: (error) => {
      console.error('Error reordering colors:', error);
      toast.error('Erro ao reordenar cores');
    },
  });

  return {
    colors: colorsQuery.data || [],
    isLoading: colorsQuery.isLoading,
    createColor: createColorMutation.mutate,
    updateColor: updateColorMutation.mutate,
    deleteColor: deleteColorMutation.mutate,
    toggleAvailability: toggleColorAvailability.mutate,
    reorderColors: reorderColorsMutation.mutate,
  };
};
