import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductAddons } from "@/hooks/useProductAddons";
import { Badge } from "@/components/ui/badge";

interface ProductAddonsManagerProps {
  productId: string;
}

export const ProductAddonsManager = ({ productId }: ProductAddonsManagerProps) => {
  const { addons, createAddon, updateAddon, deleteAddon, isCreating, isDeleting } = useProductAddons(productId);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    is_available: true,
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      updateAddon({ id: editingId, ...formData });
      setEditingId(null);
    } else {
      createAddon({ ...formData, product_id: productId });
    }
    
    setFormData({ name: '', price: 0, is_available: true });
    setIsAdding(false);
  };

  const handleEdit = (addon: any) => {
    setEditingId(addon.id);
    setFormData({
      name: addon.name,
      price: addon.price,
      is_available: addon.is_available,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', price: 0, is_available: true });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Adicionais</CardTitle>
            <CardDescription>Gerencie os adicionais deste produto</CardDescription>
          </div>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Adicional
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Nome do Adicional</Label>
              <Input
                placeholder="Ex: Queijo extra, Bacon..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Preço Adicional</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-9"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
                <Label>Disponível</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={isCreating} className="flex-1">
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {addons && addons.length > 0 ? (
            addons.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div>
                    <p className="font-medium">{addon.name}</p>
                    <p className="text-sm text-muted-foreground">
                      + R$ {addon.price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={addon.is_available ? "default" : "secondary"}>
                    {addon.is_available ? 'Disponível' : 'Indisponível'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(addon)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAddon(addon.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum adicional cadastrado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
