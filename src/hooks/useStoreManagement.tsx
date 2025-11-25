import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface StoreFormData {
  name: string;
  slug: string;
  description?: string;
  category: string;
  address?: string;
  pickup_address?: string;
  store_cep?: string;
  store_city?: string;
  store_street?: string;
  store_street_number?: string;
  store_neighborhood?: string;
  store_complement?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  delivery_fee?: number;
  min_order_value?: number;
  avg_delivery_time?: number;
  show_avg_delivery_time?: boolean;
  accepts_delivery?: boolean;
  accepts_pickup?: boolean;
  accepts_pix?: boolean;
  accepts_card?: boolean;
  accepts_cash?: boolean;
  logo_url?: string;
  banner_url?: string;
  operating_hours?: any;
  menu_label?: string;
  pix_key?: string;
  show_pix_key_to_customer?: boolean;
  pix_message_title?: string;
  pix_message_description?: string;
  pix_message_footer?: string;
  pix_message_button_text?: string;
  pix_message_enabled?: boolean;
  pix_copiacola_message_title?: string;
  pix_copiacola_message_description?: string;
  pix_copiacola_message_footer?: string;
  pix_copiacola_message_button_text?: string;
  pix_copiacola_button_text?: string;
  pix_copiacola_message_enabled?: boolean;
  allow_orders_when_closed?: boolean;
  require_delivery_zone?: boolean;
  product_layout_template?: string;
  product_layout_template_desktop?: string;
  product_layout_template_mobile?: string;
  show_address_on_store_page?: boolean;
  show_phone_on_store_page?: boolean;
  show_whatsapp_on_store_page?: boolean;
}

export const useStoreManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const myStoreQuery = useQuery({
    queryKey: ['my-store', user?.id],
    staleTime: 5 * 60 * 1000, // 5 minutos - evita refetch ao voltar ao foco
    queryFn: async () => {
      if (!user?.id) return null;

      console.log('🔍 [useStoreManagement] Buscando loja para user_id:', user.id);

      // Primeiro, tentar buscar loja onde o usuário é owner
      const { data: ownerStore, error: ownerError } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownerError) throw ownerError;
      
      // Se encontrou como owner, retornar
      if (ownerStore) {
        console.log('✅ [useStoreManagement] Loja encontrada (owner):', {
          store_id: ownerStore.id,
          store_name: ownerStore.name,
          address_data: {
            store_cep: ownerStore.store_cep,
            store_city: ownerStore.store_city,
            store_street: ownerStore.store_street,
            store_street_number: ownerStore.store_street_number,
            store_neighborhood: ownerStore.store_neighborhood,
            store_complement: ownerStore.store_complement,
          }
        });
        return ownerStore;
      }

      // Se não é owner, buscar loja onde é funcionário ativo
      const { data: employeeData, error: employeeError } = await supabase
        .from('store_employees' as any)
        .select(`
          store_id,
          stores:store_id (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (employeeError) throw employeeError;
      
      // Retornar a loja do funcionário
      const employeeStore = employeeData ? (employeeData as any).stores : null;
      if (employeeStore) {
        console.log('✅ [useStoreManagement] Loja encontrada (employee):', {
          store_id: employeeStore.id,
          store_name: employeeStore.name,
          address_data: {
            store_cep: employeeStore.store_cep,
            store_city: employeeStore.store_city,
            store_street: employeeStore.store_street,
            store_street_number: employeeStore.store_street_number,
            store_neighborhood: employeeStore.store_neighborhood,
            store_complement: employeeStore.store_complement,
          }
        });
      }
      return employeeStore;
    },
    enabled: !!user,
  });

  const createStoreMutation = useMutation({
    mutationFn: async (storeData: StoreFormData & { owner_name?: string; owner_phone?: string }) => {
      let ownerId = user?.id;
      let newUserCreated = false;

      // Se estiver logado, usar o usuário atual
      if (ownerId) {
        console.log('👤 Usuário já logado, usando conta existente:', ownerId);
        
        // Atualizar perfil com dados do proprietário se fornecidos
        if (storeData.owner_name || storeData.owner_phone) {
          console.log('📝 Atualizando perfil do proprietário...');
          const profileUpdate: any = {};
          if (storeData.owner_name) profileUpdate.full_name = storeData.owner_name;
          if (storeData.owner_phone) profileUpdate.phone = storeData.owner_phone;
          
          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', ownerId);
          
          if (profileError) {
            console.error('❌ Erro ao atualizar perfil:', profileError);
          } else {
            console.log('✅ Perfil atualizado com sucesso');
          }
        }
        
        // Adicionar role de store_owner se não tiver
        console.log('👔 Verificando/adicionando role de store_owner...');
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: ownerId,
            role: 'store_owner'
          });

        if (roleError) {
          if (!roleError.message.includes('duplicate')) {
            console.error('❌ Erro ao adicionar role:', roleError);
          } else {
            console.log('ℹ️ Role já existe para este usuário');
          }
        } else {
          console.log('✅ Role adicionada com sucesso');
        }
      }
      // Se não estiver logado, criar conta de usuário
      else if (storeData.email && storeData.password) {
        console.log('📝 Iniciando criação de nova conta...');
        
        // Criar conta de usuário com auto-confirmação
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: storeData.email,
          password: storeData.password,
          options: {
            emailRedirectTo: `https://ofertas.app/dashboard`,
            data: {
              full_name: storeData.owner_name || storeData.name,
              phone: storeData.owner_phone || storeData.phone,
            }
          }
        });

        if (authError) {
          console.error('❌ Erro ao criar conta:', authError);
          
          // Tratamento específico para rate limiting
          if (authError.message.includes('429') || authError.message.toLowerCase().includes('rate limit')) {
            throw new Error('Muitas tentativas de cadastro. Por favor, aguarde 10 minutos e tente novamente.');
          }
          
          // Tratamento para email já cadastrado
          if (authError.message.toLowerCase().includes('already registered') || 
              authError.message.toLowerCase().includes('already been registered')) {
            throw new Error('Este email já está cadastrado. Por favor, use o Login Lojista ou escolha outro email.');
          }
          
          throw new Error(`Erro ao criar conta: ${authError.message}`);
        }
        
        if (!authData.user) {
          console.error('❌ Nenhum usuário retornado do signUp');
          throw new Error('Erro ao criar conta de usuário. Por favor, tente novamente.');
        }

        // Verificar se o usuário foi realmente criado no banco (proteção contra rate limiting)
        const { data: userCheck, error: userCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (userCheckError) {
          console.error('❌ Erro ao verificar usuário:', userCheckError);
          throw new Error('Erro ao verificar criação do usuário. Por favor, aguarde e tente novamente.');
        }

        if (!userCheck) {
          console.error('❌ Usuário não foi criado no banco');
          throw new Error('Conta não foi criada completamente. Por favor, aguarde alguns minutos e tente novamente.');
        }

        console.log('✅ Conta criada e verificada com sucesso:', authData.user.id);
        ownerId = authData.user.id;
        newUserCreated = true;

        // Adicionar role de store_owner
        console.log('👔 Adicionando role de store_owner...');
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: ownerId,
            role: 'store_owner'
          });

        if (roleError) {
          if (!roleError.message.includes('duplicate')) {
            console.error('❌ Erro ao adicionar role:', roleError);
          } else {
            console.log('ℹ️ Role já existe para este usuário');
          }
        } else {
          console.log('✅ Role adicionada com sucesso');
        }

        // Fazer login automático após criar a conta
        console.log('🔐 Fazendo login automático...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: storeData.email,
          password: storeData.password,
        });

        if (signInError) {
          console.error('❌ Erro ao fazer login automático:', signInError);
          // Não bloquear aqui, pois o usuário pode fazer login manualmente depois
        } else if (signInData.session) {
          console.log('✅ Login realizado com sucesso');
        }
      }

      if (!ownerId) {
        console.error('❌ Nenhum owner_id disponível');
        throw new Error('Usuário não autenticado. Por favor, faça login.');
      }

      // Remover password, confirmPassword, owner_name e owner_phone antes de criar a loja
      const { password, confirmPassword, owner_name, owner_phone, ...storeDataWithoutPassword } = storeData;

      console.log('🏪 Criando loja para owner_id:', ownerId);
      const { data, error } = await supabase
        .from('stores')
        .insert({
          ...storeDataWithoutPassword,
          owner_id: ownerId,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar loja:', error);
        throw error;
      }

      console.log('✅ Loja criada com sucesso:', data);
      return { store: data, newUserCreated };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-store'] });
      // O toast será exibido pelo componente que chamou createStore
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar loja',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: async ({ id, slug, ...storeData }: StoreFormData & { id: string }) => {
      console.log('💾 [useStoreManagement] Atualizando loja:', {
        store_id: id,
        address_data: {
          store_cep: storeData.store_cep,
          store_city: storeData.store_city,
          store_street: storeData.store_street,
          store_street_number: storeData.store_street_number,
          store_neighborhood: storeData.store_neighborhood,
          store_complement: storeData.store_complement,
        }
      });

      // Validar slug antes de atualizar (double-check no backend)
      if (slug) {
        const { data: existingStore, error: checkError } = await supabase
          .from('stores')
          .select('id')
          .eq('slug', slug)
          .neq('id', id)
          .maybeSingle();

        if (checkError) throw checkError;
        
        if (existingStore) {
          throw new Error(`A URL "${slug}" já está em uso por outra loja.`);
        }
      }

      const { data, error } = await supabase
        .from('stores')
        .update({
          ...storeData,
          slug,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ [useStoreManagement] Erro ao atualizar loja:', error);
        throw error;
      }
      
      console.log('✅ [useStoreManagement] Loja atualizada com sucesso:', {
        store_id: data.id,
        address_data: {
          store_cep: data.store_cep,
          store_city: data.store_city,
          store_street: data.store_street,
          store_street_number: data.store_street_number,
          store_neighborhood: data.store_neighborhood,
          store_complement: data.store_complement,
        }
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-store'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      console.log('🔄 [useStoreManagement] Queries invalidadas, aguardando refetch...');
      toast({
        title: 'Loja atualizada!',
        description: 'As informações da sua loja foram atualizadas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar loja',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    myStore: myStoreQuery.data,
    isLoading: myStoreQuery.isLoading,
    createStore: createStoreMutation.mutate,
    updateStore: updateStoreMutation.mutate,
    isCreating: createStoreMutation.isPending,
    isUpdating: updateStoreMutation.isPending,
  };
};
