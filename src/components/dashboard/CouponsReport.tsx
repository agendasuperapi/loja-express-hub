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
import { Tag, TrendingUp, DollarSign, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';

interface CouponsReportProps {
  storeId: string;
}

interface CouponUsage {
  code: string;
  totalUses: number;
  totalDiscount: number;
}

export function CouponsReport({ storeId }: CouponsReportProps) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['coupon-report', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('coupon_code, coupon_discount')
        .eq('store_id', storeId)
        .not('coupon_code', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any) || [];
    },
  });

  const couponStats = useMemo(() => {
    if (!orders) return { coupons: [], totalUses: 0, totalDiscount: 0 };

    const couponMap = new Map<string, CouponUsage>();

    orders.forEach((order) => {
      if (!order.coupon_code) return;

      const existing = couponMap.get(order.coupon_code);
      if (existing) {
        existing.totalUses++;
        existing.totalDiscount += Number(order.coupon_discount || 0);
      } else {
        couponMap.set(order.coupon_code, {
          code: order.coupon_code,
          totalUses: 1,
          totalDiscount: Number(order.coupon_discount || 0),
        });
      }
    });

    const coupons = Array.from(couponMap.values()).sort((a, b) => b.totalUses - a.totalUses);
    const totalUses = coupons.reduce((sum, c) => sum + c.totalUses, 0);
    const totalDiscount = coupons.reduce((sum, c) => sum + c.totalDiscount, 0);

    return { coupons, totalUses, totalDiscount };
  }, [orders]);

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Relatório Detalhado de Cupons
            </CardTitle>
            <CardDescription>
              Visualize o desempenho de cada cupom utilizado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {couponStats.coupons.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum cupom utilizado ainda</p>
                <p className="text-sm">Os cupons utilizados aparecerão aqui</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
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
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
