import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NotificationHelpModal } from "./NotificationHelpModal";

export const NotificationPermissionBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const checkPermission = () => {
    if ('Notification' in window) {
      const current = Notification.permission;
      setPermission(current);
      setIsVisible(current === 'denied');
    }
  };

  useEffect(() => {
    checkPermission();

    // Recheck permission when window regains focus
    const handleFocus = () => {
      checkPermission();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <Alert className="mb-4 bg-destructive/10 border-destructive/30 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4 ml-2">
          <div className="flex-1">
            <strong className="font-semibold">Notificações bloqueadas!</strong>
            <p className="text-sm mt-1">
              Você não receberá alertas de novos pedidos. Clique em "Ver como desbloquear" para permitir notificações.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-background hover:bg-muted"
            >
              Ver como desbloquear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <NotificationHelpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRecheck={checkPermission}
      />
    </>
  );
};
