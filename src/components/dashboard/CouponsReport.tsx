import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag, TrendingUp, DollarSign, Ticket, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { generateCouponsReport } from '@/lib/pdfReports';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface CouponsReportProps {
  storeId: string;
  storeName?: string;
}

interface CouponUsage {
  code: string;
  totalUses: number;
  totalDiscount: number;
}

export function CouponsReport({ storeId, storeName = "Minha Loja" }: CouponsReportProps) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['coupon-report', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('coupon_code, coupon_discount, created_at')
        .eq('store_id', storeId)
        .not('coupon_code', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any) || [];
    },
  });

  const couponStats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return { coupons: [], totalUses: 0, totalDiscount: 0 };
    }

    const couponMap = new Map<string, CouponUsage>();

    orders.forEach((order) => {
      if (!order.coupon_code) return;

      const code = order.coupon_code.toUpperCase();
      const discount = Number(order.coupon_discount || 0);

      const existing = couponMap.get(code);
      if (existing) {
        existing.totalUses++;
        existing.totalDiscount += discount;
      } else {
        couponMap.set(code, {
          code: order.coupon_code,
          totalUses: 1,
          totalDiscount: discount,
        });
      }
    });

    const coupons = Array.from(couponMap.values()).sort((a, b) => b.totalUses - a.totalUses);
    const totalUses = coupons.reduce((sum, c) => sum + c.totalUses, 0);
    const totalDiscount = coupons.reduce((sum, c) => sum + c.totalDiscount, 0);

    return { coupons, totalUses, totalDiscount };
  }, [orders]);

  const exportToPDF = async () => {
    try {
      // Buscar cupons completos do banco de dados para gerar relatório mais completo
      const { data: coupons, error } = await supabase
        .from('coupons' as any)
        .select('code, discount, discount_type, usage_count, valid_until')
        .eq('store_id', storeId);

      if (error) throw error;

      const couponsData = (coupons || []).map((c: any) => ({
        code: c.code,
        discount: c.discount,
        discount_type: c.discount_type,
        usage_count: c.usage_count || 0,
        valid_until: c.valid_until
      }));
      
      generateCouponsReport(couponsData, storeName);
      
      toast({
        title: "PDF gerado!",
        description: "O relatório foi exportado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao buscar cupons:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = async () => {
    try {
      // Buscar cupons completos do banco de dados
      const { data: coupons, error } = await supabase
        .from('coupons' as any)
        .select('code, discount, discount_type, usage_count, valid_until, is_active')
        .eq('store_id', storeId);

      if (error) throw error;

      const data = (coupons || []).map((c: any) => ({
        'Código': c.code,
        'Desconto': c.discount_type === 'percentage' ? `${c.discount}%` : c.discount,
        'Tipo': c.discount_type === 'percentage' ? 'Percentual' : 'Valor Fixo',
        'Usos': c.usage_count || 0,
        'Validade': c.valid_until ? format(new Date(c.valid_until), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem validade',
        'Status': c.is_active ? 'Ativo' : 'Inativo'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      
      // Auto-width das colunas
      const colWidths = [
        { wch: 15 }, // Código
        { wch: 12 }, // Desconto
        { wch: 15 }, // Tipo
        { wch: 8 },  // Usos
        { wch: 15 }, // Validade
        { wch: 10 }  // Status
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cupons");
      
      XLSX.writeFile(wb, `relatorio_cupons_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
      
      toast({
        title: "Excel gerado!",
        description: "O relatório foi exportado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o Excel.",
        variant: "destructive",
      });
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold gradient-text">Relatório de Cupons</h2>
        <p className="text-muted-foreground">Análise de uso e desempenho dos cupons de desconto</p>
      </div>
      
      {/* Estatísticas gerais */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Cupons Usados</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{couponStats.coupons.length}</div>
              <p className="text-xs text-muted-foreground">
                Cupons diferentes utilizados
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Utilizações</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{couponStats.totalUses}</div>
              <p className="text-xs text-muted-foreground">
                Vezes que cupons foram aplicados
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Desconto Total Concedido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                R$ {couponStats.totalDiscount.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Valor total em descontos
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabela de cupons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Relatório Detalhado de Cupons
              </CardTitle>
              <CardDescription>
                Visualize o desempenho de cada cupom utilizado
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={couponStats.coupons.length === 0}
                className="flex-1 sm:flex-none"
              >
                <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                disabled={couponStats.coupons.length === 0}
                className="flex-1 sm:flex-none"
              >
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {couponStats.coupons.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum cupom utilizado ainda</p>
                <p className="text-sm">Os cupons utilizados aparecerão aqui</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <div className="rounded-md border">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código do Cupom</TableHead>
                      <TableHead className="text-center">Utilizações</TableHead>
                      <TableHead className="text-right">Desconto Total</TableHead>
                      <TableHead className="text-right">Desconto Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {couponStats.coupons.map((coupon, index) => (
                      <TableRow key={coupon.code}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              <Tag className="h-3 w-3" />
                              {coupon.code}
                            </Badge>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">
                                Mais usado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{coupon.totalUses}x</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          R$ {coupon.totalDiscount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          R$ {(coupon.totalDiscount / coupon.totalUses).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
