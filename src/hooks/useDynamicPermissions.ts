import { useMemo } from 'react';
import { useOrderStatuses } from './useOrderStatuses';
import { PERMISSION_MODULES, PermissionModule } from '@/config/permissions';

/**
 * Hook que gera permissões dinâmicas baseado em configurações do banco
 * Detecta automaticamente novos status e filtros
 */
export const useDynamicPermissions = (storeId?: string) => {
  const { statuses } = useOrderStatuses(storeId);

  const modules = useMemo(() => {
    // Clona a estrutura de módulos
    const dynamicModules = JSON.parse(JSON.stringify(PERMISSION_MODULES)) as PermissionModule[];

    // Encontra o módulo de pedidos
    const ordersModule = dynamicModules.find(m => m.key === 'orders');
    if (!ordersModule) return dynamicModules;

    // Encontra o subgrupo de filtros
    const filtersSubgroup = ordersModule.subgroups?.find(sg => sg.key === 'filters');
    if (!filtersSubgroup) return dynamicModules;

    // Encontra o subgrupo de mudanças de status
    const statusChangesSubgroup = ordersModule.subgroups?.find(sg => sg.key === 'status_changes');

    // Limpa permissões de filtro e status existentes
    filtersSubgroup.permissions = filtersSubgroup.permissions.filter(
      p => p.key === 'view_all_orders' || p.key === 'view_pending_orders'
    );

    if (statusChangesSubgroup) {
      statusChangesSubgroup.permissions = statusChangesSubgroup.permissions.filter(
        p => p.key === 'change_any_status'
      );
    }

    // Adiciona permissões dinâmicas baseado nos status configurados
    if (statuses && statuses.length > 0) {
      statuses.forEach(status => {
        // Adiciona filtro de visualização
        filtersSubgroup.permissions.push({
          key: `view_${status.status_key}_orders`,
          label: status.status_label,
          description: `Ver pedidos com status: ${status.status_label}`,
          defaultValue: true,
        });

        // Adiciona permissão de mudança de status
        if (statusChangesSubgroup) {
          statusChangesSubgroup.permissions.push({
            key: `change_status_${status.status_key}`,
            label: `Para ${status.status_label}`,
            description: `Alterar status para: ${status.status_label}`,
            defaultValue: status.status_key === 'confirmed' || status.status_key === 'preparing',
          });
        }
      });
    }

    return dynamicModules;
  }, [statuses]);

  return {
    modules,
    isLoading: !statuses || statuses.length === 0,
  };
};
