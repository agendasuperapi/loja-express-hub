import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Share2, ShoppingCart, Store } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  category: string;
  short_id: string;
  store_id: string;
  stores: {
    name: string;
    slug: string;
    logo_url: string | null;
  };
}

export default function ProductPage() {
  const { shortId } = useParams<{ shortId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!shortId) return;

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          stores (
            name,
            slug,
            logo_url
          )
        `)
        .eq('short_id', shortId)
        .single();

      if (error || !data) {
        console.error('Erro ao carregar produto:', error);
        navigate('/');
        return;
      }

      setProduct(data as any);
      setLoading(false);
    };

    fetchProduct();
  }, [shortId, navigate]);

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart(
      product.id,
      product.name,
      product.price,
      product.store_id,
      product.stores.name,
      1,
      product.promotional_price,
      product.image_url,
      undefined,
      product.stores.slug
    );

    toast({
      title: "Produto adicionado!",
      description: "O produto foi adicionado ao carrinho.",
    });
  };

  const handleShare = async () => {
    if (!product) return;

    const shareUrl = `https://ofertas.app/p/${product.short_id}`;
    const shareText = `🛍️ ${product.name}\n💰 R$ ${Number(product.promotional_price || product.price).toFixed(2)}\n\n${product.description || ''}\n\n📍 ${product.stores.name}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${product.name} - ${product.stores.name}`,
          text: shareText,
          url: shareUrl,
        });
        toast({
          title: "Compartilhado com sucesso!",
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast({
          title: "Link copiado!",
          description: "O link foi copiado para a área de transferência.",
        });
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const currentPrice = product?.promotional_price || product?.price || 0;
  const hasDiscount = product?.promotional_price && product?.promotional_price < product?.price;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const pageTitle = `${product.name} - ${product.stores.name}`;
  const pageDescription = product.description || `${product.name} disponível por R$ ${currentPrice.toFixed(2)}`;
  const pageImage = product.image_url || product.stores.logo_url || '';
  const pageUrl = `https://ofertas.app/p/${product.short_id}`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="product" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={pageImage} />
        <meta property="og:site_name" content="OfertasApp" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageImage} />
        
        {/* WhatsApp */}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate(`/${product.stores.slug}`)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Button>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Imagem do Produto */}
            <Card className="overflow-hidden">
              <img
                src={product.image_url || '/placeholder.svg'}
                alt={product.name}
                className="w-full aspect-square object-cover"
              />
            </Card>

            {/* Informações do Produto */}
            <div className="space-y-6">
              <div>
                <Badge variant="secondary" className="mb-2">
                  {product.category}
                </Badge>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                
                {/* Link para a loja */}
                <Button
                  variant="link"
                  className="p-0 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => navigate(`/${product.stores.slug}`)}
                >
                  <Store className="mr-2 h-4 w-4" />
                  {product.stores.name}
                </Button>
              </div>

              {/* Preço */}
              <div className="space-y-1">
                {hasDiscount && (
                  <div className="text-muted-foreground line-through text-sm">
                    R$ {product.price.toFixed(2)}
                  </div>
                )}
                <div className="text-3xl font-bold text-primary">
                  R$ {currentPrice.toFixed(2)}
                </div>
                {hasDiscount && (
                  <Badge variant="destructive">
                    {Math.round((1 - (product.promotional_price! / product.price)) * 100)}% OFF
                  </Badge>
                )}
              </div>

              {/* Descrição */}
              {product.description && (
                <div>
                  <h2 className="font-semibold mb-2">Descrição</h2>
                  <p className="text-muted-foreground">{product.description}</p>
                </div>
              )}

              {/* Ações */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={handleAddToCart}
                  className="w-full"
                  size="lg"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Adicionar ao Carrinho
                </Button>
                
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Share2 className="mr-2 h-5 w-5" />
                  Compartilhar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
