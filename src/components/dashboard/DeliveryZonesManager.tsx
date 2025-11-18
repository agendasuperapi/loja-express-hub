import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDeliveryZones, DeliveryZone } from "@/hooks/useDeliveryZones";
import { Plus, Edit, Trash2, MapPin, Loader2, Search, Check, ChevronsUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { fetchCepData, formatCep, isValidCepFormat } from "@/lib/cepValidation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Função para remover acentos e normalizar texto para busca
const removeAccents = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

interface DeliveryZonesManagerProps {
  storeId: string | undefined;
}

interface City {
  id: number;
  nome: string;
  microrregiao: {
    mesorregiao: {
      UF: {
        sigla: string;
      };
    };
  };
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
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [openCityCombobox, setOpenCityCombobox] = useState(false);
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

  useEffect(() => {
    const CACHE_KEY = 'brazilian_cities_cache';
    const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos

    const fetchCities = async () => {
      setIsLoadingCities(true);
      try {
        // Verificar se existe cache válido
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const now = Date.now();
          
          // Se o cache ainda é válido (menos de 7 dias), usar os dados em cache
          if (now - timestamp < CACHE_DURATION) {
            console.log('📦 Usando cidades do cache local');
            setCities(data);
            setIsLoadingCities(false);
            return;
          }
        }

        // Se não há cache ou está expirado, buscar da API
        console.log('🌐 Buscando cidades da API do IBGE');
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome');
        const data: City[] = await response.json();
        
        // Salvar no cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        setCities(data);
        toast.success('Lista de cidades carregada com sucesso');
      } catch (error) {
        console.error('Erro ao buscar cidades:', error);
        toast.error('Erro ao carregar lista de cidades');
      } finally {
        setIsLoadingCities(false);
      }
    };

    if (isDialogOpen && cities.length === 0) {
      fetchCities();
    }
  }, [isDialogOpen, cities.length]);

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
      className="p-8 space-y-6"
    >
      {/* Card de Taxa de Entrega Padrão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Taxa de Entrega Padrão</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esta taxa será usada quando o cliente não estiver em uma zona específica
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="default-fee">Taxa (R$)</Label>
              <Input
                id="default-fee"
                type="number"
                step="0.01"
                min="0"
                value={defaultDeliveryFee}
                onChange={(e) => setDefaultDeliveryFee(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <Button 
              onClick={handleSaveDefaultFee}
              disabled={isSavingDefaultFee}
            >
              {isSavingDefaultFee ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Taxa'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                <Popover open={openCityCombobox} onOpenChange={setOpenCityCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCityCombobox}
                      className="w-full justify-between"
                    >
                      {formData.city || "Selecione a cidade..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cidade..." />
                      <CommandList>
                        <CommandEmpty>
                          {isLoadingCities ? "Carregando cidades..." : "Nenhuma cidade encontrada."}
                        </CommandEmpty>
                        <CommandGroup>
                          {cities
                            .filter(city => city?.microrregiao?.mesorregiao?.UF?.sigla)
                            .map((city) => {
                              const uf = city.microrregiao?.mesorregiao?.UF?.sigla || '';
                              const cityName = `${city.nome} - ${uf}`;
                              // Valor de busca normalizado sem acentos para melhor compatibilidade
                              const searchValue = `${removeAccents(city.nome)} ${removeAccents(uf)} ${cityName}`;
                              
                              return (
                                <CommandItem
                                  key={city.id}
                                  value={searchValue}
                                  onSelect={() => {
                                    setFormData({ 
                                      ...formData, 
                                      city: cityName
                                    });
                                    setOpenCityCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.city === cityName
                                        ? "opacity-100" 
                                        : "opacity-0"
                                    )}
                                  />
                                  {cityName}
                                </CommandItem>
                              );
                            })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
