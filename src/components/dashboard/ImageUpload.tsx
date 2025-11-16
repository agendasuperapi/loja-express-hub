import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Crop } from 'lucide-react';
import { ImageCropDialog } from './ImageCropDialog';

interface ImageUploadProps {
  bucket: 'store-logos' | 'store-banners' | 'product-images';
  folder: string;
  currentImageUrl?: string;
  onUploadComplete: (url: string) => void;
  label: string;
  aspectRatio?: string;
  size?: 'sm' | 'md' | 'lg';
  productId?: string; // ID do produto para usar como nome do arquivo
}

export const ImageUpload = ({
  bucket,
  folder,
  currentImageUrl,
  onUploadComplete,
  label,
  aspectRatio = 'aspect-square',
  size = 'md',
  productId
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const aspectRatioMap: Record<string, number> = {
    'aspect-square': 1,
    'aspect-[21/9]': 21 / 9,
    'aspect-video': 16 / 9,
  };

  const numericAspectRatio = aspectRatioMap[aspectRatio] || 1;

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular novas dimensões mantendo a proporção
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Erro ao redimensionar imagem'));
            }
          },
          'image/jpeg',
          0.9
        );
      };

      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = URL.createObjectURL(file);
    });
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Erro ao ler dimensões da imagem'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    // Criar URL temporária para a imagem
    const imageUrl = URL.createObjectURL(file);
    setTempImageSrc(imageUrl);
    setOriginalFile(file);
    setCropDialogOpen(true);

    // Reset do input
    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploading(true);

      // Para product-images, usar productId.jpg ao invés de temp/random
      let fileName: string;
      if (bucket === 'product-images' && productId) {
        fileName = `${productId}.jpg`;
      } else {
        const fileExt = 'jpg';
        fileName = `${folder}/${Math.random()}.${fileExt}`;
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, croppedBlob, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);

      toast({
        title: '✅ Upload concluído!',
        description: 'Imagem enviada com sucesso nas dimensões corretas.',
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setTempImageSrc(null);
      setOriginalFile(null);
    }
  };

  const handleRemove = async () => {
    if (currentImageUrl) {
      try {
        // Extrair o caminho do arquivo da URL
        const path = currentImageUrl.split(`${bucket}/`)[1];
        if (path) {
          await supabase.storage.from(bucket).remove([path]);
        }
      } catch (error) {
        console.error('Erro ao remover imagem:', error);
      }
    }
    setPreviewUrl(null);
    onUploadComplete('');
  };

  const sizeClasses = {
    sm: 'max-w-[200px]',
    md: 'max-w-[300px]',
    lg: 'max-w-[400px]'
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        <p className="text-xs text-muted-foreground">
          {bucket === 'product-images' && '📐 Dimensão final: 800x800px (quadrada)'}
          {bucket === 'store-logos' && '📐 Dimensão final: 400x400px (quadrada)'}
          {bucket === 'store-banners' && '📐 Dimensão final: 1200x400px (3:1)'}
        </p>
        
        {previewUrl ? (
          <div className="relative">
            <div className={`${aspectRatio} ${sizeClasses[size]} rounded-lg overflow-hidden border border-border`}>
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-destructive/90"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <label
            htmlFor={`file-${bucket}-${folder}`}
            className="block cursor-pointer"
          >
            <div className={`${aspectRatio} ${sizeClasses[size]} rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center bg-muted/50`}>
              <div className="text-center p-4">
                <Crop className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {uploading ? 'Enviando...' : 'Clique para selecionar'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Você poderá ajustar e recortar a imagem
                </p>
              </div>
            </div>
            <Input
              id={`file-${bucket}-${folder}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {tempImageSrc && (
        <ImageCropDialog
          open={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setTempImageSrc(null);
            setOriginalFile(null);
          }}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={numericAspectRatio}
          bucketType={bucket}
        />
      )}
    </>
  );
};
