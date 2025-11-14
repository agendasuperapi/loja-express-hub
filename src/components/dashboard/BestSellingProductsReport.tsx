import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Download, FileText } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { generateBestSellersReport } from "@/lib/pdfReports";

interface ProductReport {
  product_name: string;
  quantity_sold: number;
  revenue: number;
  orders_count: number;
}

interface BestSellingProductsReportProps {
  storeId: string;
  storeName?: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
}

export const BestSellingProductsReport = ({ storeId, storeName = "Minha Loja", dateRange }: BestSellingProductsReportProps) => {
  const [products, setProducts] = useState<ProductReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Paginação
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return products.slice(startIndex, startIndex + itemsPerPage);
  }, [products, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange]);

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

  const exportToPDF = () => {
    const periodLabel = dateRange.from && dateRange.to
      ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
      : "Todos os períodos";
    
    const productsForReport = products.map(p => ({
      name: p.product_name,
      quantity: p.quantity_sold,
      revenue: p.revenue
    }));

    generateBestSellersReport(productsForReport, storeName, periodLabel);
    
    toast({
      title: "PDF gerado!",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Produtos Mais Vendidos
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={products.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={products.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
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
                  paginatedProducts.map((product, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    return (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge
                          variant={globalIndex < 3 ? "default" : "secondary"}
                          className={cn(
                            globalIndex === 0 && "bg-yellow-500 hover:bg-yellow-600",
                            globalIndex === 1 && "bg-gray-400 hover:bg-gray-500",
                            globalIndex === 2 && "bg-orange-600 hover:bg-orange-700"
                          )}
                        >
                          #{globalIndex + 1}
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
                  );
                  })
                )}
            </TableBody>
            </Table>
          </ScrollArea>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
  );
};
