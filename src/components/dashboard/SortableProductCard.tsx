import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit, GripVertical, Copy, Star, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface SortableProductCardProps {
  product: any;
  index: number;
  isReorderMode: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  onEdit: (product: any) => void;
  onToggleAvailability: (id: string, isAvailable: boolean) => void;
  onToggleFeatured?: (id: string, isFeatured: boolean) => void;
  onDuplicate: (product: any) => void;
  onDelete?: (id: string) => void;
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
  onDelete,
}: SortableProductCardProps) => {
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
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
      <Card className={cn(
        "hover-scale border-muted/50 hover:border-primary/30 transition-all hover:shadow-lg h-full",
        isReorderMode && 'cursor-move'
      )}>
        <CardContent className="p-4 h-full">
          <div className="flex gap-3 h-full">
            {/* Drag Handle */}
            {isReorderMode && (
              <div {...attributes} {...listeners} className="flex items-start pt-2 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 flex flex-col min-w-0">
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
              <div className="flex justify-between items-center mt-auto pt-3">
                <span className="font-bold text-primary text-lg">
                  R$ {Number(product.price).toFixed(2)}
                </span>
                {!isReorderMode && (
                  <div className="flex gap-2 items-center">
                    {hasPermission('products', 'update') && (
                      <>
                        {/* Switch de Disponibilidade */}
                        <div className="flex items-center gap-2 mr-2">
                          <Switch
                            checked={product.is_available}
                            onCheckedChange={(checked) => 
                              onToggleAvailability(product.id, checked)
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {product.is_available ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        
                        {/* Botão Excluir - apenas para produtos inativos */}
                        {!product.is_available && onDelete && hasPermission('products', 'delete') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowDeleteDialog(true)}
                            className="hover-scale text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Excluir produto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowDuplicateDialog(true)}
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
      
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja duplicar o produto "{product.name}"? Uma cópia será criada com os mesmos dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onDuplicate(product);
              setShowDuplicateDialog(false);
            }}>
              Duplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{product.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete?.(product.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};
