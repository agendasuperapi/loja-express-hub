import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDeliveryZones, DeliveryZone } from "@/hooks/useDeliveryZones";
import { Plus, Edit, Trash2, MapPin, Loader2, Search } from "lucide-react";
import { motion } from "framer-motion";
import { fetchCepData, formatCep, isValidCepFormat } from "@/lib/cepValidation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DeliveryZonesManagerProps {
  storeId: string | undefined;
}

export const DeliveryZonesManager = ({ storeId }: DeliveryZonesManagerProps) => {
  const { zones, zonesByCity, isLoading, createZone, updateZone, deleteZone } = useDeliveryZones(storeId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [formData, setFormData] = useState({
    cep: '',
    city: '',
    neighborhood: '',
    delivery_fee: 0,
    is_active: true,
  });
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState<number>(0);
  const [isSavingDefaultFee, setIsSavingDefaultFee] = useState(false);

  // Buscar taxa de entrega padrão da loja
  useEffect(() => {
    const fetchDefaultFee = async () => {
      if (!storeId) return;
      
      const { data, error } = await supabase
        .from('stores')
        .select('delivery_fee')
        .eq('id', storeId)
        .single();
      
      if (!error && data) {
        setDefaultDeliveryFee(data.delivery_fee || 0);
      }
    };
    
    fetchDefaultFee();
  }, [storeId]);

  const handleOpenDialog = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        cep: '',
        city: zone.city,
        neighborhood: zone.neighborhood || '',
        delivery_fee: zone.delivery_fee,
        is_active: zone.is_active,
      });
    } else {
      setEditingZone(null);
      setFormData({
        cep: '',
        city: '',
        neighborhood: '',
        delivery_fee: 0,
        is_active: true,
      });
    }
    setCepError(null);
    setIsDialogOpen(true);
  };

  const handleCepSearch = async () => {
    setCepError(null);
    
    if (!formData.cep.trim()) {
      setCepError("Digite um CEP para buscar");
      return;
    }

    if (!isValidCepFormat(formData.cep)) {
      setCepError("CEP inválido. Use o formato: 12345-678");
      return;
    }

    setIsSearchingCep(true);
    
    try {
      const data = await fetchCepData(formData.cep);
      
      if (data) {
        setFormData({
          ...formData,
          cep: formatCep(data.cep),
          city: data.localidade,
          neighborhood: data.bairro || '',
        });
        toast.success("CEP encontrado!", {
          description: `${data.localidade} - ${data.uf}`,
        });
      } else {
        setCepError("CEP não encontrado");
        toast.error("CEP não encontrado");
      }
    } catch (error) {
      setCepError("Erro ao buscar CEP");
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    // Permite apenas números e hífen, limita a 9 caracteres (12345-678)
    const cleaned = value.replace(/[^\d-]/g, '').slice(0, 9);
    setFormData({ ...formData, cep: cleaned });
    setCepError(null);
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

  const handleSaveDefaultFee = async () => {
    if (!storeId) return;
    
    setIsSavingDefaultFee(true);
    
    try {
      const { error } = await supabase
        .from('stores')
        .update({ delivery_fee: defaultDeliveryFee })
        .eq('id', storeId);
      
      if (error) throw error;
      
      toast.success('Taxa de entrega padrão atualizada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar taxa de entrega padrão');
      console.error(error);
    } finally {
      setIsSavingDefaultFee(false);
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
      className="p-6 space-y-4"
    >
      {/* Card de Taxa de Entrega Padrão */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Taxa de Entrega Padrão
          </CardTitle>
          <CardDescription className="text-xs">
            Esta taxa será usada quando o cliente não estiver em uma zona específica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <div className="flex gap-3 items-end">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="default-fee" className="text-xs">Taxa (R$)</Label>
              <Input
                id="default-fee"
                type="number"
                step="0.01"
                min="0"
                value={defaultDeliveryFee}
                onChange={(e) => setDefaultDeliveryFee(Number(e.target.value))}
                placeholder="0.00"
                className="h-8 text-sm"
              />
            </div>
            <Button 
              onClick={handleSaveDefaultFee}
              disabled={isSavingDefaultFee}
              size="sm"
              className="h-8"
            >
              {isSavingDefaultFee ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card de Zonas de Entrega */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Zonas de Entrega
              </CardTitle>
              <CardDescription className="text-xs">
                Configure cidades e bairros com taxas de entrega
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} size="sm">
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingZone ? 'Editar Zona de Entrega' : 'Nova Zona de Entrega'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP (opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="12345-678"
                    maxLength={9}
                    className={cepError ? "border-destructive" : ""}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCepSearch}
                    disabled={isSearchingCep || !formData.cep.trim()}
                  >
                    {isSearchingCep ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {cepError && (
                  <p className="text-sm text-destructive">{cepError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Busque por CEP para preencher automaticamente cidade e bairro
                </p>
              </div>

              <div>
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ex: São Paulo - SP"
                  required
                  maxLength={100}
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
                  maxLength={100}
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
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          {zones && zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <MapPin className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold mb-2">Nenhuma zona de entrega cadastrada</h3>
              <p className="text-xs text-muted-foreground text-center mb-3">
                Comece adicionando cidades e bairros com suas respectivas taxas de entrega
              </p>
              <Button onClick={() => handleOpenDialog()} size="sm">
                <Plus className="w-3 h-3 mr-1" />
                Adicionar primeira zona
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(zonesByCity).map(([city, cityZones]) => {
                const defaultZone = cityZones.find(z => !z.neighborhood);
                const neighborhoodZones = cityZones.filter(z => z.neighborhood);

                return (
                  <Card key={city}>
                    <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">{city}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-3">
                  {defaultZone && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">Taxa padrão da cidade</p>
                          <p className="text-lg font-bold text-primary">
                            R$ {defaultZone.delivery_fee.toFixed(2)}
                          </p>
                        </div>
                        {!defaultZone.is_active && (
                          <Badge variant="secondary" className="text-xs">Inativa</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleOpenDialog(defaultZone)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDelete(defaultZone.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {neighborhoodZones.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Bairros:</h4>
                      <div className="space-y-2">
                        {neighborhoodZones.map((zone) => (
                          <div
                            key={zone.id}
                            className="flex items-center justify-between p-2 bg-background rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-sm font-medium">{zone.neighborhood}</p>
                                <p className="text-xs text-muted-foreground">
                                  Taxa: <span className="text-primary font-semibold">R$ {zone.delivery_fee.toFixed(2)}</span>
                                </p>
                              </div>
                              {!zone.is_active && (
                                <Badge variant="secondary" className="text-xs">Inativa</Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleOpenDialog(zone)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDelete(zone.id)}
                              >
                                <Trash2 className="w-3 h-3" />
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
        </CardContent>
      </Card>
    </motion.div>
  );
};
