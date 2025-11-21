import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/layout/Navigation";
import { FloatingCartButton } from "@/components/cart/FloatingCartButton";
import { Star, Clock, MapPin, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useStores } from "@/hooks/useStores";
import { Skeleton } from "@/components/ui/skeleton";

const categories = [
  { value: "all", label: "Todas as Categorias" },
  { value: "Restaurante", label: "Restaurantes" },
  { value: "Lanchonete", label: "Lanchonetes" },
  { value: "Pizzaria", label: "Pizzarias" },
  { value: "Mercado", label: "Mercados" },
  { value: "Farmácia", label: "Farmácias" },
];

const Index = () => {
  const [category, setCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: stores, isLoading } = useStores(category, searchTerm);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Descubra Lojas Incríveis
          </h1>
          <p className="text-muted-foreground">
            Encontre os melhores estabelecimentos perto de você
          </p>
        </motion.div>

        {/* Partner Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-accent/10 to-primary/10 border-accent/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                    <StoreIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Tem uma loja?</h3>
                    <p className="text-sm text-muted-foreground">
                      Cadastre-se e comece a vender na plataforma hoje mesmo
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link to="/login-lojista">
                    <Button variant="outline" className="whitespace-nowrap">
                      Login Lojista
                    </Button>
                  </Link>
                  <Link to="/become-partner">
                    <Button className="bg-gradient-primary whitespace-nowrap">
                      Seja um Parceiro
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col md:flex-row gap-4 mb-8"
        >
          <Input
            placeholder="Buscar lojas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:w-96"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Store Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : stores && stores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store, index) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="group relative"
              >
                <div className="glass-card rounded-xl overflow-hidden h-full flex flex-col w-full max-w-full">
                  {/* Store Image */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden w-full max-w-full">
                    {store.banner_url ? (
                      <img 
                        src={store.banner_url} 
                        alt={store.name}
                        className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        🏪
                      </div>
                    )}
                  </div>

                  {/* Store Info */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold mb-1">{store.name}</h3>
                        <p className="text-sm text-muted-foreground">{store.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span>{store.rating || 0}</span>
                      </div>
                      {(store as any).show_avg_delivery_time !== false && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{store.avg_delivery_time || 30} min</span>
                        </div>
                      )}
                    </div>

                    {store.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{store.address}</span>
                      </div>
                    )}

                    <Link to={`/${store.slug}`} className="mt-auto">
                      <Button className="w-full bg-gradient-primary">
                        Ver {(store as any).menu_label || 'Cardápio'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground text-lg">
              Nenhuma loja encontrada
            </p>
          </motion.div>
        )}
      </main>

      <FloatingCartButton />
    </div>
  );
};

export default Index;
