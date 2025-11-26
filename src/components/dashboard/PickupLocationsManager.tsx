import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, MapPin, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatCep, fetchCepData } from "@/lib/cepValidation";

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
  isStoreAddress?: boolean;
}

interface PickupLocationsManagerProps {
  storeId: string;
}

export const PickupLocationsManager = ({ storeId }: PickupLocationsManagerProps) => {
  const queryClient = useQueryClient();
  const [newLocation, setNewLocation] = useState({ 
    name: "", 
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    complement: ""
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState({ name: "", address: "" });
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const { data: storeData } = useQuery({
    queryKey: ["store-address", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stores")
        .select("store_street, store_street_number, store_neighborhood, store_city, store_complement, store_address_pickup_enabled, store_address_pickup_name")
        .eq("id", storeId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["pickup-locations", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_pickup_locations")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as PickupLocation[];
    },
  });

  // Formatar endereço da loja se existir
  const storeAddress = storeData && (storeData.store_street || storeData.store_city) ? {
    id: "store-address",
    name: storeData.store_address_pickup_name || "Endereço da Loja",
    address: [
      storeData.store_street,
      storeData.store_street_number,
      storeData.store_neighborhood,
      storeData.store_city,
      storeData.store_complement
    ].filter(Boolean).join(", "),
    is_active: storeData.store_address_pickup_enabled ?? true,
    isStoreAddress: true
  } : null;

  // Combinar endereço da loja com outros locais
  const allLocations = storeAddress ? [storeAddress, ...locations] : locations;

  const addLocationMutation = useMutation({
    mutationFn: async () => {
      const fullAddress = [
        newLocation.street,
        newLocation.number,
        newLocation.neighborhood,
        newLocation.city,
        newLocation.complement
      ].filter(Boolean).join(", ");

      const { error } = await (supabase as any)
        .from("store_pickup_locations")
        .insert({
          store_id: storeId,
          name: newLocation.name,
          address: fullAddress,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup-locations", storeId] });
      setNewLocation({ 
        name: "", 
        cep: "",
        street: "",
        number: "",
        neighborhood: "",
        city: "",
        complement: ""
      });
      setIsAdding(false);
      toast.success("Endereço de retirada adicionado");
    },
    onError: () => {
      toast.error("Erro ao adicionar endereço");
    },
  });

  const toggleLocationMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("store_pickup_locations")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup-locations", storeId] });
      toast.success("Status atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const toggleStoreAddressMutation = useMutation({
    mutationFn: async (is_active: boolean) => {
      const { error } = await (supabase as any)
        .from("stores")
        .update({ store_address_pickup_enabled: is_active })
        .eq("id", storeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-address", storeId] });
      toast.success("Status do endereço da loja atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const updateStoreAddressNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await (supabase as any)
        .from("stores")
        .update({ store_address_pickup_name: name })
        .eq("id", storeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-address", storeId] });
      toast.success("Nome atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar nome");
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, name, address }: { id: string; name: string; address: string }) => {
      const { error } = await (supabase as any)
        .from("store_pickup_locations")
        .update({ name, address })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup-locations", storeId] });
      setEditingId(null);
      setEditLocation({ name: "", address: "" });
      toast.success("Endereço atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar endereço");
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("store_pickup_locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup-locations", storeId] });
      toast.success("Endereço removido");
    },
    onError: () => {
      toast.error("Erro ao remover endereço");
    },
  });

  const handleAddLocation = () => {
    if (!newLocation.name.trim() || !newLocation.street.trim() || !newLocation.city.trim()) {
      toast.error("Preencha nome, rua e cidade");
      return;
    }
    addLocationMutation.mutate();
  };

  const handleCepChange = async (cep: string) => {
    const formatted = formatCep(cep);
    setNewLocation({ ...newLocation, cep: formatted });

    if (formatted.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const data = await fetchCepData(formatted);
      
      if (data) {
        setNewLocation(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          complement: data.complemento
        }));
        toast.success("Endereço encontrado!");
      } else {
        toast.error("CEP não encontrado");
      }
      setIsLoadingCep(false);
    }
  };

  const handleEditLocation = (id: string) => {
    if (!editLocation.name.trim() || !editLocation.address.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    updateLocationMutation.mutate({ id, name: editLocation.name, address: editLocation.address });
  };

  const handleEditStoreAddressName = () => {
    if (!editLocation.name.trim()) {
      toast.error("Preencha o nome");
      return;
    }
    updateStoreAddressNameMutation.mutate(editLocation.name);
    setEditingId(null);
    setEditLocation({ name: "", address: "" });
  };

  const startEditing = (location: PickupLocation) => {
    setEditingId(location.id);
    setEditLocation({ name: location.name, address: location.address });
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditLocation({ name: "", address: "" });
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-primary">
          <MapPin className="h-4 w-4" />
          Endereços de Retirada
        </CardTitle>
        <CardDescription className="text-xs">
          Gerencie os locais onde os clientes podem retirar seus pedidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        {allLocations.map((location) => (
          editingId === location.id ? (
            <div key={location.id} className="space-y-3 p-3 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor={`edit-name-${location.id}`} className="text-xs">Nome do Local</Label>
                <Input
                  id={`edit-name-${location.id}`}
                  placeholder="Ex: Loja Centro"
                  value={editLocation.name}
                  onChange={(e) => setEditLocation({ ...editLocation, name: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              {!location.isStoreAddress && (
                <div className="space-y-2">
                  <Label htmlFor={`edit-address-${location.id}`} className="text-xs">Endereço Completo</Label>
                  <Input
                    id={`edit-address-${location.id}`}
                    placeholder="Rua, número, bairro, cidade"
                    value={editLocation.address}
                    onChange={(e) => setEditLocation({ ...editLocation, address: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button 
                  onClick={() => location.isStoreAddress ? handleEditStoreAddressName() : handleEditLocation(location.id)} 
                  size="sm" 
                  className="h-8"
                >
                  Salvar
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={cancelEditing}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={location.id}
              className="flex items-start gap-3 p-3 border rounded-lg bg-background"
            >
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium">{location.name}</div>
                <div className="text-xs text-muted-foreground">{location.address}</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={location.is_active}
                  onCheckedChange={(checked) => {
                    if (location.isStoreAddress) {
                      toggleStoreAddressMutation.mutate(checked);
                    } else {
                      toggleLocationMutation.mutate({ id: location.id, is_active: checked });
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => startEditing(location)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                {!location.isStoreAddress && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => deleteLocationMutation.mutate(location.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                {location.isStoreAddress && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Padrão da loja)
                  </span>
                )}
              </div>
            </div>
          )
        ))}

        {isAdding ? (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="location-name" className="text-xs">Nome do Local</Label>
              <Input
                id="location-name"
                placeholder="Ex: Loja Centro"
                value={newLocation.name}
                onChange={(e) =>
                  setNewLocation({ ...newLocation, name: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-cep" className="text-xs">CEP</Label>
              <Input
                id="location-cep"
                placeholder="00000-000"
                value={newLocation.cep}
                onChange={(e) => handleCepChange(e.target.value)}
                disabled={isLoadingCep}
                className="h-8 text-sm"
                maxLength={9}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="location-street" className="text-xs">Rua</Label>
                <Input
                  id="location-street"
                  placeholder="Nome da rua"
                  value={newLocation.street}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, street: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-number" className="text-xs">Número</Label>
                <Input
                  id="location-number"
                  placeholder="Nº"
                  value={newLocation.number}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, number: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="location-neighborhood" className="text-xs">Bairro</Label>
                <Input
                  id="location-neighborhood"
                  placeholder="Bairro"
                  value={newLocation.neighborhood}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, neighborhood: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-city" className="text-xs">Cidade</Label>
                <Input
                  id="location-city"
                  placeholder="Cidade"
                  value={newLocation.city}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, city: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-complement" className="text-xs">Complemento</Label>
              <Input
                id="location-complement"
                placeholder="Complemento (opcional)"
                value={newLocation.complement}
                onChange={(e) =>
                  setNewLocation({ ...newLocation, complement: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddLocation} size="sm" className="h-8">Salvar</Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  setIsAdding(false);
                  setNewLocation({ 
                    name: "", 
                    cep: "",
                    street: "",
                    number: "",
                    neighborhood: "",
                    city: "",
                    complement: ""
                  });
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-9"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar Endereço
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
