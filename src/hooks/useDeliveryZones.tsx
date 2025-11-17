import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useMemo } from 'react';

export interface DeliveryZone {
  id: string;
  store_id: string;
  city: string;
  neighborhood: string | null;
  delivery_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useDeliveryZones = (storeId: string | undefined) => {
  const queryClient = useQueryClient();

  // Query para listar zonas
  const { data: zones, isLoading } = useQuery({
    queryKey: ['delivery-zones', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('store_id', storeId)
        .order('city', { ascending: true })
        .order('neighborhood', { ascending: true, nullsFirst: true });
      
      if (error) throw error;
      return data as DeliveryZone[];
    },
    enabled: !!storeId,
  });

  // Mutation para criar zona
  const createZone = useMutation({
    mutationFn: async (zone: Omit<DeliveryZone, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .insert(zone)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', storeId] });
      toast({
        title: "Zona de entrega criada",
        description: "A zona de entrega foi adicionada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar zona de entrega",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar zona
  const updateZone = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryZone> & { id: string }) => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', storeId] });
      toast({
        title: "Zona de entrega atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar zona de entrega",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar zona
  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', storeId] });
      toast({
        title: "Zona de entrega removida",
        description: "A zona de entrega foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover zona de entrega",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Agrupar zonas por cidade
  const zonesByCity = useMemo(() => {
    if (!zones) return {};
    
    return zones.reduce((acc, zone) => {
      if (!acc[zone.city]) {
        acc[zone.city] = [];
      }
      acc[zone.city].push(zone);
      return acc;
    }, {} as Record<string, DeliveryZone[]>);
  }, [zones]);

  return {
    zones,
    zonesByCity,
    isLoading,
    createZone,
    updateZone,
    deleteZone,
  };
};
