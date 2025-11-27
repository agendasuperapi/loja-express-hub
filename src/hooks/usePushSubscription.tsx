import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = 'BIxJGwVZm_CUeyqY4s8OCEUr9FfMqBb7667JL4jtwNyrL_Q7XN3nKTIPSDzx6Pa0W-ZOimvZUvRNTnxtSGVAFY4';

export function usePushSubscription() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    checkPushSupport();
    checkExistingSubscription();
  }, []);

  const checkPushSupport = () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (!supported) {
      console.warn('Push notifications não são suportadas neste navegador');
    }
  };

  const checkExistingSubscription = async () => {
    if (!('serviceWorker' in navigator)) {
      setIsLoading(false);
      return;
    }

    try {
      // Adicionar timeout para não bloquear se não houver SW
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('SW timeout')), 3000)
      );
      
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        timeoutPromise
      ]) as ServiceWorkerRegistration;
      
      const existingSub = await registration.pushManager.getSubscription();
      
      setSubscription(existingSub);
      setIsSubscribed(!!existingSub);
    } catch (error) {
      console.warn('Sem service worker ativo ou timeout:', error);
      // Não é um erro crítico, apenas não há push notifications disponíveis
    } finally {
      setIsLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async (userId: string, storeId?: string) => {
    if (!isSupported) {
      toast.error('Push notifications não são suportadas neste navegador');
      return false;
    }

    setIsLoading(true);

    try {
      // Registra o service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Solicita permissão
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast.error('Permissão para notificações negada');
        setIsLoading(false);
        return false;
      }

      // Cria subscription
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Salva no banco de dados
      const subscriptionData = sub.toJSON();
      const { error } = await supabase
        .from('push_subscriptions' as any)
        .insert({
          user_id: userId,
          store_id: storeId,
          subscription: subscriptionData,
          endpoint: sub.endpoint
        });

      setSubscription(sub);
      setIsSubscribed(true);
      toast.success('Notificações push ativadas!');
      
      return true;
    } catch (error) {
      console.error('Erro ao criar subscription:', error);
      toast.error('Erro ao ativar notificações push');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return false;

    setIsLoading(true);

    try {
      // Remove do navegador
      await subscription.unsubscribe();

      // Remove do banco de dados
      const { error } = await supabase
        .from('push_subscriptions' as any)
        .delete()
        .eq('endpoint', subscription.endpoint);

      if (error) throw error;

      setSubscription(null);
      setIsSubscribed(false);
      toast.success('Notificações push desativadas');
      
      return true;
    } catch (error) {
      console.error('Erro ao remover subscription:', error);
      toast.error('Erro ao desativar notificações push');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  };
}
