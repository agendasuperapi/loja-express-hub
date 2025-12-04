import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'loading' | 'no-permission';

interface WhatsAppStatusCache {
  status: ConnectionStatus;
  timestamp: number;
  instanceId?: string;
}

interface WhatsAppStatusOptions {
  /**
   * Intervalo de verificação em ms (padrão: 120000 = 2 minutos)
   */
  checkInterval?: number;
  
  /**
   * Tempo de cache em ms (padrão: 60000 = 1 minuto)
   */
  cacheTime?: number;
  
  /**
   * Se true, não faz polling automático (apenas verifica quando chamado manualmente)
   */
  disablePolling?: boolean;
}

// Cache global compartilhado entre todas as instâncias do hook
const statusCache = new Map<string, WhatsAppStatusCache>();

/**
 * Hook centralizado para gerenciar status do WhatsApp
 * Evita múltiplas requisições simultâneas usando cache compartilhado
 */
export const useWhatsAppStatus = (
  storeId: string | undefined,
  options: WhatsAppStatusOptions = {}
) => {
  const {
    checkInterval = 120000, // 2 minutos por padrão
    cacheTime = 60000, // Cache de 1 minuto
    disablePolling = false,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const checkingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  const checkConnectionStatus = useCallback(async (forceCheck = false) => {
    // Não fazer requisições se não tiver storeId, permissão ou já estiver verificando
    if (!storeId || !hasPermission || checkingRef.current) return;

    // Verificar visibilidade da página antes de fazer requisições
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && !forceCheck) {
      return;
    }

    // Verificar cache primeiro
    const cached = statusCache.get(storeId);
    const now = Date.now();
    
    if (!forceCheck && cached && (now - cached.timestamp) < cacheTime) {
      setStatus(cached.status);
      return;
    }

    checkingRef.current = true;

    try {
      // Buscar instância
      const { data: instanceData } = await supabase
        .from('store_instances' as any)
        .select('evolution_instance_id')
        .eq('store_id', storeId)
        .maybeSingle();

      const instanceId = (instanceData as any)?.evolution_instance_id;

      if (!instanceId) {
        const newStatus = 'disconnected';
        statusCache.set(storeId, { status: newStatus, timestamp: now });
        setStatus(newStatus);
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

      if (error) {
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
          const newStatus = 'no-permission';
          statusCache.set(storeId, { status: newStatus, timestamp: now, instanceId });
          setStatus(newStatus);
          return;
        }
        
        const newStatus = 'disconnected';
        statusCache.set(storeId, { status: newStatus, timestamp: now, instanceId });
        setStatus(newStatus);
        return;
      }

      // Extrair status
      const rawStatus: string | undefined = (
        (data as any)?.instance?.state ||
        (data as any)?.instance?.connectionStatus ||
        (data as any)?.status ||
        (data as any)?.state ||
        (data as any)?.result?.state ||
        (data as any)?.data?.state
      );

      if (!rawStatus) {
        const newStatus = 'disconnected';
        statusCache.set(storeId, { status: newStatus, timestamp: now, instanceId });
        setStatus(newStatus);
        return;
      }

      const statusLower = String(rawStatus).toLowerCase();
      const tokens = statusLower.replace(/[^a-z_ ]/g, ' ').split(/\s+/).filter(Boolean);

      const connectedSet = new Set(['open', 'connected', 'authenticated', 'online', 'ready']);
      const connectingSet = new Set(['connecting', 'qr', 'pairing', 'loading', 'starting']);
      const disconnectedSet = new Set(['disconnected', 'closed', 'close', 'offline', 'logout', 'not_connected', 'notconnected']);

      const hasAny = (set: Set<string>) => tokens.some(t => set.has(t));

      let newStatus: ConnectionStatus;
      if (hasAny(disconnectedSet)) {
        newStatus = 'disconnected';
      } else if (hasAny(connectedSet)) {
        newStatus = 'connected';
      } else if (hasAny(connectingSet)) {
        newStatus = 'connecting';
      } else {
        newStatus = 'disconnected';
      }

      statusCache.set(storeId, { status: newStatus, timestamp: now, instanceId });
      setStatus(newStatus);
    } catch (error) {
      console.error('[useWhatsAppStatus] Erro na verificação:', error);
      const newStatus = 'disconnected';
      statusCache.set(storeId, { status: newStatus, timestamp: now });
      setStatus(newStatus);
    } finally {
      checkingRef.current = false;
    }
  }, [storeId, cacheTime, hasPermission]);

  // Verificar permissões apenas uma vez
  useEffect(() => {
    const checkPermissions = async () => {
      if (!storeId) {
        setHasPermission(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasPermission(false);
        return;
      }

      // Verificar se é dono ou admin (mais eficiente que múltiplas queries)
      const [storeCheck, rolesCheck, employeeCheck] = await Promise.all([
        supabase
          .from('stores')
          .select('id')
          .eq('id', storeId)
          .eq('owner_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle(),
        supabase
          .from('store_employees')
          .select('permissions, is_active')
          .eq('user_id', user.id)
          .eq('store_id', storeId)
          .eq('is_active', true)
          .maybeSingle()
      ]);

      const isOwner = !!storeCheck.data;
      const isAdmin = !!rolesCheck.data;
      const hasWhatsAppPerm = employeeCheck.data && 
        (employeeCheck.data as any).permissions?.whatsapp?.view === true;

      setHasPermission(isOwner || isAdmin || hasWhatsAppPerm);
    };

    checkPermissions();
  }, [storeId]);

  // Configurar polling se habilitado
  useEffect(() => {
    // Não fazer nada se não tiver storeId
    if (!storeId) return;
    
    // Se não tem permissão, definir status apropriado
    if (!hasPermission) {
      setStatus('no-permission');
      return;
    }
    
    // Se polling está desabilitado, apenas verificar uma vez
    if (disablePolling) {
      checkConnectionStatus();
      return;
    }

    // Verificação inicial
    checkConnectionStatus();

    // Configurar intervalo
    intervalRef.current = setInterval(() => {
      checkConnectionStatus();
    }, checkInterval);

    // Limpar ao desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [storeId, hasPermission, checkInterval, checkConnectionStatus, disablePolling]);

  // Cleanup do cache quando o componente desmontar (opcional)
  useEffect(() => {
    return () => {
      // Não limpar o cache aqui pois pode ser usado por outros componentes
      // O cache será atualizado naturalmente pelo tempo de expiração
    };
  }, []);

  return {
    status: hasPermission ? status : 'no-permission',
    hasPermission,
    refresh: () => checkConnectionStatus(true),
    isLoading: status === 'loading',
    isConnected: status === 'connected',
    isDisconnected: status === 'disconnected',
  };
};
