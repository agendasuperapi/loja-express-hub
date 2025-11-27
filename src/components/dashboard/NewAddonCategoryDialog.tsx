import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, X } from "lucide-react";

interface NewAddonCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    min_items: number;
    max_items: number | null;
    is_exclusive: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const NewAddonCategoryDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: NewAddonCategoryDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    min_items: 0,
    max_items: null as number | null,
    is_exclusive: false,
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    
    // Validação dos limites
    if (formData.min_items < 0) {
      alert('O mínimo de itens não pode ser negativo');
      return;
    }
    
    if (!formData.is_exclusive && formData.max_items !== null && formData.max_items < formData.min_items) {
      alert('O máximo de itens deve ser maior ou igual ao mínimo');
      return;
    }

    await onSubmit({
      name: formData.name.trim(),
      min_items: formData.min_items,
      max_items: formData.is_exclusive ? 1 : formData.max_items,
      is_exclusive: formData.is_exclusive
    });
    
    setFormData({ name: '', min_items: 0, max_items: null, is_exclusive: false });
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Nova Categoria de Adicional</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Crie uma categoria para organizar seus adicionais
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome da Categoria</Label>
            <Input
              id="category-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Carnes, Queijos, Molhos..."
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex-1">
                <Label htmlFor="exclusive-switch" className="text-sm font-medium cursor-pointer">
                  Seleção Exclusiva
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Permitir apenas 1 item selecionado (como tipo de carne, tamanho, etc.)
                </p>
              </div>
              <Switch
                id="exclusive-switch"
                checked={formData.is_exclusive}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_exclusive: checked, max_items: checked ? 1 : formData.max_items })
                }
                disabled={isLoading}
              />
            </div>
          </div>

          {!formData.is_exclusive && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mínimo de Itens</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0 = opcional"
                  value={formData.min_items}
                  onChange={(e) => setFormData({ ...formData, min_items: parseInt(e.target.value) || 0 })}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Máximo de Itens</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Deixe vazio = ilimitado"
                  value={formData.max_items || ''}
                  onChange={(e) => setFormData({ ...formData, max_items: e.target.value ? parseInt(e.target.value) : null })}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
        </div>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.name.trim()}
          >
            <Check className="w-4 h-4 mr-2" />
            {isLoading ? "Criando..." : "Criar Categoria"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
