import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Bell, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface NotificationHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecheck: () => void;
}

export const NotificationHelpModal = ({
  isOpen,
  onClose,
  onRecheck,
}: NotificationHelpModalProps) => {
  const handleRecheck = () => {
    onRecheck();
    
    const current = Notification.permission;
    
    if (current === 'granted') {
      toast({
        title: "✅ Notificações permitidas!",
        description: "Você agora receberá alertas de novos pedidos.",
      });
      onClose();
    } else if (current === 'denied') {
      toast({
        title: "❌ Ainda bloqueado",
        description: "Siga os passos abaixo para desbloquear.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Bell className="w-6 h-6" />
            Como desbloquear notificações
          </DialogTitle>
          <DialogDescription>
            Siga os passos abaixo para permitir notificações no seu navegador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Chrome/Edge Instructions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Google Chrome / Microsoft Edge
            </h3>
            
            <div className="space-y-4 pl-7">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  1
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium">Clique no ícone de cadeado 🔒 (ou ⓘ) ao lado da URL na barra de endereço</p>
                  <div className="mt-2 p-3 bg-muted rounded-lg border">
                    <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-xs text-center mt-2 text-muted-foreground">
                      Localizado à esquerda da barra de endereço
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  2
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium">Encontre a opção "Notificações"</p>
                  <div className="mt-2 p-3 bg-muted rounded-lg border">
                    <p className="text-sm">
                      Procure por <strong>"Notificações"</strong> na lista de permissões
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  3
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium">Mude de "Bloquear" para "Permitir"</p>
                  <div className="mt-2 p-3 bg-muted rounded-lg border">
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-destructive font-semibold">❌ Bloquear</span>
                      <span className="text-2xl">→</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">✅ Permitir</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  4
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium">Recarregue a página</p>
                  <div className="mt-2 p-3 bg-muted rounded-lg border">
                    <p className="text-sm text-muted-foreground">
                      Pressione <kbd className="px-2 py-1 bg-background rounded border">F5</kbd> ou{" "}
                      <kbd className="px-2 py-1 bg-background rounded border">Ctrl+R</kbd>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Firefox Instructions */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-orange-500" />
              Mozilla Firefox
            </h3>
            
            <div className="pl-7 space-y-2">
              <p className="text-sm">
                1. Clique no ícone <strong>ⓘ</strong> ou <strong>🔒</strong> na barra de endereço<br/>
                2. Clique em <strong>"Mais informações"</strong><br/>
                3. Vá até a aba <strong>"Permissões"</strong><br/>
                4. Procure por <strong>"Notificações"</strong> e desmarque "Usar padrão"<br/>
                5. Selecione <strong>"Permitir"</strong><br/>
                6. Recarregue a página
              </p>
            </div>
          </div>

          {/* Safari Instructions */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              Safari (macOS)
            </h3>
            
            <div className="pl-7 space-y-2">
              <p className="text-sm">
                1. Abra <strong>Preferências do Safari</strong> (Safari → Preferências)<br/>
                2. Vá até a aba <strong>"Sites"</strong><br/>
                3. Selecione <strong>"Notificações"</strong> no menu lateral<br/>
                4. Encontre este site na lista e selecione <strong>"Permitir"</strong><br/>
                5. Recarregue a página
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Após permitir as notificações, clique em "Verificar novamente"
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button onClick={handleRecheck}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar novamente
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
