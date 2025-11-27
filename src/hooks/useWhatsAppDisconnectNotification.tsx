import { useEffect, useRef, useState } from 'react';
import { useWhatsAppStatus } from './useWhatsAppStatus';
import { useToast } from './use-toast';

type ReconnectStatus = {
  isReconnecting: boolean;
  attemptCount: number;
};

interface UseWhatsAppDisconnectNotificationOptions {
  enableBrowserNotification?: boolean; // Se deve mostrar notificações do navegador (padrão: true)
  enableToast?: boolean;               // Se deve mostrar toasts (padrão: true)
  autoRequestPermission?: boolean;     // Se deve solicitar permissão automaticamente (padrão: true)
  notificationDelay?: number;          // Delay antes de notificar em ms (padrão: 30000 - 30s)
  reconnectStatus?: ReconnectStatus;   // Status da reconexão automática
}

/**
 * Hook para notificar quando o WhatsApp desconectar
 * Envia notificações push do navegador e toast
 * Integra com reconexão automática para evitar notificações desnecessárias
 */
export const useWhatsAppDisconnectNotification = (
  storeId: string | undefined,
  options: UseWhatsAppDisconnectNotificationOptions = {}
) => {
  const {
    enableBrowserNotification = true,
    enableToast = true,
    autoRequestPermission = true,
    notificationDelay = 30000, // 30 segundos de delay padrão
    reconnectStatus,
  } = options;

  const { status, hasPermission } = useWhatsAppStatus(storeId, {
    checkInterval: 120000, // 2 minutos
  });
  
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const previousStatusRef = useRef<string>(status);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Solicitar permissão para notificações
  useEffect(() => {
    if (!enableBrowserNotification || !autoRequestPermission) return;
    
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);
          
          if (permission === 'granted') {
            console.log('[WhatsApp Notification] Permissão concedida para notificações');
          } else {
            console.log('[WhatsApp Notification] Permissão negada para notificações');
          }
        } catch (error) {
          console.error('[WhatsApp Notification] Erro ao solicitar permissão:', error);
        }
      } else if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    };

    // Solicitar permissão após um delay (para não ser intrusivo)
    const timeout = setTimeout(requestNotificationPermission, 3000);
    
    return () => clearTimeout(timeout);
  }, [enableBrowserNotification, autoRequestPermission]);

  // Monitora mudanças de status
  useEffect(() => {
    if (!storeId || !hasPermission) {
      return;
    }

    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    // Detecta mudança de conectado para desconectado
    if (previousStatus === 'connected' && status === 'disconnected') {
      console.log('WhatsApp disconnected - scheduling notification with delay');

      // Limpa timeout anterior se existir
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }

      // Agenda notificação com delay
      notificationTimeoutRef.current = setTimeout(() => {
        // Verifica se ainda está desconectado e se não está reconectando
        if (status === 'disconnected' && (!reconnectStatus || !reconnectStatus.isReconnecting)) {
          console.log('Sending disconnect notifications after delay');

          // Notificação do navegador
          if (enableBrowserNotification && notificationPermission === 'granted') {
            const notification = new Notification('WhatsApp Desconectado', {
              body: 'A conexão do WhatsApp foi perdida. Clique para reconectar.',
              icon: '/favicon-96x96.png',
              tag: 'whatsapp-disconnect',
              requireInteraction: true,
              silent: false,
            });

            // Ao clicar na notificação, foca na janela e vai para a aba do WhatsApp
            notification.onclick = () => {
              window.focus();
              // Se estiver em uma rota do dashboard, tenta navegar para a aba WhatsApp
              const currentPath = window.location.pathname;
              if (currentPath.includes('dashboard')) {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'whatsapp');
                window.history.pushState({}, '', url);
                // Dispara evento customizado para componentes reagirem
                window.dispatchEvent(new CustomEvent('navigate-to-whatsapp'));
              }
              notification.close();
            };
          }

          // Toast notification
          if (enableToast) {
            toast({
              variant: "destructive",
              title: "WhatsApp Desconectado",
              description: "A conexão do WhatsApp foi perdida. Por favor, reconecte.",
              duration: 10000,
            });
          }
        } else {
          console.log('Notification cancelled - reconnection in progress or already connected');
        }
      }, notificationDelay);
    }

    // Detecta reconexão
    if (previousStatus === 'disconnected' && status === 'connected') {
      console.log('WhatsApp reconnected');
      
      // Cancela notificação agendada se houver
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
        notificationTimeoutRef.current = null;
      }

      // Só mostra toast se não foi uma reconexão automática silenciosa
      if (enableToast && (!reconnectStatus || !reconnectStatus.isReconnecting)) {
        toast({
          title: "WhatsApp Conectado",
          description: "A conexão do WhatsApp foi restaurada.",
          duration: 5000,
        });
      }
    }

    // Cleanup
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [status, storeId, hasPermission, enableBrowserNotification, enableToast, notificationPermission, toast, notificationDelay, reconnectStatus]);

  return {
    status,
    hasPermission,
    notificationPermission,
  };
};
