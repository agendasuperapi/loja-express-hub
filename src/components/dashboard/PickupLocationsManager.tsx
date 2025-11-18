import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
}

interface PickupLocationsManagerProps {
  storeId: string;
}

export const PickupLocationsManager = ({ storeId }: PickupLocationsManagerProps) => {
  const queryClient = useQueryClient();
  const [newLocation, setNewLocation] = useState({ name: "", address: "" });
  const [isAdding, setIsAdding] = useState(false);

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

  const addLocationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("store_pickup_locations")
        .insert({
          store_id: storeId,
          name: newLocation.name,
          address: newLocation.address,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup-locations", storeId] });
      setNewLocation({ name: "", address: "" });
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
    if (!newLocation.name.trim() || !newLocation.address.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    addLocationMutation.mutate();
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" />
          Endereços de Retirada
        </CardTitle>
        <CardDescription className="text-xs">
          Gerencie os locais onde os clientes podem retirar seus pedidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        {locations.map((location) => (
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
                onCheckedChange={(checked) =>
                  toggleLocationMutation.mutate({ id: location.id, is_active: checked })
                }
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => deleteLocationMutation.mutate(location.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
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
              <Label htmlFor="location-address" className="text-xs">Endereço Completo</Label>
              <Input
                id="location-address"
                placeholder="Rua, número, bairro, cidade"
                value={newLocation.address}
                onChange={(e) =>
                  setNewLocation({ ...newLocation, address: e.target.value })
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
                  setNewLocation({ name: "", address: "" });
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
