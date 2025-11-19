import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Save, Eye, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface Store {
  id: string;
  pix_key?: string;
  pix_message_title?: string;
  pix_message_description?: string;
  pix_message_footer?: string;
  pix_message_button_text?: string;
  pix_message_enabled?: boolean;
  pix_copiacola_button_text?: string;
}

interface WhatsAppMessageConfigProps {
  store: Store;
  onUpdate: (data: Partial<Store>) => Promise<void>;
}

export const WhatsAppMessageConfig = ({ store, onUpdate }: WhatsAppMessageConfigProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    pix_message_title: store.pix_message_title || "💳 Pagamento via PIX",
    pix_message_description: store.pix_message_description || "Clique no botão abaixo para copiar o código PIX, favor enviar o comprovante após o pagamento.",
    pix_message_footer: store.pix_message_footer || "Obrigado pela preferência!",
    pix_message_button_text: store.pix_message_button_text || "📋 COPIAR CHAVE PIX",
    pix_copiacola_button_text: store.pix_copiacola_button_text || "PIX Copia e Cola",
    pix_message_enabled: store.pix_message_enabled || false,
  });

  useEffect(() => {
    setFormData({
      pix_message_title: store.pix_message_title || "💳 Pagamento via PIX",
      pix_message_description: store.pix_message_description || "Clique no botão abaixo para copiar o código PIX, favor enviar o comprovante após o pagamento.",
      pix_message_footer: store.pix_message_footer || "Obrigado pela preferência!",
      pix_message_button_text: store.pix_message_button_text || "📋 COPIAR CHAVE PIX",
      pix_copiacola_button_text: store.pix_copiacola_button_text || "PIX Copia e Cola",
      pix_message_enabled: store.pix_message_enabled || false,
    });
  }, [store]);

  const handleSave = async () => {
    if (!store.pix_key && formData.pix_message_enabled) {
      toast({
        title: "Chave PIX não configurada",
        description: "Configure sua chave PIX nas configurações antes de ativar esta funcionalidade.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(formData);
      toast({
        title: "Configurações salvas!",
        description: "As configurações da mensagem PIX foram atualizadas.",
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const previewJson = {
    number: "55XXXXXXXXXXX (número do cliente)",
    title: formData.pix_message_title,
    description: formData.pix_message_description,
    footer: formData.pix_message_footer,
    buttons: [
      {
        type: "copy",
        id: "pix_copia_cola",
        displayText: formData.pix_message_button_text,
        copyCode: store.pix_key || "SUA_CHAVE_PIX_AQUI",
      },
    ],
  };

  const copyPreview = () => {
    navigator.clipboard.writeText(JSON.stringify(previewJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "JSON copiado!",
      description: "Preview do JSON foi copiado para a área de transferência.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mensagem PIX Automática</CardTitle>
          <CardDescription>
            Configure a mensagem com botão de copiar PIX que será enviada automaticamente
            após confirmação do pedido (apenas para pagamentos via PIX).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!store.pix_key && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você precisa configurar sua chave PIX nas <strong>Configurações</strong> antes de ativar esta funcionalidade.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Mensagem</Label>
              <Input
                id="title"
                placeholder="Ex: 💳 Pagamento via PIX"
                value={formData.pix_message_title}
                onChange={(e) => setFormData({ ...formData, pix_message_title: e.target.value })}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Máximo de 100 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Ex: Clique no botão abaixo para copiar o código PIX..."
                value={formData.pix_message_description}
                onChange={(e) => setFormData({ ...formData, pix_message_description: e.target.value })}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Máximo de 500 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer">Rodapé</Label>
              <Input
                id="footer"
                placeholder="Ex: Obrigado pela preferência!"
                value={formData.pix_message_footer}
                onChange={(e) => setFormData({ ...formData, pix_message_footer: e.target.value })}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Máximo de 100 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buttonText">Texto do Botão (WhatsApp)</Label>
              <Input
                id="buttonText"
                placeholder="Ex: 📋 COPIAR CHAVE PIX"
                value={formData.pix_message_button_text}
                onChange={(e) => setFormData({ ...formData, pix_message_button_text: e.target.value })}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Texto do botão na mensagem enviada pelo WhatsApp (Máximo de 50 caracteres)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copiacolaButtonText">Texto do Botão "PIX Copia e Cola" (Página de Pedidos)</Label>
              <Input
                id="copiacolaButtonText"
                placeholder="Ex: PIX Copia e Cola"
                value={formData.pix_copiacola_button_text}
                onChange={(e) => setFormData({ ...formData, pix_copiacola_button_text: e.target.value })}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Texto do botão que aparece na página de pedidos para copiar o código PIX (Máximo de 50 caracteres)
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
              <div className="space-y-0.5">
                <Label className="text-base">Ativar Envio Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar mensagem automaticamente após confirmação do pedido
                </p>
              </div>
              <Switch
                checked={formData.pix_message_enabled}
                onCheckedChange={(checked) => {
                  if (checked && !store.pix_key) {
                    toast({
                      title: "Chave PIX não configurada",
                      description: "Configure sua chave PIX primeiro.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setFormData({ ...formData, pix_message_enabled: checked });
                }}
                disabled={!store.pix_key}
              />
            </div>

            {formData.pix_message_enabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Mensagem será enviada:</strong> Automaticamente após confirmação do pedido, 
                  apenas quando o cliente escolher PIX como método de pagamento.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? "Ocultar" : "Preview"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preview do JSON</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={copyPreview}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Este é o JSON que será enviado para a API do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(previewJson, null, 2)}
              </pre>
            </div>
            {store.pix_key && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm">
                  <strong>Chave PIX configurada:</strong>{" "}
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {store.pix_key}
                  </code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
