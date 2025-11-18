import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

// Validation schema for profile data
const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo').optional().or(z.literal('')),
  phone: z.string()
    .transform(val => val?.replace(/\D/g, '') || '')
    .refine(val => !val || val.length >= 10, {
      message: 'Telefone deve ter pelo menos 10 dígitos'
    }).optional().or(z.literal('')),
  cep: z.string().trim().max(9, 'CEP inválido').optional().or(z.literal('')),
  city: z.string().trim().max(100, 'Nome da cidade muito longo').optional().or(z.literal('')),
  street: z.string().trim().max(200, 'Nome da rua muito longo').optional().or(z.literal('')),
  street_number: z.string().trim().max(20, 'Número muito longo').optional().or(z.literal('')),
  neighborhood: z.string().trim().max(100, 'Nome do bairro muito longo').optional().or(z.literal('')),
  complement: z.string().trim().max(100, 'Complemento muito longo').optional().or(z.literal('')),
});

export interface ProfileData {
  full_name?: string;
  phone?: string;
  cep?: string;
  city?: string;
  street?: string;
  street_number?: string;
  neighborhood?: string;
  complement?: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: ProfileData) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Validate input data
      const validatedData = profileSchema.parse(profileData);

      const { data, error } = await supabase
        .from('profiles')
        .update(validatedData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram atualizadas com sucesso.',
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof z.ZodError 
        ? error.issues[0]?.message || 'Dados inválidos'
        : error.message;
      
      toast({
        title: 'Erro ao atualizar perfil',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
};
