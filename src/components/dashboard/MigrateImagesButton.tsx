import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const MigrateImagesButton = () => {
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrate = async () => {
    try {
      setIsMigrating(true);
      
      toast({
        title: 'Migração iniciada',
        description: 'As imagens dos produtos estão sendo reorganizadas...',
      });

      const { data, error } = await supabase.functions.invoke('migrate-product-images', {
        body: {}
      });

      if (error) throw error;

      console.log('Resultado da migração:', data);

      toast({
        title: 'Migração concluída!',
        description: `${data.success} produtos migrados com sucesso. ${data.errors} erros.`,
      });

      // Recarregar a página para mostrar as novas URLs
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error('Erro na migração:', error);
      toast({
        title: 'Erro na migração',
        description: 'Não foi possível migrar as imagens. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isMigrating}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isMigrating ? 'animate-spin' : ''}`} />
          Migrar Imagens
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Migrar imagens de produtos</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá reorganizar todas as imagens de produtos para o novo formato otimizado para WhatsApp.
            <br /><br />
            As imagens serão movidas de <code className="text-xs bg-muted px-1 py-0.5 rounded">temp/random.jpg</code> para <code className="text-xs bg-muted px-1 py-0.5 rounded">product_id.jpg</code>
            <br /><br />
            Este processo pode levar alguns minutos dependendo da quantidade de produtos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleMigrate} disabled={isMigrating}>
            {isMigrating ? 'Migrando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
