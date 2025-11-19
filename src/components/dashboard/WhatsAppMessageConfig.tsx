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
  // PIX Chave Fixa
  pix_message_title?: string;
  pix_message_description?: string;
  pix_message_footer?: string;
  pix_message_button_text?: string;
  pix_message_enabled?: boolean;
  // PIX Copia e Cola Gerado
  pix_copiacola_message_title?: string;
  pix_copiacola_message_description?: string;
  pix_copiacola_message_footer?: string;
  pix_copiacola_message_button_text?: string;
  pix_copiacola_message_enabled?: boolean;
  // Botão página de pedidos
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
    // PIX Chave Fixa
    pix_message_title: store.pix_message_title || "💳 Pagamento via PIX",
    pix_message_description: store.pix_message_description || "Clique no botão abaixo para copiar a chave PIX,\nfavor enviar o comprovante após o pagamento.",
    pix_message_footer: store.pix_message_footer || "Obrigado pela preferência!",
    pix_message_button_text: store.pix_message_button_text || "📋 COPIAR CHAVE PIX",
    pix_message_enabled: store.pix_message_enabled || false,
    // PIX Copia e Cola Gerado
    pix_copiacola_message_title: store.pix_copiacola_message_title || "💳 Código PIX Gerado",
    pix_copiacola_message_description: store.pix_copiacola_message_description || "1️⃣ Copie o código PIX abaixo.\n2️⃣ Abra o app do seu banco e vá até a opção PIX, como se fosse fazer uma transferência.\n3️⃣ Toque em \"PIX Copia e Cola\", cole o código e confirme o pagamento. 💳✨",
    pix_copiacola_message_footer: store.pix_copiacola_message_footer || "Código válido para este pedido específico.",
    pix_copiacola_message_button_text: store.pix_copiacola_message_button_text || "📋 COPIAR CÓDIGO PIX",
    pix_copiacola_message_enabled: store.pix_copiacola_message_enabled || false,
    // Botão página de pedidos
    pix_copiacola_button_text: store.pix_copiacola_button_text || "PIX Copia e Cola",
  });

  useEffect(() => {
    setFormData({
      // PIX Chave Fixa
      pix_message_title: store.pix_message_title || "💳 Pagamento via PIX",
      pix_message_description: store.pix_message_description || "Clique no botão abaixo para copiar a chave PIX,\nfavor enviar o comprovante após o pagamento.",
      pix_message_footer: store.pix_message_footer || "Obrigado pela preferência!",
      pix_message_button_text: store.pix_message_button_text || "📋 COPIAR CHAVE PIX",
      pix_message_enabled: store.pix_message_enabled || false,
      // PIX Copia e Cola Gerado
      pix_copiacola_message_title: store.pix_copiacola_message_title || "💳 Código PIX Gerado",
      pix_copiacola_message_description: store.pix_copiacola_message_description || "1️⃣ Copie o código PIX abaixo.\n2️⃣ Abra o app do seu banco e vá até a opção PIX, como se fosse fazer uma transferência.\n3️⃣ Toque em \"PIX Copia e Cola\", cole o código e confirme o pagamento. 💳✨",
      pix_copiacola_message_footer: store.pix_copiacola_message_footer || "Código válido para este pedido específico.",
      pix_copiacola_message_button_text: store.pix_copiacola_message_button_text || "📋 COPIAR CÓDIGO PIX",
      pix_copiacola_message_enabled: store.pix_copiacola_message_enabled || false,
      // Botão página de pedidos
      pix_copiacola_button_text: store.pix_copiacola_button_text || "PIX Copia e Cola",
    });
  }, [store]);

  const handleSave = async () => {
    if (!store.pix_key && (formData.pix_message_enabled || formData.pix_copiacola_message_enabled)) {
      toast({
        title: "Chave PIX não configurada",
        description: "Configure sua chave PIX nas configurações antes de ativar qualquer funcionalidade PIX.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(formData);
      toast({
        title: "Configurações salvas!",
        description: "As configurações das mensagens PIX foram atualizadas.",
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

  const previewPixKeyJson = {
    number: "55XXXXXXXXXXX (número do cliente)",
    title: formData.pix_message_title,
    description: formData.pix_message_description,
    footer: formData.pix_message_footer,
    buttons: [
      {
        type: "copy",
        id: "pix_key",
        displayText: formData.pix_message_button_text,
        copyCode: store.pix_key || "SUA_CHAVE_PIX_AQUI",
      },
    ],
  };

  const previewPixCopiaCola = {
    number: "55XXXXXXXXXXX (número do cliente)",
    title: formData.pix_copiacola_message_title,
    description: formData.pix_copiacola_message_description,
    footer: formData.pix_copiacola_message_footer,
    buttons: [
      {
        type: "copy",
        id: "pix_copiacola",
        displayText: formData.pix_copiacola_message_button_text,
        copyCode: "00020126...CODIGO_EMV_GERADO_AUTOMATICAMENTE",
      },
    ],
  };

  const copyPreview = (type: 'key' | 'copiacola') => {
    const json = type === 'key' ? previewPixKeyJson : previewPixCopiaCola;
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
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
          <CardTitle>Mensagens PIX Automáticas</CardTitle>
          <CardDescription>
            Configure as mensagens com botões de copiar PIX que serão enviadas automaticamente
            após confirmação do pedido (apenas para pagamentos via PIX).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {!store.pix_key && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você precisa configurar sua chave PIX nas <strong>Configurações</strong> antes de ativar esta funcionalidade.
              </AlertDescription>
            </Alert>
          )}

          {/* PIX Chave Fixa */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="mb-1">PIX Chave Fixa</Badge>
              </div>
              <CardTitle className="text-lg text-orange-600">Mensagem com Chave PIX</CardTitle>
              <CardDescription>
                Configure a mensagem que será enviada com sua chave PIX cadastrada para o cliente copiar e realizar o pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

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
                Texto do botão na mensagem do WhatsApp (Máximo de 50 caracteres)
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="space-y-0.5">
                <Label className="text-base">Ativar Envio Automático (Chave Fixa)</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar chave PIX após confirmação do pedido
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
            </CardContent>
          </Card>

          {/* PIX Copia e Cola Gerado */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="mb-1">PIX Copia e Cola Gerado</Badge>
              </div>
              <CardTitle className="text-lg text-orange-600">PIX Copia e Cola</CardTitle>
              <CardDescription>
                Configure a mensagem que será enviada junta com o código do Pix copia e cola.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="copiacolaTitle">Título da Mensagem</Label>
              <Input
                id="copiacolaTitle"
                placeholder="Ex: 💳 Código PIX Gerado"
                value={formData.pix_copiacola_message_title}
                onChange={(e) => setFormData({ ...formData, pix_copiacola_message_title: e.target.value })}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Máximo de 100 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copiacolaDescription">Descrição</Label>
              <Textarea
                id="copiacolaDescription"
                placeholder="Ex: Use o código PIX Copia e Cola gerado automaticamente..."
                value={formData.pix_copiacola_message_description}
                onChange={(e) => setFormData({ ...formData, pix_copiacola_message_description: e.target.value })}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                💡 Variável disponível: {'{'}{'{'}<strong>botao_pix_copiacola</strong>{'}'}{'}'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copiacolaFooter">Rodapé</Label>
              <Input
                id="copiacolaFooter"
                placeholder="Ex: Código válido para este pedido específico."
                value={formData.pix_copiacola_message_footer}
                onChange={(e) => setFormData({ ...formData, pix_copiacola_message_footer: e.target.value })}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Máximo de 100 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copiacolaButtonTextWpp">Texto do Botão (WhatsApp)</Label>
              <Input
                id="copiacolaButtonTextWpp"
                placeholder="Ex: 📋 COPIAR CÓDIGO PIX"
                value={formData.pix_copiacola_message_button_text}
                onChange={(e) => setFormData({ ...formData, pix_copiacola_message_button_text: e.target.value })}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Texto do botão na mensagem do WhatsApp (Máximo de 50 caracteres)
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="space-y-0.5">
                <Label className="text-base">Ativar Envio Automático (Código Gerado)</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar código PIX Copia e Cola após confirmação
                </p>
              </div>
              <Switch
                checked={formData.pix_copiacola_message_enabled}
                onCheckedChange={(checked) => {
                  if (checked && !store.pix_key) {
                    toast({
                      title: "Chave PIX não configurada",
                      description: "Configure sua chave PIX primeiro.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setFormData({ ...formData, pix_copiacola_message_enabled: checked });
                }}
                disabled={!store.pix_key}
              />
            </div>
            </CardContent>
          </Card>

          {/* Configuração do botão na página de pedidos */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="mb-1">Página de Pedidos</Badge>
              </div>
              <CardTitle className="text-lg text-orange-600">Botão na Tela do Cliente</CardTitle>
              <CardDescription>
                Personalize o texto do botão "PIX Copia e Cola" que aparece na página de acompanhamento de pedidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="copiacolaButtonText">Texto do Botão "PIX Copia e Cola"</Label>
              <Input
                id="copiacolaButtonText"
                placeholder="Ex: PIX Copia e Cola"
                value={formData.pix_copiacola_button_text}
                onChange={(e) => setFormData({ ...formData, pix_copiacola_button_text: e.target.value })}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Texto do botão que aparece na página de pedidos (Máximo de 50 caracteres)
              </p>
            </div>
            </CardContent>
          </Card>

          {(formData.pix_message_enabled || formData.pix_copiacola_message_enabled) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Mensagens serão enviadas:</strong> Automaticamente após confirmação do pedido, 
                apenas quando o cliente escolher PIX como método de pagamento.
              </AlertDescription>
            </Alert>
          )}

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
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview: PIX Chave Fixa</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyPreview('key')}
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
                JSON enviado para WhatsApp (Chave Fixa)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(previewPixKeyJson, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview: PIX Copia e Cola Gerado</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyPreview('copiacola')}
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
                JSON enviado para WhatsApp (Código Gerado)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(previewPixCopiaCola, null, 2)}
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
        </>
      )}
    </div>
  );
};
