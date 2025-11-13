import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppStatusIndicatorProps {
  storeId: string;
}

export const WhatsAppStatusIndicator = ({ storeId }: WhatsAppStatusIndicatorProps) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setIsConnected(false);
        setIsLoading(false);
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

      if (!error && data?.status) {
        const connectedStates = ['open', 'connected', 'authenticated', 'ready'];
        setIsConnected(connectedStates.includes(data.status.toLowerCase()));
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">Verificando...</span>
      </Badge>
    );
  }

  return (
    <Badge 
      variant={isConnected ? "default" : "destructive"} 
      className={`gap-2 ${isConnected ? 'bg-green-600 hover:bg-green-700' : ''}`}
    >
      {isConnected ? (
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
