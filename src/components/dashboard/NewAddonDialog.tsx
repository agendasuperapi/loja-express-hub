import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Plus } from "lucide-react";
import { useAddonCategories } from "@/hooks/useAddonCategories";
import { toast } from "sonner";

interface NewAddonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onSubmit: (data: {
    name: string;
    price: number;
    category_id: string | null;
    is_available: boolean;
    allow_quantity: boolean;
  }) => void;
  editData?: {
    name: string;
    price: number;
    category_id: string | null;
    is_available: boolean;
    allow_quantity: boolean;
  } | null;
  isLoading?: boolean;
}

export const NewAddonDialog = ({
  open,
  onOpenChange,
  storeId,
  onSubmit,
  editData,
  isLoading,
}: NewAddonDialogProps) => {
  const { categories, addCategory, refetch } = useAddonCategories(storeId);
  const [formData, setFormData] = useState({
    name: "",
    price: "0.00",
    category_id: "",
    is_available: true,
    allow_quantity: false,
  });
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Update form when editing
  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name,
        price: editData.price.toFixed(2),
        category_id: editData.category_id || "",
        is_available: editData.is_available,
        allow_quantity: editData.allow_quantity,
      });
    } else if (!open) {
      // Reset form when dialog closes
      setFormData({
        name: "",
        price: "0.00",
        category_id: "",
        is_available: true,
        allow_quantity: false,
      });
    }
  }, [editData, open]);

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) return;

    onSubmit({
      name: formData.name.trim(),
      price,
      category_id: formData.category_id || null,
      is_available: formData.is_available,
      allow_quantity: formData.allow_quantity,
    });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Digite um nome para a categoria");
      return;
    }

    setIsCreatingCategory(true);
    try {
      await addCategory(newCategoryName.trim());
      await refetch();
      toast.success("Categoria criada com sucesso!");
      setNewCategoryName("");
      setShowNewCategory(false);
    } catch (error) {
      toast.error("Erro ao criar categoria");
      console.error(error);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const activeCategories = categories?.filter((c) => c.is_active) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editData ? "Editar Adicional" : "Novo Adicional"}
          </DialogTitle>
          <DialogDescription>
            {editData
              ? "Atualize as informações do adicional"
              : "Adicione um novo adicional ao seu cardápio"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome do Adicional */}
          <div className="space-y-2">
            <Label htmlFor="addon-name">Nome do Adicional</Label>
            <Input
              id="addon-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Bacon, Queijo Extra, Borda Catupiry"
              disabled={isLoading}
            />
          </div>

          {/* Preço */}
          <div className="space-y-2">
            <Label htmlFor="addon-price">Preço (R$)</Label>
            <Input
              id="addon-price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              placeholder="0.00"
              disabled={isLoading}
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="addon-category">Categoria</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {showNewCategory && (
              <div className="flex gap-2 p-3 border rounded-lg bg-muted/30">
                <Input
                  placeholder="Nome da nova categoria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  disabled={isCreatingCategory}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateCategory();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={isCreatingCategory || !newCategoryName.trim()}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName("");
                  }}
                  disabled={isCreatingCategory}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Select
              value={formData.category_id || "uncategorized"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  category_id: value === "uncategorized" ? "" : value,
                })
              }
              disabled={isLoading}
            >
              <SelectTrigger id="addon-category">
                <SelectValue placeholder="Selecione uma categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uncategorized">Sem categoria</SelectItem>
                {activeCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Organize seus adicionais em categorias para facilitar a gestão
            </p>
          </div>

          {/* Disponibilidade */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex-1">
              <Label
                htmlFor="addon-available"
                className="text-sm font-medium cursor-pointer"
              >
                Disponível para pedidos
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes poderão adicionar este item aos pedidos
              </p>
            </div>
            <Switch
              id="addon-available"
              checked={formData.is_available}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_available: checked })
              }
              disabled={isLoading}
            />
          </div>

          {/* Permitir Quantidade */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex-1">
              <Label
                htmlFor="addon-allow-quantity"
                className="text-sm font-medium cursor-pointer"
              >
                Permitir seleção de quantidade
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Cliente poderá escolher múltiplas unidades (ex: 2x Bacon, 3x
                Queijo)
              </p>
            </div>
            <Switch
              id="addon-allow-quantity"
              checked={formData.allow_quantity}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, allow_quantity: checked })
              }
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.name.trim()}>
            <Check className="w-4 h-4 mr-2" />
            {isLoading ? "Salvando..." : editData ? "Atualizar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
