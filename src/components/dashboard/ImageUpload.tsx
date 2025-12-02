import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Loader2, ImageOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Sincronizar previewUrl com currentImageUrl quando mudar
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    if (currentImageUrl) {
      // Remover query strings antigas e adicionar nova timestamp para forçar reload
      const cleanUrl = currentImageUrl.split('?')[0];
      const urlWithTimestamp = `${cleanUrl}?t=${Date.now()}`;
      setPreviewUrl(urlWithTimestamp);
    } else {
      setPreviewUrl(null);
    }
  }, [currentImageUrl]);

  // Timeout como fallback se a imagem não carregar
  useEffect(() => {
    if (previewUrl && !imageLoaded && !imageError) {
      const timeout = setTimeout(() => {
        if (!imageLoaded) {
          console.log('Timeout: imagem não carregou em 10 segundos');
          setImageError(true);
        }
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [previewUrl, imageLoaded, imageError]);

  // Limpar URLs de objetos quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resizeImage = (file: File, maxWidth: number, maxHeight: number, maxFileSize: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const MAX_FILE_SIZE = maxFileSize;

      img.onload = () => {
        // Definir dimensões do canvas (800x450 para produtos)
        canvas.width = maxWidth;
        canvas.height = maxHeight;

        // Calcular proporção da imagem
        const imgAspect = img.width / img.height;
        const canvasAspect = maxWidth / maxHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        // Redimensionar mantendo proporção e centralizando
        if (imgAspect > canvasAspect) {
          // Imagem mais larga - ajustar pela largura
          drawWidth = maxWidth;
          drawHeight = maxWidth / imgAspect;
          offsetX = 0;
          offsetY = (maxHeight - drawHeight) / 2;
        } else {
          // Imagem mais alta - ajustar pela altura
          drawHeight = maxHeight;
          drawWidth = maxHeight * imgAspect;
          offsetX = (maxWidth - drawWidth) / 2;
          offsetY = 0;
        }

        // Preencher fundo branco
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, maxWidth, maxHeight);
          
          // Desenhar imagem centralizada
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        }

        // Função recursiva para comprimir até atingir o tamanho desejado
        const compressImage = (quality: number): Promise<Blob> => {
          return new Promise((resolveCompress) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Erro ao comprimir imagem'));
                  return;
                }

                console.log(`🔄 Tentando qualidade ${Math.round(quality * 100)}%: ${(blob.size / 1024).toFixed(2)}KB`);

                // Se o arquivo está dentro do limite ou a qualidade já está muito baixa
                if (blob.size <= MAX_FILE_SIZE || quality <= 0.3) {
                  const reduction = Math.round((1 - blob.size / file.size) * 100);
                  const finalSize = (blob.size / 1024).toFixed(2);
                  const targetSize = (MAX_FILE_SIZE / 1024).toFixed(0);
                  
                  if (blob.size > MAX_FILE_SIZE) {
                    console.warn(`⚠️ Imagem ainda está acima de ${targetSize}KB (${finalSize}KB) mesmo com qualidade mínima`);
                  } else {
                    console.log(`✅ Imagem otimizada: ${(file.size / 1024).toFixed(2)}KB → ${finalSize}KB (${reduction}% redução)`);
                  }
                  
                  resolveCompress(blob);
                } else {
                  // Reduzir qualidade e tentar novamente
                  compressImage(quality - 0.1).then(resolveCompress);
                }
              },
              'image/jpeg',
              quality
            );
          });
        };

        // Começar com qualidade 0.8 (80%)
        compressImage(0.8).then(resolve).catch(reject);
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
        'product-images': { width: 800, height: 450, label: 'Produtos (800x450px)' },
        'store-logos': { width: 400, height: 400, label: 'Logo (400x400px - Quadrada)' },
        'store-banners': { width: 1800, height: 600, label: 'Banner (1800x600px - 3:1)' },
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

      // Definir dimensões e tamanho máximo de arquivo baseados no tipo de bucket
      const compressionSettings = {
        'product-images': { width: 800, height: 450, maxSize: 300 * 1024 }, // 300KB
        'store-logos': { width: 400, height: 400, maxSize: 300 * 1024 }, // 300KB
        'store-banners': { width: 1800, height: 600, maxSize: 1024 * 1024 }, // 1MB para manter qualidade
      };

      const settings = compressionSettings[bucket];

      // Redimensionar a imagem
      const resizedBlob = await resizeImage(file, settings.width, settings.height, settings.maxSize);

      // Remover imagem antiga antes de fazer upload da nova
      if (currentImageUrl && bucket === 'product-images' && productId) {
        try {
          // Limpar URL primeiro (remover query strings) e então extrair o path
          const cleanUrl = currentImageUrl.split('?')[0];
          const oldPath = cleanUrl.split(`${bucket}/`)[1];
          if (oldPath) {
            console.log('🗑️ Removendo imagem antiga:', oldPath);
            await supabase.storage.from(bucket).remove([oldPath]);
          }
        } catch (error) {
          console.error('Erro ao remover imagem antiga:', error);
        }
      }

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
      onUploadComplete(urlWithTimestamp);

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

  const handleRemove = () => {
    setShowDeleteDialog(true);
  };

  const confirmRemove = async () => {
    if (currentImageUrl) {
      try {
        // Extrair o caminho do arquivo da URL (removendo query strings primeiro)
        const cleanUrl = currentImageUrl.split('?')[0];
        const pathMatch = cleanUrl.split(`${bucket}/`)[1];
        if (pathMatch) {
          await supabase.storage.from(bucket).remove([pathMatch]);
        }
      } catch (error) {
        console.error('Erro ao remover imagem:', error);
      }
    }
    setPreviewUrl(null);
    onUploadComplete('');
    setShowDeleteDialog(false);
    
    toast({
      title: 'Imagem removida',
      description: 'A imagem foi removida com sucesso.',
    });
  };

  const sizeClasses = {
    sm: 'sm:max-w-[120px]',
    md: 'sm:max-w-[160px]',
    lg: 'sm:max-w-[240px]'
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        <p className="text-xs text-muted-foreground">
          {bucket === 'product-images' && 'Recomendado: 800x450'}
          {bucket === 'store-logos' && 'Recomendado: 400x400px (quadrada)'}
          {bucket === 'store-banners' && 'Recomendado: 1800x600px (3:1)'}
        </p>
        
        {previewUrl ? (
          <div className="relative">
            <div className={`${aspectRatio} ${sizeClasses[size]} w-full sm:w-auto max-w-[180px] mx-auto sm:mx-0 min-h-[100px] md:min-h-[120px] rounded-lg overflow-hidden border border-border bg-muted/30 relative`}>
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {imageError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30 z-10">
                  <ImageOff className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">Imagem não carregada</span>
                </div>
              )}
              <img
                src={previewUrl}
                alt="Preview"
                className={`absolute inset-0 w-full h-full object-contain sm:object-cover transition-opacity cursor-pointer hover:opacity-90 ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
                onClick={() => setShowImageModal(true)}
                onLoad={() => {
                  setImageLoaded(true);
                  setImageError(false);
                }}
                onError={(e) => {
                  const currentSrc = e.currentTarget.src;
                  if (currentSrc.includes('?t=')) {
                    // Tentar sem timestamp
                    const cleanSrc = currentSrc.split('?t=')[0];
                    e.currentTarget.src = cleanSrc;
                  } else {
                    // Falhou em ambas tentativas
                    setImageError(true);
                    setImageLoaded(false);
                  }
                }}
              />
            </div>
            <Button
              type="button"
              size="icon"
              className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600 text-white z-20"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className={`${aspectRatio} ${sizeClasses[size]} max-w-[180px] mx-auto sm:mx-0 rounded-lg border-2 border-dashed border-border flex items-center justify-center`}>
            <Label
              htmlFor={`upload-${bucket}-${folder}`}
              className="cursor-pointer flex flex-col items-center justify-center p-2 md:p-4 text-center"
            >
              <Upload className="h-6 w-6 md:h-8 md:w-8 mb-1 md:mb-2 text-muted-foreground" />
              <span className="text-xs md:text-sm text-muted-foreground">
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta imagem? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showImageModal} onOpenChange={setShowImageModal}>
        <AlertDialogContent className="max-w-[50vw] max-h-[60vh] p-2">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 bg-background/80 hover:bg-background"
            onClick={() => setShowImageModal(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <AlertDialogHeader className="sr-only">
            <AlertDialogTitle>Visualizar Imagem</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="relative w-full h-[50vh] flex items-center justify-center">
            <img
              src={previewUrl || ''}
              alt="Visualização completa"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
