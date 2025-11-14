import { useState, useEffect } from 'react';
import { useStoreEmployees, EmployeePermissions } from '@/hooks/useStoreEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicPermissionsForm } from './DynamicPermissionsForm';
import { generateDefaultPermissions, mergePermissions } from '@/config/permissions';
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
    permissions: generateDefaultPermissions(),
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
        // Sanitiza permissões: garante whatsapp explícito e remove campo legado manage_whatsapp
        const cleanedPermissions: any = {
          ...updateData.permissions,
          settings: { ...updateData.permissions.settings },
          whatsapp: {
            view: !!updateData.permissions.whatsapp.view,
            edit: !!updateData.permissions.whatsapp.edit,
          },
        };
        if (cleanedPermissions.settings && 'manage_whatsapp' in cleanedPermissions.settings) {
          delete cleanedPermissions.settings.manage_whatsapp;
        }
        const payload = { ...updateData, permissions: cleanedPermissions };
        console.log('[EmployeesManager] Updating employee with payload:', payload);
        console.log('[EmployeesManager] WhatsApp permissions to save:', payload.permissions.whatsapp);
        await updateEmployee(editingEmployee.id, payload);
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
      permissions: generateDefaultPermissions(),
    });
    setEditingEmployee(null);
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

                <DynamicPermissionsForm
                  permissions={formData.permissions}
                  onPermissionChange={updatePermission}
                  storeId={storeId}
                />
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
