import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useEmployeeAccess } from "@/hooks/useEmployeeAccess";

interface WhatsAppStatusIndicatorProps {
  storeId: string;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'loading' | 'no-permission';

export const WhatsAppStatusIndicator = ({ storeId }: WhatsAppStatusIndicatorProps) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { isEmployee, permissions, storeId: employeeStoreId } = useEmployeeAccess();
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    checkPermissions();
  }, [user, storeId, isAdmin, isEmployee, employeeStoreId, permissions]);

  useEffect(() => {
    if (hasPermission) {
      checkConnectionStatus();
      
      // Verificar status a cada 30 segundos
      const interval = setInterval(checkConnectionStatus, 30000);
      
      return () => clearInterval(interval);
    } else {
      setStatus('no-permission');
    }
  }, [storeId, hasPermission]);

  const checkPermissions = async () => {
    if (!user) {
      setHasPermission(false);
      return;
    }

    // Admin sempre tem permissão
    if (isAdmin) {
      setHasPermission(true);
      return;
    }

    // Verificar se é dono da loja
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (store) {
      setHasPermission(true);
      return;
    }

    // Verificar se é funcionário com permissão de visualização
    if (isEmployee && employeeStoreId === storeId && permissions?.whatsapp?.view) {
      setHasPermission(true);
      return;
    }

    setHasPermission(false);
  };

  const checkConnectionStatus = async () => {
    if (!hasPermission) {
      setStatus('no-permission');
      return;
    }

    try {
      // Buscar instância da loja
      const { data: instanceData } = await supabase
        .from('store_instances' as any)
        .select('evolution_instance_id')
        .eq('store_id', storeId)
        .maybeSingle();

      const instanceId = (instanceData as any)?.evolution_instance_id;

      console.log('[WhatsApp Status] Store ID:', storeId);
      console.log('[WhatsApp Status] Instance ID:', instanceId);

      if (!instanceId) {
        console.log('[WhatsApp Status] Sem instância - definindo como desconectado');
        setStatus('disconnected');
        return;
      }

      // Verificar status da instância
      const { data, error } = await supabase.functions.invoke('evolution-whatsapp', {
        body: {
          action: 'check_status',
          storeId: storeId,
          instanceName: instanceId
        }
      });

      console.log('[WhatsApp Status] Resposta completa da edge function:', { data, error });

      if (error) {
        // Se for erro 403, não temos permissão
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
          console.warn('[WhatsApp Status] Sem permissão para acessar esta loja');
          setStatus('no-permission');
          return;
        }
        console.error('[WhatsApp Status] Erro ao verificar status:', error);
        setStatus('disconnected');
        return;
      }

      // Normalizar possíveis formatos de resposta
      const rawStatus: string | undefined = (
        (data as any)?.instance?.state ||
        (data as any)?.instance?.connectionStatus ||
        (data as any)?.status ||
        (data as any)?.state ||
        (data as any)?.result?.state ||
        (data as any)?.data?.state
      );

      console.log('[WhatsApp Status] Status extraído:', rawStatus);

      if (!rawStatus) {
        console.warn('[WhatsApp Status] Sem campo de status reconhecido na resposta:', data);
        setStatus('disconnected');
        return;
      }

      const statusLower = String(rawStatus).toLowerCase();
      console.log('[WhatsApp Status] Status normalizado:', statusLower);

      // Estados considerados (comparação por tokens exatos para evitar falso-positivos)
      const connectedSet = new Set(['open', 'connected', 'authenticated', 'online', 'ready']);
      const connectingSet = new Set(['connecting', 'qr', 'pairing', 'loading', 'starting']);
      const disconnectedSet = new Set(['disconnected', 'closed', 'close', 'offline', 'logout', 'not_connected', 'notconnected']);

      // Tokenizar status para comparar palavras exatas
      const tokens = statusLower.replace(/[^a-z_ ]/g, ' ').split(/\s+/).filter(Boolean);

      const hasAny = (set: Set<string>) => tokens.some(t => set.has(t));

      if (hasAny(disconnectedSet)) {
        console.log('[WhatsApp Status] ❌ Status DESCONECTADO detectado');
        setStatus('disconnected');
      } else if (hasAny(connectedSet)) {
        console.log('[WhatsApp Status] ✅ Status CONECTADO detectado');
        setStatus('connected');
      } else if (hasAny(connectingSet)) {
        console.log('[WhatsApp Status] ⏳ Status CONECTANDO detectado');
        setStatus('connecting');
      } else {
        console.log('[WhatsApp Status] ❌ Status DESCONECTADO - status não reconhecido:', statusLower);
        setStatus('disconnected');
      }
    } catch (error) {
      console.error('[WhatsApp Status] Erro na verificação:', error);
      setStatus('disconnected');
    }
  };

  // Não renderizar se não tiver permissão
  if (status === 'no-permission') {
    return null;
  }

  if (status === 'loading') {
    return (
      <Badge variant="outline" className="gap-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">Verificando...</span>
      </Badge>
    );
  }

  if (status === 'connecting') {
    return (
      <Badge variant="secondary" className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white">
        <Clock className="w-3 h-3" />
        <span className="text-xs">Conectando...</span>
      </Badge>
    );
  }

  return (
    <Badge 
      variant={status === 'connected' ? "default" : "destructive"} 
      className={`gap-2 ${status === 'connected' ? 'bg-green-600 hover:bg-green-700' : ''}`}
    >
      {status === 'connected' ? (
        <>
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-xs">WhatsApp Conectado</span>
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3" />
          <span className="text-xs">WhatsApp Desconectado</span>
        </>
      )}
    </Badge>
  );
};
