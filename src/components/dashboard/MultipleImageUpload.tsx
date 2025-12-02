import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Loader2, Star, StarOff, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

interface MultipleImageUploadProps {
  productId: string;
  images: ProductImage[];
  onImagesChange: () => void;
}

interface SortableImageProps {
  image: ProductImage;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onZoom: (imageUrl: string) => void;
}

function SortableImage({ image, onRemove, onSetPrimary, onZoom }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <div 
        className="aspect-[4/3] w-full rounded-lg overflow-hidden border-2 border-border bg-muted/30 cursor-pointer hover:border-primary transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onZoom(image.image_url);
        }}
      >
        <img
          src={image.image_url}
          alt="Imagem do produto"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      
      {image.is_primary && (
        <Badge className="absolute top-1 left-1 bg-yellow-500 hover:bg-yellow-600 z-10">
          <Star className="w-3 h-3 mr-1 fill-white" />
          Principal
        </Badge>
      )}
      
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div 
          className="cursor-move"
          {...attributes}
          {...listeners}
        >
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-7 w-7 bg-background/80 backdrop-blur-sm"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Button>
        </div>
        {!image.is_primary && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-7 w-7 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onSetPrimary(image.id);
            }}
          >
            <StarOff className="h-3 w-3" />
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-7 w-7 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(image.id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export const MultipleImageUpload = ({
  productId,
  images: initialImages,
  onImagesChange,
}: MultipleImageUploadProps) => {
  const [images, setImages] = useState<ProductImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setImages(initialImages.sort((a, b) => a.display_order - b.display_order));
  }, [initialImages]);

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const MAX_FILE_SIZE = 300 * 1024; // 300KB

      img.onload = () => {
        canvas.width = 800;
        canvas.height = 450;

        const imgAspect = img.width / img.height;
        const canvasAspect = 800 / 450;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgAspect > canvasAspect) {
          drawWidth = 800;
          drawHeight = 800 / imgAspect;
          offsetX = 0;
          offsetY = (450 - drawHeight) / 2;
        } else {
          drawHeight = 450;
          drawWidth = 450 * imgAspect;
          offsetX = (800 - drawWidth) / 2;
          offsetY = 0;
        }

        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 800, 450);
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        }

        const compressImage = (quality: number): Promise<Blob> => {
          return new Promise((resolveCompress) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Erro ao comprimir imagem'));
                  return;
                }

                if (blob.size <= MAX_FILE_SIZE || quality <= 0.3) {
                  resolveCompress(blob);
                } else {
                  compressImage(quality - 0.1).then(resolveCompress);
                }
              },
              'image/jpeg',
              quality
            );
          });
        };

        compressImage(0.8).then(resolve).catch(reject);
      };

      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      const files = event.target.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Arquivo inválido',
            description: `${file.name} não é uma imagem`,
            variant: 'destructive',
          });
          continue;
        }

        const resizedBlob = await resizeImage(file);
        const fileName = `${productId}_${Date.now()}_${i}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, resizedBlob, {
            contentType: 'image/jpeg',
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        const nextOrder = images.length;
        const isPrimary = images.length === 0;

        const { error: dbError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: publicUrl,
            display_order: nextOrder,
            is_primary: isPrimary,
          });

        if (dbError) throw dbError;
      }

      toast({
        title: 'Upload concluído!',
        description: `${files.length} imagem(ns) enviada(s) com sucesso.`,
      });

      onImagesChange();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar as imagens.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemove = async (imageId: string) => {
    try {
      const image = images.find(img => img.id === imageId);
      if (!image) return;

      const pathMatch = image.image_url.split('product-images/')[1];
      if (pathMatch) {
        await supabase.storage.from('product-images').remove([pathMatch]);
      }

      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: 'Imagem removida',
        description: 'A imagem foi removida com sucesso.',
      });

      onImagesChange();
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a imagem.',
        variant: 'destructive',
      });
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: 'Imagem principal atualizada',
      });

      onImagesChange();
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a imagem principal.',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);

    const newImages = arrayMove(images, oldIndex, newIndex);
    setImages(newImages);

    try {
      const updates = newImages.map((img, index) => ({
        id: img.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('product_images')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      onImagesChange();
    } catch (error) {
      console.error('Erro ao reordenar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reordenar as imagens.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-2">
          <div className="relative w-full h-[80vh]">
            <img
              src={zoomedImage || ''}
              alt="Imagem ampliada"
              className="w-full h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Imagens do Produto</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Recomendado: 800x450px. Arraste para reordenar.
        </p>
      </div>

      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map(img => img.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {images.map((image) => (
                <SortableImage
                  key={image.id}
                  image={image}
                  onRemove={handleRemove}
                  onSetPrimary={handleSetPrimary}
                  onZoom={setZoomedImage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center">
        <Label
          htmlFor="multiple-upload"
          className="cursor-pointer flex flex-col items-center justify-center text-center"
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 mb-2 text-muted-foreground animate-spin" />
              <span className="text-sm text-muted-foreground">Enviando...</span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Clique para adicionar imagens
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                Você pode selecionar múltiplas imagens
              </span>
            </>
          )}
        </Label>
        <Input
          id="multiple-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </div>
      </div>
    </>
  );
};
