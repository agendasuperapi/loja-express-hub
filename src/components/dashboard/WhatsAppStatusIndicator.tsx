import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";

interface WhatsAppStatusIndicatorProps {
  storeId: string;
}

export const WhatsAppStatusIndicator = ({ storeId }: WhatsAppStatusIndicatorProps) => {
  // Usar hook centralizado com intervalo maior (2 minutos)
  const { status, hasPermission } = useWhatsAppStatus(storeId, {
    checkInterval: 120000, // 2 minutos
  });

  // Não renderizar se não houver storeId válido ou sem permissão
  if (!storeId || !hasPermission) {
    return null;
  }

  if (status === 'loading') {
    return (
      <Badge variant="outline" className="gap-2 px-3 py-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">Verificando...</span>
      </Badge>
    );
  }

  if (status === 'connecting') {
    return (
      <Badge variant="secondary" className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1">
        <Clock className="w-3 h-3" />
        <span className="text-xs">Conectando...</span>
      </Badge>
    );
  }

  return (
    <Badge 
      variant={status === 'connected' ? "default" : "destructive"} 
      className={`gap-2 px-3 py-1 ${status === 'connected' ? 'bg-green-600 hover:bg-green-700' : ''}`}
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
