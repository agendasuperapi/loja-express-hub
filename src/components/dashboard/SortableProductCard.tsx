import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit, GripVertical, Copy, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SortableProductCardProps {
  product: any;
  index: number;
  isReorderMode: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  onEdit: (product: any) => void;
  onToggleAvailability: (id: string, isAvailable: boolean) => void;
  onToggleFeatured?: (id: string, isFeatured: boolean) => void;
  onDuplicate: (product: any) => void;
}

export const SortableProductCard = ({
  product,
  index,
  isReorderMode,
  hasPermission,
  onEdit,
  onToggleAvailability,
  onToggleFeatured,
  onDuplicate,
}: SortableProductCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`hover-scale border-muted/50 hover:border-primary/30 transition-all hover:shadow-lg ${isReorderMode ? 'cursor-move' : ''}`}>
        <CardContent className="p-4">
          <div className="flex gap-2">
            {/* Drag Handle */}
            {isReorderMode && (
              <div {...attributes} {...listeners} className="flex items-center cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1">
              {product.image_url && (
                <div className="aspect-video w-full rounded-lg overflow-hidden mb-3 bg-muted relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                  {product.is_featured && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-yellow-500 text-white border-none shadow-lg">
                        <Star className="h-3 w-3 mr-1 fill-white" />
                        Destaque
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">{product.name}</h4>
                  <p className="text-sm text-muted-foreground">{product.category}</p>
                </div>
                <Badge variant={product.is_available ? 'default' : 'secondary'}>
                  {product.is_available ? 'Disponível' : 'Indisponível'}
                </Badge>
              </div>
              {product.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {product.description}
                </p>
              )}
              <div className="flex justify-between items-center">
                <span className="font-bold text-primary text-lg">
                  R$ {Number(product.price).toFixed(2)}
                </span>
                {!isReorderMode && (
                  <div className="flex gap-2 items-center">
                    {hasPermission('products', 'update') && (
                      <>
                        {/* Switch de Destaque */}
                        <div className="flex items-center gap-2 mr-2">
                          <Star className={cn(
                            "h-4 w-4 transition-colors",
                            product.is_featured ? "fill-yellow-500 text-yellow-500" : "text-gray-400"
                          )} />
                          <Switch
                            checked={product.is_featured || false}
                            onCheckedChange={(checked) => {
                              onToggleFeatured?.(product.id, checked);
                            }}
                            className="data-[state=checked]:bg-yellow-500"
                          />
                          <span className="text-xs text-muted-foreground">
                            {product.is_featured ? 'Destaque' : 'Normal'}
                          </span>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDuplicate(product)}
                          className="hover-scale"
                          title="Duplicar produto"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(product)}
                          className="hover-scale"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
