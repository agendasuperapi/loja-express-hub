import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  hasDiscount?: boolean;
  discountPercentage?: number;
  onImageChange?: (imageId: string) => void;
  selectedImageId?: string | null;
}

export function ProductImageGallery({ 
  images, 
  productName,
  hasDiscount,
  discountPercentage,
  onImageChange,
  selectedImageId 
}: ProductImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Sort images by display_order and ensure primary is first
  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  // Update selected index when selectedImageId changes
  useEffect(() => {
    if (selectedImageId) {
      const index = sortedImages.findIndex(img => img.id === selectedImageId);
      if (index !== -1) {
        setSelectedImageIndex(index);
      }
    }
  }, [selectedImageId, sortedImages]);

  const currentImage = sortedImages[selectedImageIndex] || sortedImages[0];

  const handlePrevious = () => {
    setSelectedImageIndex((prev) => {
      const newIndex = prev === 0 ? sortedImages.length - 1 : prev - 1;
      onImageChange?.(sortedImages[newIndex]?.id);
      return newIndex;
    });
  };

  const handleNext = () => {
    setSelectedImageIndex((prev) => {
      const newIndex = prev === sortedImages.length - 1 ? 0 : prev + 1;
      onImageChange?.(sortedImages[newIndex]?.id);
      return newIndex;
    });
  };

  if (!sortedImages.length) {
    return (
      <div className="relative w-full overflow-hidden group md:rounded-t-lg rounded-t-3xl">
        <motion.img
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          src="/placeholder.svg"
          alt={productName}
          className="w-full h-56 md:h-64 object-cover"
        />
      </div>
    );
  }

  return (
    <>
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-5xl w-full p-0 bg-black/95">
          <div className="relative w-full h-[90vh] flex items-center justify-center">
            {/* Close button - visible on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 bg-background/80 hover:bg-background md:hidden"
              onClick={() => setZoomedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            <img
              src={zoomedImage || ''}
              alt={productName}
              className="max-w-full max-h-full object-contain"
            />
            
            {sortedImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                    setZoomedImage(sortedImages[selectedImageIndex === 0 ? sortedImages.length - 1 : selectedImageIndex - 1].image_url);
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                    setZoomedImage(sortedImages[selectedImageIndex === sortedImages.length - 1 ? 0 : selectedImageIndex + 1].image_url);
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="relative w-full overflow-hidden group md:rounded-t-lg rounded-t-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative cursor-pointer"
            onClick={() => setZoomedImage(currentImage.image_url)}
          >
            <motion.img
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
              src={currentImage.image_url}
              alt={productName}
              className="w-full h-56 md:h-64 object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
            />
            
            {/* Zoom indicator */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="bg-background/80 backdrop-blur-sm rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-6 h-6" />
              </div>
            </div>

            {/* Animated shine effect */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                duration: 3,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 5
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
              style={{ width: '50%' }}
            />
          </motion.div>
        </AnimatePresence>

        {hasDiscount && (
          <Badge className="absolute top-16 right-4 bg-destructive text-destructive-foreground text-base px-3 py-1 z-10">
            {discountPercentage}% OFF
          </Badge>
        )}

        {/* Navigation arrows */}
        {sortedImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Image counter */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium">
            {selectedImageIndex + 1} / {sortedImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {sortedImages.length > 1 && (
        <div className="px-4 md:px-5 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {sortedImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => {
                  setSelectedImageIndex(index);
                  onImageChange?.(image.id);
                }}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                  selectedImageIndex === index
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                )}
              >
                <img
                  src={image.image_url}
                  alt={`${productName} - Imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
