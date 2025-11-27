import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Bell, Volume2, BellOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuth } from "@/hooks/useAuth";

interface NotificationSettingsProps {
  storeId?: string;
}

export const NotificationSettings = ({ storeId }: NotificationSettingsProps = {}) => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushSubscription();
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('notification-sound-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [browserNotificationEnabled, setBrowserNotificationEnabled] = useState(() => {
    const saved = localStorage.getItem('browser-notification-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [notificationVolume, setNotificationVolume] = useState(() => {
    const saved = localStorage.getItem('notification-volume');
    return saved !== null ? JSON.parse(saved) : 100;
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Verificar permissão de notificações ao montar o componente
  useEffect(() => {
    if (!('Notification' in window)) {
      console.warn('⚠️ Este navegador não suporta notificações');
      return;
    }

    const checkPermission = async () => {
      const currentPermission = Notification.permission;
      setNotificationPermission(currentPermission);
      
      console.log('🔔 Status da permissão de notificações:', currentPermission);

      // Se a permissão ainda não foi concedida, solicitar automaticamente
      if (currentPermission === 'default' && storeId) {
        console.log('📢 Solicitando permissão de notificações automaticamente...');
        
        try {
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);
          
          if (permission === 'granted') {
            toast({
              title: "✅ Notificações permitidas",
              description: "Você receberá alertas de novos pedidos!",
            });
          } else if (permission === 'denied') {
            toast({
              title: "❌ Notificações bloqueadas",
              description: "Para receber alertas, permita notificações nas configurações do navegador.",
              variant: "destructive",
              duration: 7000,
            });
          }
        } catch (error) {
          console.error('Erro ao solicitar permissão:', error);
        }
      } else if (currentPermission === 'denied') {
        toast({
          title: "🔕 Notificações bloqueadas",
          description: "Para receber alertas de pedidos, permita notificações nas configurações do seu navegador.",
          variant: "destructive",
          duration: 10000,
        });
      }
    };

    checkPermission();
  }, [storeId]);

  useEffect(() => {
    localStorage.setItem('notification-sound-enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('browser-notification-enabled', JSON.stringify(browserNotificationEnabled));
  }, [browserNotificationEnabled]);

  useEffect(() => {
    localStorage.setItem('notification-volume', JSON.stringify(notificationVolume));
  }, [notificationVolume]);

  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!('Notification' in window)) {
        toast({
          title: "Não suportado",
          description: "Seu navegador não suporta notificações.",
          variant: "destructive",
        });
        return;
      }

      if (Notification.permission === 'denied') {
        toast({
          title: "Permissão negada",
          description: "Você precisa permitir notificações nas configurações do navegador. Procure por 'Notificações' nas configurações do site.",
          variant: "destructive",
          duration: 7000,
        });
        return;
      }

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('🔔 Permissão solicitada:', permission);
        
        if (permission !== 'granted') {
          toast({
            title: "Permissão negada",
            description: "Você precisa permitir notificações para ativar esta funcionalidade.",
            variant: "destructive",
          });
          return;
        }
      }

      // Testar notificação
      try {
        const testNotification = new Notification('✅ Notificações Ativadas!', {
          body: 'Você receberá notificações de novos pedidos mesmo quando a aba não estiver em foco.',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: false,
        });

        setTimeout(() => testNotification.close(), 5000);

        toast({
          title: "Notificações ativadas",
          description: "Uma notificação de teste foi enviada.",
        });
      } catch (error) {
        console.error('Erro ao testar notificação:', error);
        toast({
          title: "Erro ao ativar notificações",
          description: "Tente novamente ou verifique as configurações do navegador.",
          variant: "destructive",
        });
        return;
      }
    } else {
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais notificações do navegador.",
      });
    }
    
    setBrowserNotificationEnabled(enabled);
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    toast({
      title: enabled ? "Som ativado" : "Som desativado",
      description: enabled 
        ? "Você ouvirá um som quando receber novos pedidos."
        : "Você não ouvirá mais sons de notificação.",
    });
  };

  const handlePushToggle = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para ativar notificações push.",
        variant: "destructive",
      });
      return;
    }

    if (isSubscribed) {
      await unsubscribe();
      toast({
        title: "🔕 Push desativado",
        description: "Você não receberá mais notificações push.",
      });
    } else {
      // Verifica se a permissão está bloqueada ANTES de tentar ativar
      const currentPermission = Notification.permission;
      
      if (currentPermission === 'denied') {
        toast({
          title: "❌ Notificações bloqueadas",
          description: "Clique no ícone 🔒 ao lado da URL e permita as Notificações.",
          variant: "destructive",
          duration: 8000,
        });
        return;
      }
      
      // Passa o storeId se disponível (para lojistas)
      const success = await subscribe(user.id, storeId);
      
      if (success) {
        toast({
          title: "🔔 Push ativado!",
          description: "Você receberá notificações mesmo com o app fechado.",
        });
        
        console.log('[Push] Subscription criada com sucesso:', { userId: user.id, storeId });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notificações
        </CardTitle>
        <CardDescription>
          Configure como você deseja receber notificações de novos pedidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3 flex-1">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="sound-notifications" className="text-base font-medium cursor-pointer">
                Som de notificação
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproduzir um som quando receber novos pedidos
              </p>
            </div>
          </div>
          <Switch
            id="sound-notifications"
            checked={soundEnabled}
            onCheckedChange={handleSoundToggle}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3 flex-1">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="browser-notifications" className="text-base font-medium cursor-pointer">
                Notificações do navegador
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber alertas mesmo quando a aba não estiver em foco
              </p>
            </div>
          </div>
          <Switch
            id="browser-notifications"
            checked={browserNotificationEnabled}
            onCheckedChange={handleBrowserNotificationToggle}
          />
        </div>

        <div className="p-4 rounded-lg bg-muted/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="volume-slider" className="text-base font-medium">
                  Volume do som
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ajuste a intensidade do som de notificação
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
              {notificationVolume}%
            </span>
          </div>
          <Slider
            id="volume-slider"
            value={[notificationVolume]}
            onValueChange={(value) => setNotificationVolume(value[0])}
            max={100}
            min={0}
            step={1}
            className="w-full"
            disabled={!soundEnabled}
          />
        </div>

        {/* Alerta de permissão negada */}
        {notificationPermission === 'denied' && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive">
                  Notificações bloqueadas
                </p>
                <p className="text-sm text-muted-foreground">
                  Você bloqueou as notificações. Para receber alertas:
                </p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 ml-2">
                  <li>Clique no ícone <strong>🔒</strong> ou <strong>ⓘ</strong> na barra de endereço</li>
                  <li>Encontre "Notificações" e mude para <strong>"Permitir"</strong></li>
                  <li>Recarregue a página</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Web Push Notifications */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notificações Push (Web Push)
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações mesmo com navegador <strong>fechado ou minimizado</strong>
              </p>
              {!isSupported && (
                <p className="text-sm text-destructive mt-2">
                  ⚠️ Seu navegador não suporta Web Push
                </p>
              )}
            </div>
            {isSupported && (
              <Button
                onClick={handlePushToggle}
                disabled={isLoading}
                variant={isSubscribed ? "destructive" : "default"}
                size="sm"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSubscribed ? (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Ativar Push
                  </>
                )}
              </Button>
            )}
          </div>
          {isSubscribed && (
            <div className="bg-green-50 dark:bg-green-950/50 p-3 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                ✓ Web Push ativo - Você receberá alertas mesmo com o app fechado!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
