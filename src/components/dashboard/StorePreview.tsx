import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Phone } from "lucide-react";
import { formatDisplayPhone } from "@/lib/phone";

interface StorePreviewProps {
  storeName: string;
  storeDescription?: string;
  storeLogo?: string;
  storeBanner?: string;
  storeRating?: number;
  storeAddress?: string;
  storePhone?: string;
  showAddress: boolean;
  showPhone: boolean;
  layoutTemplateDesktop: string;
  layoutTemplateMobile: string;
  isMobileView?: boolean;
}

export const StorePreview = ({
  storeName,
  storeDescription,
  storeLogo,
  storeBanner,
  storeRating,
  storeAddress,
  storePhone,
  showAddress,
  showPhone,
  layoutTemplateDesktop,
  layoutTemplateMobile,
  isMobileView = false,
}: StorePreviewProps) => {
  const currentTemplate = isMobileView ? layoutTemplateMobile : layoutTemplateDesktop;
  
  // Get grid classes based on template
  const getGridClasses = () => {
    switch (currentTemplate) {
      case 'template-2':
        return 'grid-cols-2';
      case 'template-3':
        return 'grid-cols-3';
      case 'template-4':
        return 'grid-cols-4';
      case 'template-6':
        return 'grid-cols-6';
      case 'template-list':
        return 'grid-cols-1';
      case 'template-horizontal':
        return 'flex flex-col space-y-2';
      default:
        return 'grid-cols-4';
    }
  };

  const isHorizontal = currentTemplate === 'template-horizontal';
  const isList = currentTemplate === 'template-list';

  // Mock products for preview
  const mockProducts = Array.from({ length: isHorizontal || isList ? 3 : 6 }, (_, i) => ({
    id: i,
    name: `Produto ${i + 1}`,
    price: 29.90,
  }));

  return (
    <div className="space-y-4">
      {/* Store Header Preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden shadow-md"
      >
        {/* Banner */}
        <div className="relative h-24 bg-muted">
          {storeBanner ? (
            <img 
              src={storeBanner} 
              alt={storeName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              🏪
            </div>
          )}
        </div>

        {/* Store Info */}
        <div className="bg-card p-3 border-b">
          <div className="flex items-start gap-2">
            {storeLogo && (
              <img 
                src={storeLogo} 
                alt={storeName}
                className="w-12 h-12 rounded-lg object-cover border-2 border-background shadow"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold truncate">{storeName}</h3>
                {storeRating && (
                  <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span className="text-xs font-semibold">{storeRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              
              {storeDescription && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                  {storeDescription}
                </p>
              )}

              {showAddress && storeAddress && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="line-clamp-1">{storeAddress}</span>
                </div>
              )}

              {showPhone && storePhone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Phone className="w-3 h-3" />
                  <span className="line-clamp-1">{formatDisplayPhone(storePhone)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Products Grid Preview */}
      <div className="bg-muted/30 rounded-xl p-3">
        <div className="mb-2">
          <Badge variant="secondary" className="text-xs">Categoria Exemplo</Badge>
        </div>
        
        <div className={`${isHorizontal || isList ? 'space-y-2' : `grid ${getGridClasses()} gap-2`}`}>
          {mockProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: product.id * 0.05 }}
            >
              <Card className={`overflow-hidden hover:shadow-md transition-shadow ${isHorizontal || isList ? 'flex gap-2' : ''}`}>
                <div className={`bg-muted ${isHorizontal || isList ? 'w-16 h-16' : 'h-20'}`} />
                <div className="p-2 flex-1">
                  <h4 className="text-xs font-semibold truncate">{product.name}</h4>
                  <p className="text-xs text-primary font-bold mt-1">
                    R$ {product.price.toFixed(2)}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
