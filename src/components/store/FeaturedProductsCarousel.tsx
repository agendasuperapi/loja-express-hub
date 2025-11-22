import { motion } from "framer-motion";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  promotional_price?: number;
  image_url?: string;
  category: string;
}

interface FeaturedProductsCarouselProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const FeaturedProductsCarousel = ({
  products,
  onAddToCart,
  onProductClick,
}: FeaturedProductsCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();

  // Auto-play functionality
  useEffect(() => {
    if (!api) return;

    const autoPlayInterval = setInterval(() => {
      api.scrollNext();
    }, 4000); // Rotaciona a cada 4 segundos

    return () => clearInterval(autoPlayInterval);
  }, [api]);

  if (!products || products.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full mb-8"
    >
      {/* Header do Carrossel */}
      <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
        <div className="flex items-center gap-1.5 md:gap-2">
          <Star className="h-4 w-4 md:h-6 md:w-6 fill-yellow-500 text-yellow-500" />
          <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
            Destaques
          </h2>
        </div>
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-xs md:text-sm">
          {products.length} {products.length === 1 ? 'produto' : 'produtos'}
        </Badge>
      </div>

      {/* Carrossel */}
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {products.map((product) => {
            const finalPrice = product.promotional_price || product.price;
            const hasPromotion = product.promotional_price && product.promotional_price < product.price;

            return (
              <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="h-full min-h-[320px] md:min-h-[360px]"
                >
                  <div
                    className="group relative h-full flex flex-col bg-card rounded-xl border-2 border-yellow-500/30 hover:border-yellow-500 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => onProductClick(product)}
                  >
                    {/* Badges Container */}
                    <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 z-10 flex flex-col gap-1">
                      <Badge className="bg-yellow-500 text-white border-none shadow-lg w-fit text-[10px] md:text-xs px-1.5 md:px-2.5 py-0.5">
                        <Star className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1 fill-white" />
                        Destaque
                      </Badge>
                      {hasPromotion && (
                        <Badge variant="destructive" className="shadow-lg w-fit text-[10px] md:text-xs px-1.5 md:px-2.5 py-0.5">
                          Promoção
                        </Badge>
                      )}
                    </div>

                    {/* Imagem do Produto */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
                        </div>
                      )}
                      
                      {/* Gradiente overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-2 md:p-3 flex flex-col">
                      {/* Nome do Produto */}
                      <h3 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-yellow-600 transition-colors mb-1 md:mb-1.5">
                        {product.name}
                      </h3>

                      {/* Descrição - sem espaço fixo */}
                      {product.description && (
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {/* Preço e Botão - sempre no fundo */}
                      <div className="flex items-center justify-between gap-2 mt-auto">
                        <div className="flex flex-col justify-center">
                          {hasPromotion && (
                            <p className="text-[10px] md:text-xs text-muted-foreground line-through leading-tight mb-0.5">
                              {formatCurrency(product.price)}
                            </p>
                          )}
                          <p className={cn(
                            "font-bold text-base md:text-lg leading-tight",
                            hasPromotion ? "text-red-500" : "text-primary"
                          )}>
                            {formatCurrency(finalPrice)}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-md hover:shadow-lg transition-all duration-200 h-8 md:h-9 px-2.5 md:px-3 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                        >
                          <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        
        {/* Controles de Navegação */}
        <CarouselPrevious className="left-0 -translate-x-1/2 bg-background shadow-xl border-2 border-yellow-500/30 hover:border-yellow-500" />
        <CarouselNext className="right-0 translate-x-1/2 bg-background shadow-xl border-2 border-yellow-500/30 hover:border-yellow-500" />
      </Carousel>
    </motion.div>
  );
};
