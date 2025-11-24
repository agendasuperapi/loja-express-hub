import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';

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

  // Sincronizar previewUrl com currentImageUrl quando mudar
  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  // Limpar URLs de objetos quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      // Limpar preview anterior se existir
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione uma imagem',
          variant: 'destructive',
        });
        return;
      }

      // Definir dimensões recomendadas baseadas no tipo de bucket
      const recommendedDimensions = {
        'product-images': { width: 800, height: 800, label: 'Produtos (800x800px - Quadrada)' },
        'store-logos': { width: 400, height: 400, label: 'Logo (400x400px - Quadrada)' },
        'store-banners': { width: 1200, height: 400, label: 'Banner (1200x400px - 3:1)' },
      };

      const recommended = recommendedDimensions[bucket];

      // Ler dimensões da imagem
      const imageDimensions = await getImageDimensions(file);

      // Verificar se as dimensões estão muito diferentes das recomendadas
      const widthDiff = Math.abs(imageDimensions.width - recommended.width);
      const heightDiff = Math.abs(imageDimensions.height - recommended.height);
      const isVeryDifferent = widthDiff > recommended.width * 0.3 || heightDiff > recommended.height * 0.3;

      if (isVeryDifferent) {
        toast({
          title: '⚠️ Dimensões não recomendadas',
          description: `Imagem atual: ${imageDimensions.width}x${imageDimensions.height}px\nRecomendado: ${recommended.label}\n\nA imagem será redimensionada automaticamente.`,
          duration: 6000,
        });
      }

      // Definir dimensões máximas baseadas no tipo de bucket
      const maxDimensions = {
        'product-images': { width: 800, height: 800 },
        'store-logos': { width: 400, height: 400 },
        'store-banners': { width: 1200, height: 400 },
      };

      const { width: maxWidth, height: maxHeight } = maxDimensions[bucket];

      // Redimensionar a imagem
      const resizedBlob = await resizeImage(file, maxWidth, maxHeight);

      // Para product-images, usar productId.jpg ao invés de temp/random
      let fileName: string;
      if (bucket === 'product-images' && productId) {
        fileName = `${productId}.jpg`;
      } else {
        const fileExt = 'jpg';
        fileName = `${folder}/${Math.random()}.${fileExt}`;
      }

      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(fileName, resizedBlob, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Adicionar timestamp para forçar atualização da imagem no cache
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      
      setPreviewUrl(urlWithTimestamp);
      onUploadComplete(publicUrl);

      toast({
        title: 'Upload concluído!',
        description: 'Imagem enviada com sucesso.',
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
      // Limpar o input para permitir o upload do mesmo arquivo novamente
      event.target.value = '';
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
    sm: 'max-w-[150px]',
    md: 'max-w-[220px]',
    lg: 'max-w-[350px]'
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <p className="text-xs text-muted-foreground">
        {bucket === 'product-images' && 'Recomendado: 800x450'}
        {bucket === 'store-logos' && 'Recomendado: 400x400px (quadrada)'}
        {bucket === 'store-banners' && 'Recomendado: 1200x400px (3:1)'}
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
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className={`${aspectRatio} ${sizeClasses[size]} rounded-lg border-2 border-dashed border-border flex items-center justify-center`}>
          <Label
            htmlFor={`upload-${bucket}-${folder}`}
            className="cursor-pointer flex flex-col items-center justify-center p-4 text-center"
          >
            <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Clique para selecionar uma imagem
            </span>
          </Label>
        </div>
      )}
      
      <Input
        id={`upload-${bucket}-${folder}`}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />
    </div>
  );
};
