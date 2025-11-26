import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Store, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  Phone, 
  MapPin,
  TrendingUp,
  Users,
  ShieldCheck,
  DollarSign,
  Package,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  UserX,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";

interface StoreWithOwner {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: 'pending_approval' | 'active' | 'inactive';
  created_at: string;
  owner_id: string;
  delivery_fee: number;
  min_order_value: number;
  avg_delivery_time: number;
  profiles?: {
    full_name: string;
  };
}

interface DashboardStats {
  totalStores: number;
  activeStores: number;
  pendingStores: number;
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  ordersToday: number;
  revenueGrowth: number;
}

export default function AdminDashboard() {
  const [stores, setStores] = useState<StoreWithOwner[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStores: 0,
    activeStores: 0,
    pendingStores: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    ordersToday: 0,
    revenueGrowth: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'users'>('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [confirmingEmail, setConfirmingEmail] = useState<string | null>(null);
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (storesError) throw storesError;

      // Fetch profiles for stores
      const storesWithProfiles = await Promise.all(
        (storesData || []).map(async (store) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', store.owner_id)
            .single();
          
          return {
            ...store,
            profiles: profile || undefined
          };
        })
      );

      setStores(storesWithProfiles as any);

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*');

      if (ordersError) throw ordersError;

      // Fetch recent orders with store info
      const { data: recentOrdersData } = await supabase
        .from('orders')
        .select(`
          *,
          stores (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(recentOrdersData || []);

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Calculate stats
      const totalRevenue = ordersData?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const today = new Date().toISOString().split('T')[0];
      const ordersToday = ordersData?.filter(order => 
        order.created_at.startsWith(today)
      ).length || 0;

      setStats({
        totalStores: storesData?.length || 0,
        activeStores: storesData?.filter(s => s.status === 'active').length || 0,
        pendingStores: storesData?.filter(s => s.status === 'pending_approval').length || 0,
        totalOrders: ordersData?.length || 0,
        totalRevenue,
        totalUsers: usersCount || 0,
        ordersToday,
        revenueGrowth: 12.5, // Mock data
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (storeId: string, status: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('stores')
        .update({ status })
        .eq('id', storeId);

      if (error) throw error;

      toast({
        title: "Status atualizado!",
        description: status === 'active' 
          ? "Loja aprovada com sucesso" 
          : "Loja desativada",
      });

      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string, icon: any }> = {
      pending_approval: { className: "bg-yellow-500 hover:bg-yellow-600 text-white", icon: Clock },
      active: { className: "bg-green-500 hover:bg-green-600 text-white", icon: CheckCircle },
      inactive: { className: "bg-red-500 hover:bg-red-600 text-white", icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending_approval;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} gap-1`}>
        <Icon className="w-3 h-3" />
        {status === 'pending_approval' ? 'Pendente' : status === 'active' ? 'Ativa' : 'Inativa'}
      </Badge>
    );
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch all user types
      const [customersRes, storeOwnersRes, adminsRes] = await Promise.all([
        supabase.rpc('get_customer_users' as any),
        supabase.rpc('get_store_owner_users' as any),
        supabase.rpc('get_admin_users' as any),
      ]);

      const allUsers = [
        ...((customersRes.data as any[]) || []).map((u: any) => ({ ...u, role: 'customer' })),
        ...((storeOwnersRes.data as any[]) || []).map((u: any) => ({ ...u, role: 'store_owner' })),
        ...((adminsRes.data as any[]) || []).map((u: any) => ({ ...u, role: 'admin' })),
      ];

      setUsers(allUsers);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmail = async (userId: string) => {
    try {
      setConfirmingEmail(userId);
      
      const { data, error } = await supabase.rpc('confirm_user_email' as any, { 
        user_id: userId 
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Email confirmado!",
          description: "O email do usuário foi confirmado com sucesso.",
        });
        fetchUsers();
      } else {
        toast({
          title: "Email já confirmado",
          description: "Este usuário já tinha o email confirmado.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setConfirmingEmail(null);
    }
  };

  const handleUserAction = async (userId: string, action: 'delete' | 'deactivate' | 'activate') => {
    const actionMessages = {
      delete: { 
        confirm: 'Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.',
        success: 'Usuário deletado com sucesso',
        error: 'Erro ao deletar usuário'
      },
      deactivate: {
        confirm: 'Tem certeza que deseja inativar este usuário?',
        success: 'Usuário inativado com sucesso',
        error: 'Erro ao inativar usuário'
      },
      activate: {
        confirm: 'Tem certeza que deseja ativar este usuário?',
        success: 'Usuário ativado com sucesso',
        error: 'Erro ao ativar usuário'
      }
    };

    const confirmed = window.confirm(actionMessages[action].confirm);
    if (!confirmed) return;

    try {
      setProcessingUser(userId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const SUPABASE_URL = "https://mgpzowiahnwcmcaelogf.supabase.co";

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action, userId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || actionMessages[action].error);
      }

      toast({
        title: "Sucesso!",
        description: result.message || actionMessages[action].success,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: actionMessages[action].error,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const pendingStores = stores.filter(s => s.status === 'pending_approval');
  const unconfirmedUsers = users.filter(u => !u.email_confirmed_at);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  Dashboard Administrativo
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">
                    Visão geral da plataforma
                  </p>
                  <Badge variant="outline" className="text-xs">
                    Versão 1.0.0
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-8">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="stores" className="gap-2">
              Gerenciar Lojas
              {stats.pendingStores > 0 && (
                <Badge variant="secondary">{stats.pendingStores}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              Gerenciar Usuários
              {unconfirmedUsers.length > 0 && (
                <Badge variant="secondary">{unconfirmedUsers.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Lojas Totais</p>
                      <Store className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold">{stats.totalStores}</p>
                      <p className="text-sm text-green-600 flex items-center">
                        <ArrowUpRight className="w-3 h-3" />
                        {stats.activeStores} ativas
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Pedidos Totais</p>
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold">{stats.totalOrders}</p>
                      <p className="text-sm text-blue-600">
                        {stats.ordersToday} hoje
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Receita Total</p>
                      <DollarSign className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold">
                        R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-green-600 flex items-center">
                        <ArrowUpRight className="w-3 h-3" />
                        {stats.revenueGrowth}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Usuários</p>
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold">{stats.totalUsers}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Approvals */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Aprovações Pendentes
                    </CardTitle>
                    <CardDescription>
                      {stats.pendingStores} lojas aguardando aprovação
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : pendingStores.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma loja pendente
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {pendingStores.slice(0, 3).map((store) => (
                          <div
                            key={store.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{store.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {store.category}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(store.id, 'active')}
                                className="bg-gradient-primary"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleUpdateStatus(store.id, 'inactive')}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {pendingStores.length > 3 && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setActiveTab('stores')}
                          >
                            Ver todas ({pendingStores.length})
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Orders */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Atividade Recente
                    </CardTitle>
                    <CardDescription>
                      Últimos pedidos na plataforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : recentOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum pedido recente
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {recentOrders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">
                                {order.stores?.name || 'Loja desconhecida'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.customer_name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                R$ {Number(order.total).toFixed(2)}
                              </p>
                              <Badge variant="secondary">
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="stores" className="space-y-4">
            {/* Stores Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Todas as Lojas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : stores.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma loja encontrada
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stores.map((store) => (
                      <Card key={store.id}>
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold">{store.name}</h3>
                                    {getStatusBadge(store.status)}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    /{store.slug}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span>Proprietário: {store.profiles?.full_name || 'N/A'}</span>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                  <Store className="w-4 h-4 text-muted-foreground" />
                                  <span>Categoria: {store.category}</span>
                                </div>

                                {store.email && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span>{store.email}</span>
                                  </div>
                                )}

                                {store.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span>{store.phone}</span>
                                  </div>
                                )}

                                {store.address && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <span>{store.address}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {store.status === 'pending_approval' && (
                              <div className="flex flex-col gap-2 md:min-w-[140px]">
                                <Button
                                  onClick={() => handleUpdateStatus(store.id, 'active')}
                                  className="w-full bg-gradient-primary"
                                  size="sm"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Aprovar
                                </Button>
                                <Button
                                  onClick={() => handleUpdateStatus(store.id, 'inactive')}
                                  variant="destructive"
                                  size="sm"
                                  className="w-full"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Rejeitar
                                </Button>
                              </div>
                            )}

                            {store.status === 'inactive' && (
                              <Button
                                onClick={() => handleUpdateStatus(store.id, 'active')}
                                className="bg-gradient-primary"
                                size="sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Reativar
                              </Button>
                            )}

                            {store.status === 'active' && (
                              <Button
                                onClick={() => handleUpdateStatus(store.id, 'inactive')}
                                variant="outline"
                                size="sm"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Desativar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {/* Users Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Todos os Usuários
                </CardTitle>
                <CardDescription>
                  {unconfirmedUsers.length > 0 && (
                    <span className="text-yellow-600">
                      {unconfirmedUsers.length} usuário(s) com email não confirmado
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <Card key={user.id}>
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold">
                                      {user.full_name || 'Sem nome'}
                                    </h3>
                                    <Badge variant="outline">
                                      {user.role === 'customer' ? 'Cliente' : 
                                       user.role === 'store_owner' ? 'Dono de Loja' : 
                                       'Admin'}
                                    </Badge>
                                    {!user.email_confirmed_at && (
                                      <Badge variant="destructive" className="gap-1">
                                        <Mail className="w-3 h-3" />
                                        Email não confirmado
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  <span>{user.email}</span>
                                </div>

                                {user.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span>{user.phone}</span>
                                  </div>
                                )}

                                {user.store_name && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Store className="w-4 h-4 text-muted-foreground" />
                                    <span>Loja: {user.store_name}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    Cadastrado em {new Date(user.user_created_at).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 md:min-w-[180px]">
                              {!user.email_confirmed_at && (
                                <Button
                                  onClick={() => handleConfirmEmail(user.id)}
                                  className="w-full bg-gradient-primary"
                                  size="sm"
                                  disabled={confirmingEmail === user.id || processingUser === user.id}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  {confirmingEmail === user.id ? 'Confirmando...' : 'Confirmar Email'}
                                </Button>
                              )}
                              
                              {user.banned_until ? (
                                <Button
                                  onClick={() => handleUserAction(user.id, 'activate')}
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  disabled={processingUser === user.id}
                                >
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  {processingUser === user.id ? 'Processando...' : 'Ativar'}
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleUserAction(user.id, 'deactivate')}
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  disabled={processingUser === user.id}
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  {processingUser === user.id ? 'Processando...' : 'Inativar'}
                                </Button>
                              )}

                              <Button
                                onClick={() => handleUserAction(user.id, 'delete')}
                                variant="destructive"
                                size="sm"
                                className="w-full"
                                disabled={processingUser === user.id}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {processingUser === user.id ? 'Processando...' : 'Deletar'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
