import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductFlavors } from "@/hooks/useProductFlavors";
import { Badge } from "@/components/ui/badge";

interface ProductFlavorsManagerProps {
  productId: string;
}

export const ProductFlavorsManager = ({ productId }: ProductFlavorsManagerProps) => {
  const { flavors, createFlavor, updateFlavor, deleteFlavor, isCreating, isDeleting } = useProductFlavors(productId);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    is_available: true,
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      updateFlavor({ id: editingId, ...formData });
      setEditingId(null);
    } else {
      createFlavor({ ...formData, product_id: productId });
    }
    
    setFormData({ name: '', description: '', price: 0, is_available: true });
    setIsAdding(false);
  };

  const handleEdit = (flavor: any) => {
    setEditingId(flavor.id);
    setFormData({
      name: flavor.name,
      description: flavor.description || '',
      price: flavor.price,
      is_available: flavor.is_available,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '', price: 0, is_available: true });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sabores da Pizza</CardTitle>
            <CardDescription>Gerencie os sabores disponíveis para este produto</CardDescription>
          </div>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Sabor
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Nome do Sabor</Label>
              <Input
                placeholder="Ex: Calabresa, Mussarela..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição (Opcional)</Label>
              <Textarea
                placeholder="Descreva os ingredientes do sabor..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Preço do Sabor</Label>
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
              <p className="text-xs text-muted-foreground">
                Quando o cliente escolher múltiplos sabores, o preço final será a média dos sabores selecionados
              </p>
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
          {flavors && flavors.length > 0 ? (
            flavors.map((flavor) => (
              <div
                key={flavor.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{flavor.name}</p>
                    <span className="text-sm text-muted-foreground">
                      R$ {flavor.price.toFixed(2)}
                    </span>
                  </div>
                  {flavor.description && (
                    <p className="text-sm text-muted-foreground">{flavor.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={flavor.is_available ? "default" : "secondary"}>
                    {flavor.is_available ? 'Disponível' : 'Indisponível'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(flavor)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFlavor(flavor.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum sabor cadastrado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
