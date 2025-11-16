import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Bell, Volume2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const NotificationSettings = () => {
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
      </CardContent>
    </Card>
  );
};
