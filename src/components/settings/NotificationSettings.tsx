import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

  useEffect(() => {
    localStorage.setItem('notification-sound-enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('browser-notification-enabled', JSON.stringify(browserNotificationEnabled));
  }, [browserNotificationEnabled]);

  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: "Permissão negada",
          description: "Você precisa permitir notificações no navegador para ativar esta opção.",
          variant: "destructive",
        });
        return;
      }
    }
    setBrowserNotificationEnabled(enabled);
    toast({
      title: enabled ? "Notificações ativadas" : "Notificações desativadas",
      description: enabled 
        ? "Você receberá notificações do navegador sobre novos pedidos."
        : "Você não receberá mais notificações do navegador.",
    });
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
      </CardContent>
    </Card>
  );
};
