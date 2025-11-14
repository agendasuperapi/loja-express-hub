import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProductReport {
  product_name: string;
  quantity_sold: number;
  revenue: number;
  orders_count: number;
}

interface BestSellingProductsReportProps {
  storeId: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
}

export const BestSellingProductsReport = ({ storeId, dateRange }: BestSellingProductsReportProps) => {
  const [products, setProducts] = useState<ProductReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('order_items')
        .select(`
          product_name,
          quantity,
          subtotal,
          order_id,
          orders!inner(store_id, created_at)
        `)
        .eq('orders.store_id', storeId);

      if (dateRange.from) {
        query = query.gte('orders.created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('orders.created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const productMap = new Map<string, ProductReport>();
      
      data?.forEach((item: any) => {
        const existing = productMap.get(item.product_name);
        
        if (existing) {
          existing.quantity_sold += item.quantity;
          existing.revenue += item.subtotal || 0;
          existing.orders_count += 1;
        } else {
          productMap.set(item.product_name, {
            product_name: item.product_name,
            quantity_sold: item.quantity,
            revenue: item.subtotal || 0,
            orders_count: 1,
          });
        }
      });

      const sortedProducts = Array.from(productMap.values()).sort(
        (a, b) => b.quantity_sold - a.quantity_sold
      );

      setProducts(sortedProducts);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de produtos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchProducts();
    }
  }, [storeId, dateRange]);

  const exportToCSV = () => {
    const headers = Object.keys(products[0] || {});
    const csvContent = [
      headers.join(','),
      ...products.map(row => headers.map(header => `"${(row as any)[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_produtos_vendidos_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Produtos Mais Vendidos
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
          disabled={products.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posição</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade Vendida</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum produto vendido no período selecionado
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge
                          variant={index < 3 ? "default" : "secondary"}
                          className={cn(
                            index === 0 && "bg-yellow-500 hover:bg-yellow-600",
                            index === 1 && "bg-gray-400 hover:bg-gray-500",
                            index === 2 && "bg-orange-600 hover:bg-orange-700"
                          )}
                        >
                          #{index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{product.quantity_sold} unidades</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.orders_count}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        R$ {product.revenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
            </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
  );
};
