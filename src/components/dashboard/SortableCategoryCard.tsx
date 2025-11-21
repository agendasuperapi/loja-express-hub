import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FolderTree, GripVertical, Edit, Trash2 } from "lucide-react";

interface SortableCategoryCardProps {
  category: any;
  index: number;
  isReorderMode: boolean;
  hasPermission: (module: string, action: string) => boolean;
  products?: any[];
  onEdit: (category: any) => void;
  onDelete: (categoryId: string) => void;
  onToggleStatus: (categoryId: string, isActive: boolean) => void;
}

export const SortableCategoryCard = ({
  category,
  index,
  isReorderMode,
  hasPermission,
  products = [],
  onEdit,
  onDelete,
  onToggleStatus,
}: SortableCategoryCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const categoryProducts = products.filter(p => p.category === category.name);

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`hover:shadow-lg transition-shadow ${isReorderMode ? 'cursor-move' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              {isReorderMode && (
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
                >
                  <GripVertical className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderTree className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {categoryProducts.length} produtos
                </p>
              </div>
            </div>
            <Badge variant={category.is_active ? "default" : "secondary"}>
              {category.is_active ? "Ativa" : "Inativa"}
            </Badge>
          </div>
        </CardHeader>
        
        {!isReorderMode && (
          <CardContent className="space-y-3">
            {hasPermission('categories', 'update') && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(category)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                {hasPermission('categories', 'delete') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(category.id)}
                    className="hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            
            {hasPermission('categories', 'update') && (
              <div className="flex items-center justify-between pt-2 border-t">
                <Label htmlFor={`category-status-${category.id}`} className="text-sm cursor-pointer">
                  {category.is_active ? "Categoria ativa" : "Categoria inativa"}
                </Label>
                <Switch
                  id={`category-status-${category.id}`}
                  checked={category.is_active}
                  onCheckedChange={(checked) => onToggleStatus(category.id, checked)}
                />
              </div>
            )}
            
            {categoryProducts.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Produtos nesta categoria:</p>
                <div className="flex flex-wrap gap-2">
                  {categoryProducts
                    .slice(0, 3)
                    .map(product => (
                      <Badge key={product.id} variant="outline" className="text-xs">
                        {product.name}
                      </Badge>
                    ))}
                  {categoryProducts.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{categoryProducts.length - 3} mais
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};
