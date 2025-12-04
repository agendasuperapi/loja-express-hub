import { EmployeePermissions } from '@/hooks/useStoreEmployees';

/**
 * Sistema de Permissões Dinâmico
 * 
 * Este arquivo centraliza todas as definições de permissões do sistema.
 * Quando novos módulos, filtros ou funcionalidades são adicionados,
 * basta atualizar este arquivo para que apareçam automaticamente
 * na interface de gerenciamento de funcionários.
 */

export interface PermissionModule {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  permissions: PermissionItem[];
  subgroups?: PermissionSubgroup[];
}

export interface PermissionSubgroup {
  key: string;
  label: string;
  description?: string;
  permissions: PermissionItem[];
}

export interface PermissionItem {
  key: string;
  label: string;
  description?: string;
  dependsOn?: string[]; // Lista de permissões que devem estar ativas
  defaultValue?: boolean;
}

/**
 * Definição de todos os módulos e permissões do sistema
 */
export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: 'orders',
    label: 'Pedidos',
    description: 'Gerenciamento completo de pedidos',
    permissions: [
      { key: 'enabled', label: 'Menu Ativo', description: 'Acesso ao menu de pedidos', defaultValue: true },
      { key: 'view', label: 'Visualizar', description: 'Ver lista de pedidos', defaultValue: true },
      { key: 'create', label: 'Criar', description: 'Criar novos pedidos', defaultValue: true },
    ],
    subgroups: [
      {
        key: 'filters',
        label: 'Botões da Tela de Pedidos',
        description: 'Filtros de visualização disponíveis',
        permissions: [
          { key: 'view_all_orders', label: 'Todos', description: 'Ver todos os pedidos', defaultValue: true },
          { key: 'view_pending_orders', label: 'Pendentes', description: 'Ver pedidos pendentes', defaultValue: true },
          { key: 'view_confirmed_orders', label: 'Confirmados', description: 'Ver pedidos confirmados', defaultValue: true },
          { key: 'view_preparing_orders', label: 'Em Preparo', description: 'Ver pedidos em preparo', defaultValue: true },
          { key: 'view_out_for_delivery_orders', label: 'Saiu para Entrega', description: 'Ver pedidos saindo para entrega', defaultValue: true },
          { key: 'view_delivered_orders', label: 'Entregues', description: 'Ver pedidos entregues', defaultValue: true },
          { key: 'view_cancelled_orders', label: 'Cancelados', description: 'Ver pedidos cancelados', defaultValue: true },
        ],
      },
      {
        key: 'actions',
        label: 'Ações sobre Pedidos',
        description: 'Operações que podem ser realizadas',
        permissions: [
          { key: 'edit_order_details', label: 'Editar Detalhes', description: 'Editar informações do pedido', defaultValue: false },
          { key: 'add_order_notes', label: 'Adicionar Observações', description: 'Adicionar notas ao pedido', defaultValue: true },
          { key: 'view_order_history', label: 'Ver Histórico', description: 'Ver histórico de alterações', defaultValue: true },
          { key: 'delete_order_items', label: 'Remover Itens', description: 'Remover itens do pedido', defaultValue: false },
          { key: 'add_order_items', label: 'Adicionar Itens', description: 'Adicionar itens ao pedido', defaultValue: false },
          { key: 'export_orders', label: 'Exportar Pedidos', description: 'Exportar lista de pedidos', defaultValue: false },
          { key: 'mark_payment_received', label: 'Marcar Pagamento Recebido', description: 'Marcar pedido como pago', defaultValue: false },
        ],
      },
      {
        key: 'status_changes',
        label: 'Alterar Status',
        description: 'Permissões para alterar status dos pedidos',
        permissions: [
          { key: 'change_any_status', label: 'Qualquer Status', description: 'Pode alterar para qualquer status', defaultValue: false },
          { key: 'change_status_confirmed', label: 'Para Confirmado', description: 'Alterar para confirmado', defaultValue: true },
          { key: 'change_status_preparing', label: 'Para Em Preparo', description: 'Alterar para em preparo', defaultValue: true },
          { key: 'change_status_out_for_delivery', label: 'Para Saiu para Entrega', description: 'Alterar para saiu para entrega', defaultValue: false },
          { key: 'change_status_delivered', label: 'Para Entregue', description: 'Alterar para entregue', defaultValue: false },
          { key: 'change_status_cancelled', label: 'Para Cancelado', description: 'Alterar para cancelado', defaultValue: false },
        ],
      },
    ],
  },
  {
    key: 'products',
    label: 'Produtos',
    description: 'Gerenciamento do catálogo de produtos',
    permissions: [
      { key: 'enabled', label: 'Menu Ativo', description: 'Acesso ao menu de produtos', defaultValue: true },
      { key: 'view', label: 'Visualizar', description: 'Ver produtos cadastrados', defaultValue: true },
      { key: 'create', label: 'Criar', description: 'Cadastrar novos produtos', defaultValue: false },
      { key: 'update', label: 'Editar', description: 'Editar produtos existentes', defaultValue: false },
      { key: 'delete', label: 'Deletar', description: 'Remover produtos', defaultValue: false },
      { key: 'manage_stock', label: 'Gerenciar Estoque', description: 'Controlar quantidade em estoque', defaultValue: false },
      { key: 'manage_images', label: 'Gerenciar Imagens', description: 'Upload e edição de imagens', defaultValue: false },
    ],
  },
  {
    key: 'categories',
    label: 'Categorias',
    description: 'Gerenciamento de categorias de produtos',
    permissions: [
      { key: 'enabled', label: 'Menu Ativo', description: 'Acesso ao menu de categorias', defaultValue: true },
      { key: 'view', label: 'Visualizar', description: 'Ver categorias', defaultValue: true },
      { key: 'create', label: 'Criar', description: 'Criar novas categorias', defaultValue: false },
      { key: 'update', label: 'Editar', description: 'Editar categorias', defaultValue: false },
      { key: 'delete', label: 'Deletar', description: 'Remover categorias', defaultValue: false },
      { key: 'toggle_status', label: 'Ativar/Desativar', description: 'Ativar ou desativar categorias', defaultValue: false },
    ],
  },
  {
    key: 'delivery',
    label: 'Entregas',
    description: 'Gerenciamento de zonas de entrega e taxas',
    permissions: [
      { key: 'enabled', label: 'Menu Ativo', description: 'Acesso ao menu de entregas', defaultValue: true },
      { key: 'view', label: 'Visualizar', description: 'Ver zonas de entrega', defaultValue: true },
      { key: 'create', label: 'Criar', description: 'Criar novas zonas', defaultValue: false },
      { key: 'update', label: 'Editar', description: 'Editar zonas existentes', defaultValue: false },
      { key: 'delete', label: 'Excluir', description: 'Excluir zonas', defaultValue: false },
    ],
  },
  {
    key: 'coupons',
    label: 'Cupons de Desconto',
    description: 'Gerenciamento de cupons promocionais',
    permissions: [
      { key: 'enabled', label: 'Menu Ativo', description: 'Acesso ao menu de cupons', defaultValue: true },
      { key: 'view', label: 'Visualizar', description: 'Ver cupons cadastrados', defaultValue: true },
      { key: 'create', label: 'Criar', description: 'Criar novos cupons', defaultValue: false },
      { key: 'update', label: 'Editar', description: 'Editar cupons existentes', defaultValue: false },
      { key: 'delete', label: 'Deletar', description: 'Remover cupons', defaultValue: false },
      { key: 'toggle_status', label: 'Ativar/Desativar', description: 'Ativar ou desativar cupons', defaultValue: false },
    ],
  },
  {
    key: 'reports',
    label: 'Relatórios',
    description: 'Acesso a métricas e relatórios',
    permissions: [
      { key: 'enabled', label: 'Menu Ativo', description: 'Acesso ao menu de relatórios', defaultValue: false },
      { key: 'view', label: 'Visualizar', description: 'Ver relatórios e métricas', defaultValue: false },
      { key: 'export', label: 'Exportar', description: 'Exportar relatórios', defaultValue: false },
    ],
  },
  {
    key: 'settings',
    label: 'Configurações',
    description: 'Configurações gerais da loja',
    permissions: [
      { key: 'enabled', label: 'Menu Ativo', description: 'Acesso ao menu de configurações', defaultValue: true },
      { key: 'view', label: 'Visualizar', description: 'Ver configurações', defaultValue: true },
      { key: 'update_store_info', label: 'Informações da Loja', description: 'Editar dados da loja', defaultValue: false },
      { key: 'update_delivery_settings', label: 'Configurações de Entrega', description: 'Editar opções de entrega', defaultValue: false },
      { key: 'update_operating_hours', label: 'Horário de Funcionamento', description: 'Editar horários', defaultValue: false },
    ],
  },
  {
    key: 'whatsapp',
    label: 'Integração WhatsApp',
    description: 'Controle de acesso ao WhatsApp Business',
    permissions: [
      { key: 'enabled', label: 'Menu Ativo', description: 'Acesso ao menu de WhatsApp', defaultValue: false },
      { key: 'edit', label: 'Editar', description: 'Conectar e desconectar WhatsApp', defaultValue: false },
    ],
  },
  {
    key: 'affiliates',
    label: 'Afiliados',
    description: 'Gerenciamento de afiliados e comissões',
    permissions: [
      { key: 'enabled', label: 'Menu Ativo', description: 'Acesso ao menu de afiliados', defaultValue: false },
      { key: 'view', label: 'Visualizar', description: 'Ver lista de afiliados', defaultValue: false },
      { key: 'create', label: 'Criar', description: 'Cadastrar novos afiliados', defaultValue: false },
      { key: 'update', label: 'Editar', description: 'Editar afiliados existentes', defaultValue: false },
      { key: 'delete', label: 'Excluir', description: 'Remover afiliados', defaultValue: false },
      { key: 'toggle_status', label: 'Ativar/Desativar', description: 'Ativar ou desativar afiliados', defaultValue: false },
    ],
    subgroups: [
      {
        key: 'commissions',
        label: 'Comissões',
        description: 'Gerenciamento de comissões',
        permissions: [
          { key: 'view_commissions', label: 'Ver Comissões', description: 'Visualizar comissões e ganhos', defaultValue: false },
          { key: 'manage_commission_rules', label: 'Gerenciar Regras', description: 'Criar e excluir regras de comissão', defaultValue: false },
          { key: 'create_payments', label: 'Criar Pagamentos', description: 'Registrar pagamentos para afiliados', defaultValue: false },
        ],
      },
      {
        key: 'invites',
        label: 'Convites',
        description: 'Links de convite para afiliados',
        permissions: [
          { key: 'generate_invite_link', label: 'Gerar Link', description: 'Gerar link de convite para afiliados', defaultValue: false },
          { key: 'view_reports', label: 'Ver Relatórios', description: 'Acessar relatórios de afiliados', defaultValue: false },
        ],
      },
    ],
  },
];

/**
 * Gera as permissões padrão baseado na configuração
 */
export const generateDefaultPermissions = (): EmployeePermissions => {
  const permissions: any = {};

  PERMISSION_MODULES.forEach((module) => {
    permissions[module.key] = {};

    // Adiciona permissões diretas do módulo
    module.permissions.forEach((perm) => {
      permissions[module.key][perm.key] = perm.defaultValue ?? false;
    });

    // Adiciona permissões dos subgrupos
    module.subgroups?.forEach((subgroup) => {
      subgroup.permissions.forEach((perm) => {
        permissions[module.key][perm.key] = perm.defaultValue ?? false;
      });
    });
  });

  return permissions as EmployeePermissions;
};

/**
 * Mescla permissões existentes com a estrutura padrão
 * Garante que novas permissões apareçam automaticamente
 */
export const mergePermissions = (existingPermissions: any): EmployeePermissions => {
  const defaultPerms = generateDefaultPermissions();
  const merged: any = {};

  PERMISSION_MODULES.forEach((module) => {
    merged[module.key] = {
      ...defaultPerms[module.key],
      ...existingPermissions?.[module.key],
    };
  });

  return merged as EmployeePermissions;
};

/**
 * Valida se um funcionário tem uma permissão específica
 */
export const hasPermission = (
  permissions: EmployeePermissions | null | undefined,
  module: string,
  action: string
): boolean => {
  if (!permissions) return false;
  const modulePerms = (permissions as any)[module];
  if (!modulePerms) return false;
  return modulePerms[action] === true;
};
