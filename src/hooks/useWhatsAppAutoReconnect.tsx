import { useEffect, useRef, useState } from 'react';
import { useWhatsAppStatus } from './useWhatsAppStatus';
import { useToast } from './use-toast';

interface UseWhatsAppAutoReconnectOptions {
  maxAttempts?: number;        // Máximo de tentativas (padrão: 5)
  initialDelay?: number;       // Delay inicial em ms (padrão: 15000)
  maxDelay?: number;           // Delay máximo em ms (padrão: 240000)
  silentSuccess?: boolean;     // Se mostra toast no sucesso (padrão: true)
  enabled?: boolean;           // Se a reconexão automática está habilitada (padrão: true)
}

export const useWhatsAppAutoReconnect = (
  storeId: string | undefined,
  options: UseWhatsAppAutoReconnectOptions = {}
) => {
  const {
    maxAttempts = 5,
    initialDelay = 15000,
    maxDelay = 240000,
    silentSuccess = true,
    enabled = true,
  } = options;

  const { status, hasPermission, refresh } = useWhatsAppStatus(storeId, {
    checkInterval: 120000, // 2 minutos - sincronizado com o padrão
    disablePolling: false,
  });

  const { toast } = useToast();
  
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<string>(status);

  // Função para calcular o delay com backoff exponencial
  const getBackoffDelay = (attempt: number): number => {
    const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
    return delay;
  };

  // Função para tentar reconectar
  const attemptReconnect = async (attempt: number) => {
    if (!enabled || !storeId || !hasPermission) {
      console.log('Auto-reconnect disabled or missing permissions');
      return;
    }

    console.log(`WhatsApp auto-reconnect attempt ${attempt + 1}/${maxAttempts}`);
    setIsReconnecting(true);

    try {
      // Força uma verificação de status
      await refresh();
      
      // Aguarda um momento para o status ser atualizado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error during reconnect attempt:', error);
    }
  };

  // Efeito principal que monitora mudanças de status
  useEffect(() => {
    if (!enabled || !storeId || !hasPermission) {
      return;
    }

    const previousStatus = lastStatusRef.current;
    lastStatusRef.current = status;

    // Detecta mudança de conectado para desconectado
    if (previousStatus === 'connected' && status === 'disconnected') {
      console.log('WhatsApp disconnected - starting auto-reconnect process');
      setAttemptCount(0);
      setIsReconnecting(true);
      
      // Inicia primeira tentativa após delay inicial
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect(0);
      }, initialDelay);
    }

    // Detecta reconexão bem-sucedida
    if (previousStatus === 'disconnected' && status === 'connected' && isReconnecting) {
      console.log('WhatsApp reconnected successfully');
      
      // Limpa timeout pendente
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      setIsReconnecting(false);
      setAttemptCount(0);

      // Mostra toast de sucesso se não estiver em modo silencioso
      if (silentSuccess) {
        toast({
          title: "WhatsApp Reconectado",
          description: "A conexão foi restaurada automaticamente.",
          duration: 3000,
        });
      }
    }

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [status, storeId, hasPermission, enabled, isReconnecting, silentSuccess, refresh, toast, initialDelay]);

  // Efeito para gerenciar tentativas subsequentes
  useEffect(() => {
    if (!isReconnecting || status !== 'disconnected' || !enabled) {
      return;
    }

    // Se ainda está desconectado e temos tentativas restantes
    if (attemptCount > 0 && attemptCount < maxAttempts) {
      const delay = getBackoffDelay(attemptCount);
      console.log(`Scheduling next reconnect attempt in ${delay / 1000}s`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect(attemptCount);
      }, delay);
    }

    // Se excedeu o número de tentativas
    if (attemptCount >= maxAttempts) {
      console.log('Max reconnect attempts reached - giving up');
      setIsReconnecting(false);
      
      toast({
        variant: "destructive",
        title: "Falha ao Reconectar WhatsApp",
        description: `Não foi possível restaurar a conexão após ${maxAttempts} tentativas. Por favor, reconecte manualmente.`,
        duration: 10000,
      });
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [attemptCount, isReconnecting, status, maxAttempts, enabled, toast]);

  // Incrementa contador após cada tentativa
  useEffect(() => {
    if (isReconnecting && status === 'disconnected') {
      // Só incrementa se já passou pelo menos uma tentativa
      const timer = setTimeout(() => {
        setAttemptCount(prev => prev + 1);
      }, 2000); // Aguarda 2s após verificação antes de incrementar

      return () => clearTimeout(timer);
    }
  }, [isReconnecting, status, refresh]);

  return {
    isReconnecting,
    attemptCount,
    maxAttempts,
    status,
  };
};
