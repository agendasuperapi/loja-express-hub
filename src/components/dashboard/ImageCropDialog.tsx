import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropDialogProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio: number;
  bucketType: 'product-images' | 'store-logos' | 'store-banners';
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ImageCropDialog = ({
  open,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio,
  bucketType,
}: ImageCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const dimensionsInfo = {
    'product-images': '800x800px',
    'store-logos': '400x400px',
    'store-banners': '1200x400px',
  };

  const onCropChange = (location: { x: number; y: number }) => {
    setCrop(location);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createCroppedImage = async () => {
    if (!croppedAreaPixels) return;

    try {
      const image = new Image();
      image.src = imageSrc;
      await new Promise((resolve) => {
        image.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Define as dimensões do canvas baseado no tipo de bucket
      const targetDimensions = {
        'product-images': { width: 800, height: 800 },
        'store-logos': { width: 400, height: 400 },
        'store-banners': { width: 1200, height: 400 },
      };

      const { width: targetWidth, height: targetHeight } = targetDimensions[bucketType];

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Desenha a imagem cortada e redimensionada
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        targetWidth,
        targetHeight
      );

      // Converte para blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
            onClose();
          }
        },
        'image/jpeg',
        0.95
      );
    } catch (error) {
      console.error('Erro ao criar imagem cortada:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Ajustar Imagem</DialogTitle>
          <DialogDescription>
            Use os controles para posicionar e ajustar o zoom da imagem.
            <br />
            <span className="font-medium text-primary">
              Dimensão final: {dimensionsInfo[bucketType]}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[400px] w-full bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            style={{
              containerStyle: {
                borderRadius: '0.5rem',
              },
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <ZoomOut className="w-4 h-4" />
                Zoom
              </span>
              <span className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4" />
              </span>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="text-muted-foreground">
              💡 <strong>Dica:</strong> Arraste a imagem para posicionar e use o controle de zoom para ajustar o tamanho.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={createCroppedImage}>
            Confirmar e Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
