import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

import { toast } from 'sonner';
import { Loader2, Mail, UserPlus, Copy, CheckCircle } from 'lucide-react';

interface InviteAffiliateDialogProps {
  storeId: string;
  storeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteAffiliateDialog({
  storeId,
  storeName,
  open,
  onOpenChange,
  onSuccess
}: InviteAffiliateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
  });

  const handleSubmit = async () => {
    if (!formData.email || !formData.name) {
      toast.error('Preencha nome e email do afiliado');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-invite', {
        body: {
          action: 'send',
          store_id: storeId,
          store_name: storeName,
          email: formData.email,
          name: formData.name,
        }
      });

      if (error) {
        toast.error('Erro ao enviar convite');
        return;
      }

      if (data?.success) {
        if (data.already_registered) {
          toast.success('Afiliado já existente vinculado à loja!');
          onOpenChange(false);
          onSuccess?.();
        } else {
          const link = `${window.location.origin}/afiliado/cadastro?token=${data.invite_token}`;
          setInviteLink(link);
          toast.success('Convite criado com sucesso!');
        }
      } else {
        toast.error(data?.error || 'Erro ao criar convite');
      }
    } catch (err) {
      console.error('Invite error:', err);
      toast.error('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copiado!');
    }
  };

  const handleClose = () => {
    setInviteLink(null);
    setFormData({
      email: '',
      name: '',
    });
    onOpenChange(false);
    if (inviteLink) {
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Afiliado
          </DialogTitle>
          <DialogDescription>
            Envie um convite para um novo afiliado se cadastrar no sistema independente.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Convite criado!</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Envie o link abaixo para {formData.name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link de convite</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={copyInviteLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este link expira em 7 dias
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do afiliado *</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail do afiliado *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              As comissões do afiliado serão definidas pelo cupom vinculado a ele no gerenciador de afiliados.
            </p>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Criar Convite
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
