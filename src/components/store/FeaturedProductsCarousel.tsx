import { motion } from "framer-motion";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
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
  if (!products || products.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full mb-8"
    >
      {/* Header do Carrossel */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
            Produtos em Destaque
          </h2>
        </div>
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
          {products.length} {products.length === 1 ? 'produto' : 'produtos'}
        </Badge>
      </div>

      {/* Carrossel */}
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {products.map((product) => {
            const finalPrice = product.promotional_price || product.price;
            const hasPromotion = product.promotional_price && product.promotional_price < product.price;

            return (
              <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <div
                    className="group relative h-full bg-card rounded-xl border-2 border-yellow-500/30 hover:border-yellow-500 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => onProductClick(product)}
                  >
                    {/* Badge de Destaque */}
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-yellow-500 text-white border-none shadow-lg">
                        <Star className="h-3 w-3 mr-1 fill-white" />
                        Destaque
                      </Badge>
                    </div>

                    {/* Badge de Promoção */}
                    {hasPromotion && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant="destructive" className="shadow-lg">
                          Promoção
                        </Badge>
                      </div>
                    )}

                    {/* Imagem do Produto */}
                    <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
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
                    <div className="p-4 space-y-3">
                      {/* Nome do Produto */}
                      <h3 className="font-semibold text-lg line-clamp-2 min-h-[3.5rem] group-hover:text-yellow-600 transition-colors">
                        {product.name}
                      </h3>

                      {/* Descrição */}
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {/* Preço e Botão */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="space-y-1">
                          {hasPromotion && (
                            <p className="text-sm text-muted-foreground line-through">
                              {formatCurrency(product.price)}
                            </p>
                          )}
                          <p className={cn(
                            "font-bold text-xl",
                            hasPromotion ? "text-red-500" : "text-primary"
                          )}>
                            {formatCurrency(finalPrice)}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Adicionar
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
