import { useState, useEffect } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Save, AlertCircle, Edit, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmployeeAccess } from "@/hooks/useEmployeeAccess";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { arrayMove } from "@dnd-kit/sortable";

const defaultWhatsAppMessages: Record<string, string> = {
  // Português
  pendente: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}! 

Recebemos seu pedido: *{{order_number}}*
📌*Status: Pendente*

---------------------------------------
🛍*RESUMO DO PEDIDO*
---------------------------------------

{{items}}

🛒 TOTAL PRODUTOS: {{subtotal}}
🏍 TAXA  ENTREGA : {{delivery_fee}}
------------------------------
💵 TOTAL PEDIDO  : {{total}}

💰 FORMA PAG.: {{payment_method}}

📌 *{{delivery_type}}:*
 {{delivery_address}}
 {{pickup_address}}

🛍️ *VISITE NOSSO SITE:*
{{store_url}}

*Salve nosso número nos seus contatos para não perder nenhuma atualização e novidades.*`,
  
  confirmado: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Seu pedido {{order_number}} foi confirmado com sucesso!
Já estamos preparando tudo com carinho.

🛍️ *VISITE NOSSO SITE:*
{{store_url}}`,
  
  preparando: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Seu pedido #{{order_number}} está sendo preparado!

🛍️ *VISITE NOSSA VITRINE DE OFERTAS*
{{store_url}}`,
  
  pronto: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Seu pedido #{{order_number}} Está Aguardando retirada.

📍*ENDEREÇO RETIRADA*
• {{pickup_address}} -

🛍️ *VISITE NOSSO SITE:*
{{store_url}}`,
  
  saiu_para_entrega: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Boa notícia seu pedido #{{order_number}} saiu para entrega!
Chegará em breve.

🛍️ *VISITE NOSSO SITE:*
{{store_url}}`,
  
  entregue: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}!
Seu pedido #{{order_number}} foi entregue! Obrigado pela preferência!

🛍️ Visite nossa Vitrine de ofertas e não perca as promoções do dia.

Acesse: {{store_url}}`,
  
  cancelado: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Pedido #{{order_number}} foi cancelado. 
Entre em contato para mais informações.`,

  // English (aliases for backwards compatibility)
  pending: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}! 

Recebemos seu pedido: *{{order_number}}*
📌*Status: Pendente*

---------------------------------------
🛍*RESUMO DO PEDIDO*
---------------------------------------

{{items}}

🛒 TOTAL PRODUTOS: {{subtotal}}
🏍 TAXA  ENTREGA : {{delivery_fee}}
------------------------------
💵 TOTAL PEDIDO  : {{total}}

💰 FORMA PAG.: {{payment_method}}

📌 *{{delivery_type}}:*
 {{delivery_address}}
 {{pickup_address}}

🛍️ *VISITE NOSSO SITE:*
{{store_url}}

*Salve nosso número nos seus contatos para não perder nenhuma atualização e novidades.*`,
  
  confirmed: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Seu pedido {{order_number}} foi confirmado com sucesso!
Já estamos preparando tudo com carinho.

🛍️ *VISITE NOSSO SITE:*
{{store_url}}`,
  
  preparing: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Seu pedido #{{order_number}} está sendo preparado!

🛍️ *VISITE NOSSA VITRINE DE OFERTAS*
{{store_url}}`,
  
  ready: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Seu pedido #{{order_number}} Está Aguardando retirada.

📍*ENDEREÇO RETIRADA*
• {{pickup_address}} -

🛍️ *VISITE NOSSO SITE:*
{{store_url}}`,
  
  out_for_delivery: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Boa notícia seu pedido #{{order_number}} saiu para entrega!
Chegará em breve.

🛍️ *VISITE NOSSO SITE:*
{{store_url}}`,
  
  in_delivery: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Boa notícia seu pedido #{{order_number}} saiu para entrega!
Chegará em breve.

🛍️ *VISITE NOSSA LOJA*
{{store_url}}`,
  
  delivered: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}!
Seu pedido #{{order_number}} foi entregue! Obrigado pela preferência!

🛍️ Visite nossa Vitrine de ofertas e não perca as promoções do dia.

Acesse: {{store_url}}`,
  
  cancelled: `*PEDIDO {{store_name}}.*

Olá {{customer_name}}
Pedido #{{order_number}} foi cancelado. 
Entre em contato para mais informações.`
};

interface OrderStatus {
  id: string;
  status_key: string;
  status_label: string;
  status_color: string;
  display_order: number;
  whatsapp_message: string | null;
  is_active: boolean;
}

interface SortableStatusItemProps {
  status: OrderStatus;
  index: number;
  canEdit: boolean;
  onEdit: (status: OrderStatus) => void;
}

const SortableStatusItem = ({ status, index, canEdit, onEdit }: SortableStatusItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
    >
      {canEdit && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      
      <Badge
        style={{ backgroundColor: status.status_color }}
        className="text-white min-w-[90px] justify-center"
      >
        {status.status_label}
      </Badge>

      <div className="flex-1 text-sm text-muted-foreground">
        {status.whatsapp_message ? (
          <span className="line-clamp-1">{status.whatsapp_message}</span>
        ) : (
          <span className="italic">Sem mensagem configurada</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {!status.is_active && (
          <Badge variant="outline" className="text-xs ml-1">Inativa</Badge>
        )}

        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(status)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

interface OrderStatusManagerProps {
  storeId: string;
}

export const OrderStatusManager = ({ storeId }: OrderStatusManagerProps) => {
  const { toast } = useToast();
  const employeeAccess = useEmployeeAccess();
  const queryClient = useQueryClient();
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState<OrderStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'active' | 'inactive' | 'all'>('active');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


  // Verificar permissões
  const hasPermission = (action: string): boolean => {
    if (!employeeAccess.isEmployee || !employeeAccess.permissions) return true;
    const modulePermissions = (employeeAccess.permissions as any)['settings'];
    return modulePermissions?.[action] === true;
  };

  const canEdit = hasPermission('update_store_info');

  useEffect(() => {
    loadStatuses();
  }, [storeId]);

  const loadStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('order_status_configs' as any)
        .select('*')
        .eq('store_id', storeId)
        .order('display_order');

      if (error) throw error;
      setStatuses((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar status",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!editingStatus) return;

    try {
      if (editingStatus.id.startsWith('new_')) {
        // Insert new status
        const { error } = await supabase
          .from('order_status_configs' as any)
          .insert({
            store_id: storeId,
            status_key: editingStatus.status_key,
            status_label: editingStatus.status_label,
            status_color: editingStatus.status_color,
            display_order: editingStatus.display_order,
            whatsapp_message: editingStatus.whatsapp_message,
            is_active: editingStatus.is_active
          });

        if (error) throw error;
      } else {
        // Update existing status
        const { error } = await supabase
          .from('order_status_configs' as any)
          .update({
            status_label: editingStatus.status_label,
            status_color: editingStatus.status_color,
            whatsapp_message: editingStatus.whatsapp_message,
            is_active: editingStatus.is_active
          })
          .eq('id', editingStatus.id);

        if (error) throw error;
      }

      toast({
        title: "Status salvo!",
        description: "As configurações foram atualizadas com sucesso"
      });

      setIsDialogOpen(false);
      setEditingStatus(null);
      loadStatuses();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('order_status_configs' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status removido",
        description: "O status foi removido com sucesso"
      });

      loadStatuses();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAddNew = () => {
    setEditingStatus({
      id: `new_${Date.now()}`,
      status_key: '',
      status_label: '',
      status_color: '#3B82F6',
      display_order: statuses.length + 1,
      whatsapp_message: '',
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const handleRestoreDefaultMessage = () => {
    if (!editingStatus) {
      console.log('Nenhum status sendo editado');
      return;
    }
    
    console.log('Status key:', editingStatus.status_key);
    console.log('Chaves disponíveis:', Object.keys(defaultWhatsAppMessages));
    
    const defaultMessage = defaultWhatsAppMessages[editingStatus.status_key];
    
    if (defaultMessage) {
      setEditingStatus({
        ...editingStatus,
        whatsapp_message: defaultMessage
      });
      toast({
        title: "Mensagem restaurada",
        description: "A mensagem padrão foi restaurada com sucesso."
      });
    } else {
      console.log('Mensagem padrão não encontrada para:', editingStatus.status_key);
      toast({
        title: "Mensagem padrão não encontrada",
        description: `Status key "${editingStatus.status_key}" não possui mensagem padrão definida.`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = statuses.findIndex((s) => s.id === active.id);
    const newIndex = statuses.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(statuses, oldIndex, newIndex);
    const ordered = newOrder.map((status, index) => ({
      ...status,
      display_order: index,
    }));
    
    setStatuses(ordered);

    try {
      await Promise.all(
        ordered.map((status, index) =>
          supabase
            .from('order_status_configs' as any)
            .update({ display_order: index })
            .eq('id', status.id)
        )
      );
      
      // Força atualização em outras partes da UI
      queryClient.invalidateQueries({ queryKey: ['order-statuses'] });
      
      toast({
        title: 'Ordem atualizada',
        description: 'A nova ordem das etapas foi salva.',
      });
    } catch (error: any) {
      console.error('Erro ao salvar ordem dos status:', error);
      toast({
        title: 'Erro ao salvar ordem',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredStatuses = statuses.filter((status) => {
    if (activeFilter === 'active') return status.is_active;
    if (activeFilter === 'inactive') return !status.is_active;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Status dos Pedidos</CardTitle>
            <CardDescription>
              Configure os status dos pedidos e as mensagens do WhatsApp
            </CardDescription>
          </div>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Etapa
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingStatus?.id.startsWith('new_') ? 'Nova Etapa' : 'Editar Etapa'}
                </DialogTitle>
                <DialogDescription>
                  Configure a etapa do pedido e a mensagem que será enviada
                </DialogDescription>
              </DialogHeader>

              {editingStatus && (
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="status_key">Chave do Status</Label>
                        <Input
                          id="status_key"
                          value={editingStatus.status_key}
                          onChange={(e) => setEditingStatus({
                            ...editingStatus,
                            status_key: e.target.value.toLowerCase().replace(/\s+/g, '_')
                          })}
                          placeholder="ex: preparando"
                          disabled={!editingStatus.id.startsWith('new_')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status_label">Nome da Etapa</Label>
                        <Input
                          id="status_label"
                          value={editingStatus.status_label}
                          onChange={(e) => setEditingStatus({
                            ...editingStatus,
                            status_label: e.target.value
                          })}
                          placeholder="ex: Preparando"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status_color">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="status_color"
                          type="color"
                          value={editingStatus.status_color}
                          onChange={(e) => setEditingStatus({
                            ...editingStatus,
                            status_color: e.target.value
                          })}
                          className="w-20"
                        />
                        <Input
                          value={editingStatus.status_color}
                          onChange={(e) => setEditingStatus({
                            ...editingStatus,
                            status_color: e.target.value
                          })}
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp_message">Mensagem do WhatsApp</Label>
                      <Textarea
                        id="whatsapp_message"
                        value={editingStatus.whatsapp_message || ''}
                        onChange={(e) => setEditingStatus({
                          ...editingStatus,
                          whatsapp_message: e.target.value
                        })}
                        placeholder="Olá {{customer_name}}! Seu pedido #{{order_number}} está sendo preparado..."
                        rows={10}
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRestoreDefaultMessage}
                          disabled={!defaultWhatsAppMessages[editingStatus.status_key]}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restaurar Padrão
                        </Button>
                      </div>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Variáveis disponíveis:</strong><br />
                          • <code>{'{{customer_name}}'}</code> - Nome do cliente<br />
                          • <code>{'{{order_number}}'}</code> - Número do pedido<br />
                          • <code>{'{{total}}'}</code> - Valor total<br />
                          • <code>{'{{subtotal}}'}</code> - Subtotal dos produtos<br />
                          • <code>{'{{delivery_fee}}'}</code> - Taxa de entrega<br />
                          • <code>{'{{delivery_type}}'}</code> - Tipo de entrega (Entrega/Retirada)<br />
                          • <code>{'{{delivery_location_label}}'}</code> - LOCAL DE ENTREGA ou LOCAL DE RETIRADA<br />
                          • <code>{'{{store_name}}'}</code> - Nome da loja<br />
                          • <code>{'{{store_phone}}'}</code> - Telefone da loja<br />
                          • <code>{'{{store_address}}'}</code> - Endereço da loja<br />
                          • <code>{'{{store_url}}'}</code> - URL da loja<br />
                          • <code>{'{{pickup_address}}'}</code> - Endereço de retirada<br />
                          • <code>{'{{address}}'}</code> - Endereço (entrega ou retirada automaticamente)<br />
                          • <code>{'{{items}}'}</code> - Lista completa de produtos<br />
                          • <code>{'{{delivery_address}}'}</code> - Endereço de entrega<br />
                          • <code>{'{{payment_method}}'}</code> - Forma de pagamento<br />
                          • <code>{'{{change_amount}}'}</code> - Troco para<br />
                          • <code>{'{{notes}}'}</code> - Observações do pedido
                        </AlertDescription>
                      </Alert>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={editingStatus.is_active}
                        onCheckedChange={(checked) => setEditingStatus({
                          ...editingStatus,
                          is_active: checked
                        })}
                      />
                      <Label htmlFor="is_active">Etapa ativa</Label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveStatus}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('active')}
          >
            Ativas
          </Button>
          <Button
            variant={activeFilter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('inactive')}
          >
            Inativas
          </Button>
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('all')}
          >
            Todas
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredStatuses.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filteredStatuses.map((status, index) => (
                <SortableStatusItem
                  key={status.id}
                  status={status}
                  index={index}
                  canEdit={canEdit}
                  onEdit={(status) => {
                    setEditingStatus(status);
                    setIsDialogOpen(true);
                  }}
                />
              ))}

              {filteredStatuses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {statuses.length === 0
                    ? 'Nenhuma etapa configurada. Clique em "Adicionar Etapa" para começar.'
                    : `Nenhuma etapa ${activeFilter === 'active' ? 'ativa' : 'inativa'} encontrada.`}
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
};
