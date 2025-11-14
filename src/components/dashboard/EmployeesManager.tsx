import { useState, useEffect } from 'react';
import { useStoreEmployees, EmployeePermissions } from '@/hooks/useStoreEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  Mail, 
  Phone, 
  Briefcase,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Settings2,
  MoreVertical,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmployeesManagerProps {
  storeId: string;
}

const DEFAULT_PERMISSIONS: EmployeePermissions = {
  orders: {
    view: true,
    create: true,
    view_all_orders: true,
    view_pending_orders: true,
    view_confirmed_orders: true,
    view_preparing_orders: true,
    view_out_for_delivery_orders: true,
    view_delivered_orders: true,
    view_cancelled_orders: true,
    edit_order_details: false,
    change_status_confirmed: true,
    change_status_preparing: true,
    change_status_out_for_delivery: false,
    change_status_delivered: false,
    change_status_cancelled: false,
    change_any_status: false,
    add_order_notes: true,
    view_order_history: true,
    delete_order_items: false,
    add_order_items: false,
    export_orders: false,
  },
  products: {
    view: true,
    create: false,
    update: false,
    delete: false,
    manage_stock: false,
    manage_images: false,
  },
  categories: {
    view: true,
    create: false,
    update: false,
    delete: false,
    toggle_status: false,
  },
  coupons: {
    view: true,
    create: false,
    update: false,
    delete: false,
    toggle_status: false,
  },
  reports: {
    view: false,
    export: false,
  },
  settings: {
    view: true,
    update_store_info: false,
    update_delivery_settings: false,
    update_operating_hours: false,
  },
  whatsapp: {
    view: true,
    edit: false,
  },
};

export const EmployeesManager = ({ storeId }: EmployeesManagerProps) => {
  const {
    employees,
    invites,
    activityLogs,
    isLoading,
    createEmployee,
    createEmployeeWithAccount,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeStatus,
    fetchActivityLogs,
  } = useStoreEmployees(storeId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_email: '',
    employee_phone: '',
    position: '',
    notes: '',
    password: '',
    permissions: DEFAULT_PERMISSIONS,
  });

  useEffect(() => {
    fetchActivityLogs();
  }, [storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[EmployeesManager] handleSubmit - formData:', formData);
    
    try {
      if (editingEmployee) {
        // Remove password do formData ao atualizar (password não existe na tabela store_employees)
        const { password, ...updateData } = formData;
        console.log('[EmployeesManager] Updating employee with data:', updateData);
        console.log('[EmployeesManager] WhatsApp permissions:', updateData.permissions.whatsapp);
        await updateEmployee(editingEmployee.id, updateData);
      } else {
        if (!formData.password) {
          throw new Error('Senha é obrigatória para novos funcionários');
        }
        await createEmployeeWithAccount({
          email: formData.employee_email,
          password: formData.password,
          employee_name: formData.employee_name,
          employee_phone: formData.employee_phone,
          position: formData.position,
          permissions: formData.permissions,
          notes: formData.notes,
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_name: '',
      employee_email: '',
      employee_phone: '',
      position: '',
      notes: '',
      password: '',
      permissions: DEFAULT_PERMISSIONS,
    });
    setEditingEmployee(null);
  };

  // Helper para garantir que todas as permissões tenham a estrutura completa
  const mergePermissions = (employeePermissions: any): EmployeePermissions => {
    return {
      orders: { ...DEFAULT_PERMISSIONS.orders, ...employeePermissions?.orders },
      products: { ...DEFAULT_PERMISSIONS.products, ...employeePermissions?.products },
      categories: { ...DEFAULT_PERMISSIONS.categories, ...employeePermissions?.categories },
      coupons: { ...DEFAULT_PERMISSIONS.coupons, ...employeePermissions?.coupons },
      reports: { ...DEFAULT_PERMISSIONS.reports, ...employeePermissions?.reports },
      settings: { ...DEFAULT_PERMISSIONS.settings, ...employeePermissions?.settings },
      whatsapp: {
        ...DEFAULT_PERMISSIONS.whatsapp, 
        ...employeePermissions?.whatsapp,
        // Migrar manage_whatsapp antigo para edit se existir
        ...(employeePermissions?.settings?.manage_whatsapp && {
          view: true,
          edit: employeePermissions.settings.manage_whatsapp
        })
      },
    };
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setFormData({
      employee_name: employee.employee_name,
      employee_email: employee.employee_email,
      employee_phone: employee.employee_phone || '',
      position: employee.position || '',
      notes: employee.notes || '',
      password: '',
      permissions: mergePermissions(employee.permissions),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee(id);
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const updatePermission = (resource: string, action: string, value: boolean) => {
    console.log('[EmployeesManager] updatePermission:', { resource, action, value });
    setFormData(prev => {
      const updated = {
        ...prev,
        permissions: {
          ...prev.permissions,
          [resource]: {
            ...prev.permissions[resource as keyof EmployeePermissions],
            [action]: value,
          },
        },
      };
      console.log('[EmployeesManager] Updated permissions:', updated.permissions);
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Funcionários</h2>
          <p className="text-muted-foreground mt-2">
            Gerencie sua equipe e controle de acessos ao sistema
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do funcionário e configure suas permissões de acesso
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Dados Pessoais
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_name">Nome Completo *</Label>
                    <Input
                      id="employee_name"
                      value={formData.employee_name}
                      onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Cargo</Label>
                    <Select
                      value={formData.position}
                      onValueChange={(value) => setFormData({ ...formData, position: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Gerente">Gerente</SelectItem>
                        <SelectItem value="Atendente">Atendente</SelectItem>
                        <SelectItem value="Caixa">Caixa</SelectItem>
                        <SelectItem value="Cozinheiro">Cozinheiro</SelectItem>
                        <SelectItem value="Entregador">Entregador</SelectItem>
                        <SelectItem value="Auxiliar">Auxiliar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_email">Email *</Label>
                    <Input
                      id="employee_email"
                      type="email"
                      value={formData.employee_email}
                      onChange={(e) => setFormData({ ...formData, employee_email: e.target.value })}
                      required
                      disabled={!!editingEmployee}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee_phone">Telefone</Label>
                    <Input
                      id="employee_phone"
                      value={formData.employee_phone}
                      onChange={(e) => setFormData({ ...formData, employee_phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                {!editingEmployee && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <p className="text-xs text-muted-foreground">
                      O funcionário usará este email e senha para fazer login no sistema
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Informações adicionais sobre o funcionário..."
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Permissões */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permissões de Acesso
                </h3>

                <div className="space-y-4 border rounded-lg p-4">
                  {/* Pedidos */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-lg">Pedidos</h4>
                      <Badge variant="outline">Ações Básicas</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.orders.view}
                          onCheckedChange={(checked) => updatePermission('orders', 'view', checked)}
                        />
                        <Label className="text-sm">Visualizar pedidos</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.orders.create}
                          onCheckedChange={(checked) => updatePermission('orders', 'create', checked)}
                        />
                        <Label className="text-sm">Criar pedidos</Label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <h4 className="font-medium">Botões da Tela de Pedidos</h4>
                      <Badge variant="secondary">Ações Específicas</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg">
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Filtros de Status</p>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.view_all_orders}
                            onCheckedChange={(checked) => updatePermission('orders', 'view_all_orders', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Todos</Label>
                            <p className="text-xs text-muted-foreground">Ver todos os pedidos</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.view_pending_orders}
                            onCheckedChange={(checked) => updatePermission('orders', 'view_pending_orders', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Pendentes</Label>
                            <p className="text-xs text-muted-foreground">Ver pedidos pendentes</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.view_confirmed_orders}
                            onCheckedChange={(checked) => updatePermission('orders', 'view_confirmed_orders', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Confirmados</Label>
                            <p className="text-xs text-muted-foreground">Ver pedidos confirmados</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.view_preparing_orders}
                            onCheckedChange={(checked) => updatePermission('orders', 'view_preparing_orders', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Em Preparo</Label>
                            <p className="text-xs text-muted-foreground">Ver pedidos em preparo</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.view_out_for_delivery_orders}
                            onCheckedChange={(checked) => updatePermission('orders', 'view_out_for_delivery_orders', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Saiu para Entrega</Label>
                            <p className="text-xs text-muted-foreground">Ver pedidos saindo para entrega</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.view_delivered_orders}
                            onCheckedChange={(checked) => updatePermission('orders', 'view_delivered_orders', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Entregues</Label>
                            <p className="text-xs text-muted-foreground">Ver pedidos entregues</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.view_cancelled_orders}
                            onCheckedChange={(checked) => updatePermission('orders', 'view_cancelled_orders', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Cancelados</Label>
                            <p className="text-xs text-muted-foreground">Ver pedidos cancelados</p>
                          </div>
                        </div>
                        
                        <p className="text-xs font-medium text-muted-foreground uppercase mt-4">Edição</p>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.edit_order_details}
                            onCheckedChange={(checked) => updatePermission('orders', 'edit_order_details', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Editar Pedido</Label>
                            <p className="text-xs text-muted-foreground">Botão "Editar Pedido"</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.add_order_items}
                            onCheckedChange={(checked) => updatePermission('orders', 'add_order_items', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Adicionar Itens</Label>
                            <p className="text-xs text-muted-foreground">Adicionar produtos ao pedido</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.delete_order_items}
                            onCheckedChange={(checked) => updatePermission('orders', 'delete_order_items', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Remover Itens</Label>
                            <p className="text-xs text-muted-foreground">Excluir produtos do pedido</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.add_order_notes}
                            onCheckedChange={(checked) => updatePermission('orders', 'add_order_notes', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Adicionar Observações</Label>
                            <p className="text-xs text-muted-foreground">Adicionar notas ao pedido</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Alteração de Status</p>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.change_any_status}
                            onCheckedChange={(checked) => {
                              updatePermission('orders', 'change_any_status', checked);
                              // Se marcar "qualquer status", marcar todos
                              if (checked) {
                                updatePermission('orders', 'change_status_confirmed', true);
                                updatePermission('orders', 'change_status_preparing', true);
                                updatePermission('orders', 'change_status_out_for_delivery', true);
                                updatePermission('orders', 'change_status_delivered', true);
                                updatePermission('orders', 'change_status_cancelled', true);
                              }
                            }}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Qualquer Status</Label>
                            <p className="text-xs text-muted-foreground">Pode alterar para qualquer status</p>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.change_status_confirmed}
                            onCheckedChange={(checked) => updatePermission('orders', 'change_status_confirmed', checked)}
                            disabled={formData.permissions.orders.change_any_status}
                          />
                          <div className="flex-1">
                            <Label className="text-sm">Status: Confirmado</Label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.change_status_preparing}
                            onCheckedChange={(checked) => updatePermission('orders', 'change_status_preparing', checked)}
                            disabled={formData.permissions.orders.change_any_status}
                          />
                          <div className="flex-1">
                            <Label className="text-sm">Status: Preparando</Label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.change_status_out_for_delivery}
                            onCheckedChange={(checked) => updatePermission('orders', 'change_status_out_for_delivery', checked)}
                            disabled={formData.permissions.orders.change_any_status}
                          />
                          <div className="flex-1">
                            <Label className="text-sm">Status: Saiu para Entrega</Label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.change_status_delivered}
                            onCheckedChange={(checked) => updatePermission('orders', 'change_status_delivered', checked)}
                            disabled={formData.permissions.orders.change_any_status}
                          />
                          <div className="flex-1">
                            <Label className="text-sm">Status: Entregue</Label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.orders.change_status_cancelled}
                            onCheckedChange={(checked) => updatePermission('orders', 'change_status_cancelled', checked)}
                            disabled={formData.permissions.orders.change_any_status}
                          />
                          <div className="flex-1">
                            <Label className="text-sm">Status: Cancelado</Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.orders.view_order_history}
                          onCheckedChange={(checked) => updatePermission('orders', 'view_order_history', checked)}
                        />
                        <div className="flex-1">
                          <Label className="text-sm font-medium">Ver Histórico</Label>
                          <p className="text-xs text-muted-foreground">Ver histórico de alterações</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.orders.export_orders}
                          onCheckedChange={(checked) => updatePermission('orders', 'export_orders', checked)}
                        />
                        <div className="flex-1">
                          <Label className="text-sm font-medium">Exportar Pedidos</Label>
                          <p className="text-xs text-muted-foreground">Exportar lista de pedidos</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Produtos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Produtos</h4>
                      <Badge variant="outline">Gerenciamento</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.products.view}
                          onCheckedChange={(checked) => updatePermission('products', 'view', checked)}
                        />
                        <Label className="text-sm">Visualizar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.products.create}
                          onCheckedChange={(checked) => updatePermission('products', 'create', checked)}
                        />
                        <Label className="text-sm">Criar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.products.update}
                          onCheckedChange={(checked) => updatePermission('products', 'update', checked)}
                        />
                        <Label className="text-sm">Editar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.products.delete}
                          onCheckedChange={(checked) => updatePermission('products', 'delete', checked)}
                        />
                        <Label className="text-sm">Deletar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.products.manage_stock}
                          onCheckedChange={(checked) => updatePermission('products', 'manage_stock', checked)}
                        />
                        <Label className="text-sm">Gerenciar Estoque</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.products.manage_images}
                          onCheckedChange={(checked) => updatePermission('products', 'manage_images', checked)}
                        />
                        <Label className="text-sm">Gerenciar Imagens</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Categorias */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Categorias</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.categories.view}
                          onCheckedChange={(checked) => updatePermission('categories', 'view', checked)}
                        />
                        <Label className="text-sm">Visualizar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.categories.create}
                          onCheckedChange={(checked) => updatePermission('categories', 'create', checked)}
                        />
                        <Label className="text-sm">Criar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.categories.update}
                          onCheckedChange={(checked) => updatePermission('categories', 'update', checked)}
                        />
                        <Label className="text-sm">Editar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.categories.delete}
                          onCheckedChange={(checked) => updatePermission('categories', 'delete', checked)}
                        />
                        <Label className="text-sm">Deletar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.categories.toggle_status}
                          onCheckedChange={(checked) => updatePermission('categories', 'toggle_status', checked)}
                        />
                        <Label className="text-sm">Ativar/Desativar</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Cupons */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Cupons de Desconto</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.coupons.view}
                          onCheckedChange={(checked) => updatePermission('coupons', 'view', checked)}
                        />
                        <Label className="text-sm">Visualizar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.coupons.create}
                          onCheckedChange={(checked) => updatePermission('coupons', 'create', checked)}
                        />
                        <Label className="text-sm">Criar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.coupons.update}
                          onCheckedChange={(checked) => updatePermission('coupons', 'update', checked)}
                        />
                        <Label className="text-sm">Editar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.coupons.delete}
                          onCheckedChange={(checked) => updatePermission('coupons', 'delete', checked)}
                        />
                        <Label className="text-sm">Deletar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.permissions.coupons.toggle_status}
                          onCheckedChange={(checked) => updatePermission('coupons', 'toggle_status', checked)}
                        />
                        <Label className="text-sm">Ativar/Desativar</Label>
                      </div>
                    </div>
                  </div>


                  <Separator />

                  {/* Relatórios e Configurações */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Outros Módulos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3 p-4 border rounded-lg">
                        <h5 className="text-sm font-medium text-muted-foreground">Relatórios</h5>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.reports.view}
                            onCheckedChange={(checked) => updatePermission('reports', 'view', checked)}
                          />
                          <Label className="text-sm">Visualizar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.reports.export}
                            onCheckedChange={(checked) => updatePermission('reports', 'export', checked)}
                          />
                          <Label className="text-sm">Exportar</Label>
                        </div>
                      </div>

                      <div className="space-y-3 p-4 border rounded-lg">
                        <h5 className="text-sm font-medium text-muted-foreground">Configurações</h5>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.settings.view}
                            onCheckedChange={(checked) => updatePermission('settings', 'view', checked)}
                          />
                          <Label className="text-sm">Visualizar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.settings.update_store_info}
                            onCheckedChange={(checked) => updatePermission('settings', 'update_store_info', checked)}
                          />
                          <Label className="text-sm">Editar Informações</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.settings.update_delivery_settings}
                            onCheckedChange={(checked) => updatePermission('settings', 'update_delivery_settings', checked)}
                          />
                          <Label className="text-sm">Config. de Entrega</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.settings.update_operating_hours}
                            onCheckedChange={(checked) => updatePermission('settings', 'update_operating_hours', checked)}
                          />
                          <Label className="text-sm">Horário de Funcionamento</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Integração WhatsApp
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Controle de acesso ao WhatsApp Business
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 p-4 border rounded-lg">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.whatsapp.view}
                            onCheckedChange={(checked) => updatePermission('whatsapp', 'view', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Visualizar</Label>
                            <p className="text-xs text-muted-foreground">Ver status e configurações do WhatsApp</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.permissions.whatsapp.edit}
                            onCheckedChange={(checked) => updatePermission('whatsapp', 'edit', checked)}
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Editar</Label>
                            <p className="text-xs text-muted-foreground">Conectar e desconectar WhatsApp</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingEmployee ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">
            Funcionários ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            Atividades Recentes
          </TabsTrigger>
        </TabsList>

        {/* Lista de Funcionários */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipe Atual</CardTitle>
              <CardDescription>
                Gerencie os funcionários e suas permissões de acesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhum funcionário cadastrado</h3>
                  <p className="text-muted-foreground mt-2">
                    Comece adicionando membros à sua equipe
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.employee_name}
                        </TableCell>
                        <TableCell>
                          {employee.position || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {employee.employee_email}
                            </span>
                            {employee.employee_phone && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {employee.employee_phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 items-center">
                            <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                              {employee.is_active ? (
                                <>
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Ativo
                                </>
                              ) : (
                                <>
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Inativo
                                </>
                              )}
                            </Badge>
                            {!employee.user_id && (
                              <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                                <Mail className="mr-1 h-3 w-3" />
                                Sem conta
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(employee.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(employee)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleEmployeeStatus(employee.id, employee.is_active)}
                              >
                                <Settings2 className="mr-2 h-4 w-4" />
                                {employee.is_active ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remover
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover {employee.employee_name}?
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(employee.id)}>
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs de Atividade */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Atividades</CardTitle>
              <CardDescription>
                Acompanhe as ações realizadas pela equipe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhuma atividade registrada</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                      <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {log.employee?.employee_name || 'Funcionário'}
                        </p>
                        <p className="text-sm text-muted-foreground">{log.action}</p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
