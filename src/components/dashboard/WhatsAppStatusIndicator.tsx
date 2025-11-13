import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppStatusIndicatorProps {
  storeId: string;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'loading';

export const WhatsAppStatusIndicator = ({ storeId }: WhatsAppStatusIndicatorProps) => {
  const [status, setStatus] = useState<ConnectionStatus>('loading');

  useEffect(() => {
    checkConnectionStatus();
    
    // Verificar status a cada 30 segundos
    const interval = setInterval(checkConnectionStatus, 30000);
    
    return () => clearInterval(interval);
  }, [storeId]);

  const checkConnectionStatus = async () => {
    try {
      // Buscar instância da loja
      const { data: instanceData } = await supabase
        .from('store_instances' as any)
        .select('evolution_instance_id')
        .eq('store_id', storeId)
        .maybeSingle();

      const instanceId = (instanceData as any)?.evolution_instance_id;

      if (!instanceId) {
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

      if (!error && data) {
        // A API retorna { instance: { state: "open" } } ou { status: "open" }
        const statusValue = data.instance?.state || data.status;
        
        if (statusValue) {
          const statusLower = statusValue.toLowerCase();
          
          // Apenas 'open' e 'connected' são considerados conectados
          if (['open', 'connected'].includes(statusLower)) {
            setStatus('connected');
          } else if (['connecting', 'qr'].includes(statusLower)) {
            setStatus('connecting');
          } else {
            setStatus('disconnected');
          }
        } else {
          setStatus('disconnected');
        }
      } else {
        setStatus('disconnected');
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setStatus('disconnected');
    }
  };

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
