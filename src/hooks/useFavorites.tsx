import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select('store_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data?.map(f => f.store_id) || [];
    },
    enabled: !!user,
  });

  const addFavorite = useMutation({
    mutationFn: async (storeId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, store_id: storeId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Loja adicionada aos favoritos!');
    },
    onError: () => {
      toast.error('Erro ao adicionar favorito');
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (storeId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', storeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Loja removida dos favoritos!');
    },
    onError: () => {
      toast.error('Erro ao remover favorito');
    },
  });

  const isFavorite = (storeId: string) => favorites.includes(storeId);

  const toggleFavorite = (storeId: string) => {
    if (!user) {
      toast.error('Faça login para adicionar favoritos');
      return;
    }

    if (isFavorite(storeId)) {
      removeFavorite.mutate(storeId);
    } else {
      addFavorite.mutate(storeId);
    }
  };

  return {
    favorites,
    isFavorite,
    toggleFavorite,
  };
};
