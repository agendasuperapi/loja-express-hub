import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAffiliates } from '@/hooks/useAffiliates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Users, Clock, DollarSign, CheckCircle } from 'lucide-react';

interface AffiliatesReportsTabProps {
  storeId: string;
}

export const AffiliatesReportsTab = ({ storeId }: AffiliatesReportsTabProps) => {
  const { affiliates, getAllStoreEarnings, isLoading } = useAffiliates(storeId);
  const [allEarnings, setAllEarnings] = useState<any[]>([]);

  useEffect(() => {
    getAllStoreEarnings().then(setAllEarnings);
  }, [getAllStoreEarnings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'outline' | 'secondary' | 'default' | 'destructive' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      approved: { label: 'Aprovada', variant: 'secondary' },
      paid: { label: 'Paga', variant: 'default' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calcular totais para cards resumo
  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(a => a.is_active).length;
  const totalPendingEarnings = allEarnings
    .filter(e => e.status === 'pending' || e.status === 'approved')
    .reduce((sum, e) => sum + Number(e.commission_amount), 0);
  const totalPaidEarnings = allEarnings
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.commission_amount), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalAffiliates}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{activeAffiliates}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPendingEarnings)}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pago</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaidEarnings)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Comissões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todas as Comissões</CardTitle>
          <CardDescription>Histórico completo de comissões de todos os afiliados</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor Venda</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allEarnings.map((earning) => (
                  <TableRow key={earning.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{earning.affiliate?.name}</p>
                        <p className="text-xs text-muted-foreground">{earning.affiliate?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      #{earning.order?.order_number || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(earning.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{formatCurrency(earning.order_total)}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(earning.commission_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(earning.status)}</TableCell>
                  </TableRow>
                ))}
                {allEarnings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma comissão registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
