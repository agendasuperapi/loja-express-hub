import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useDeliveryZones, DeliveryZone } from "@/hooks/useDeliveryZones";
import { Plus, Edit, Trash2, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface DeliveryZonesManagerProps {
  storeId: string | undefined;
}

export const DeliveryZonesManager = ({ storeId }: DeliveryZonesManagerProps) => {
  const { zones, zonesByCity, isLoading, createZone, updateZone, deleteZone } = useDeliveryZones(storeId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [formData, setFormData] = useState({
    city: '',
    neighborhood: '',
    delivery_fee: 0,
    is_active: true,
  });

  const handleOpenDialog = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        city: zone.city,
        neighborhood: zone.neighborhood || '',
        delivery_fee: zone.delivery_fee,
        is_active: zone.is_active,
      });
    } else {
      setEditingZone(null);
      setFormData({
        city: '',
        neighborhood: '',
        delivery_fee: 0,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeId) return;
    
    const zoneData = {
      store_id: storeId,
      city: formData.city.trim(),
      neighborhood: formData.neighborhood.trim() || null,
      delivery_fee: Number(formData.delivery_fee),
      is_active: formData.is_active,
    };

    if (editingZone) {
      await updateZone.mutateAsync({ id: editingZone.id, ...zoneData });
    } else {
      await createZone.mutateAsync(zoneData);
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta zona de entrega?')) {
      await deleteZone.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Zonas de Entrega</h2>
          <p className="text-muted-foreground">Configure cidades e bairros com taxas de entrega</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Zona
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingZone ? 'Editar Zona de Entrega' : 'Nova Zona de Entrega'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ex: São Paulo"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="neighborhood">
                  Bairro <span className="text-muted-foreground text-sm">(opcional - deixe vazio para taxa padrão da cidade)</span>
                </Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Ex: Centro, Vila Mariana..."
                />
              </div>

              <div>
                <Label htmlFor="delivery_fee">Taxa de Entrega (R$) *</Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Zona ativa</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createZone.isPending || updateZone.isPending}>
                  {(createZone.isPending || updateZone.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingZone ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {zones && zones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma zona de entrega cadastrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece adicionando cidades e bairros com suas respectivas taxas de entrega
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar primeira zona
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(zonesByCity).map(([city, cityZones]) => {
            const defaultZone = cityZones.find(z => !z.neighborhood);
            const neighborhoodZones = cityZones.filter(z => z.neighborhood);

            return (
              <Card key={city}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <CardTitle>{city}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {defaultZone && (
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">Taxa padrão da cidade</p>
                          <p className="text-2xl font-bold text-primary">
                            R$ {defaultZone.delivery_fee.toFixed(2)}
                          </p>
                        </div>
                        {!defaultZone.is_active && (
                          <Badge variant="secondary">Inativa</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(defaultZone)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(defaultZone.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {neighborhoodZones.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Bairros:</h4>
                      <div className="space-y-2">
                        {neighborhoodZones.map((zone) => (
                          <div
                            key={zone.id}
                            className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="font-medium">{zone.neighborhood}</p>
                                <p className="text-sm text-muted-foreground">
                                  Taxa: <span className="text-primary font-semibold">R$ {zone.delivery_fee.toFixed(2)}</span>
                                </p>
                              </div>
                              {!zone.is_active && (
                                <Badge variant="secondary">Inativa</Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(zone)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(zone.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!defaultZone && neighborhoodZones.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma taxa configurada para esta cidade
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
