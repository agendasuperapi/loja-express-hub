import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, QrCode, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// Removed extra Supabase client to avoid multiple instances warning

// Edge Function URL
const SUPABASE_URL = 'https://mgpzowiahnwcmcaelogf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ncHpvd2lhaG53Y21jYWVsb2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjQ2MTIsImV4cCI6MjA3ODIwMDYxMn0.sC-SMpIf8-VbZWB6BCIQG-TtROcxyzE4hK4bFocTRQE';
const CLOUD_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/evolution-whatsapp`;

// Unified invoker to Evolution function (keeps same return shape as supabase.functions.invoke)
const invokeEvolution = async (payload: any) => {
  console.log('[WhatsApp] Enviando para edge function:', payload);
  const res = await fetch(CLOUD_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });
  
  console.log('[WhatsApp] Status da resposta:', res.status);
  
  if (!res.ok) {
    const text = await res.text();
    console.error('[WhatsApp] Erro na resposta:', text);
    return { data: null, error: new Error(text || 'Failed to send a request to the Edge Function') };
  }
  const data = await res.json();
  console.log('[WhatsApp] Resposta da edge function:', data);
  return { data, error: null };
};
const isConnectedState = (status?: string) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  // Considerar conectado apenas em estados finais estáveis
  const connectedStates = ['open', 'connected', 'authenticated', 'ready'];
  return connectedStates.includes(s);
};

interface WhatsAppIntegrationProps {
  storeId: string;
}

export const WhatsAppIntegration = ({ storeId }: WhatsAppIntegrationProps) => {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");

  useEffect(() => {
    checkExistingInstance();
  }, [storeId]);

  // Verificar status periodicamente se houver instância conectada
  useEffect(() => {
    if (!instanceName) return;

    const statusInterval = setInterval(() => {
      checkConnectionStatus(instanceName);
    }, 30000); // Verificar a cada 30 segundos

    return () => clearInterval(statusInterval);
  }, [instanceName]);

  const checkExistingInstance = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('whatsapp_instance, whatsapp_phone')
        .eq('id', storeId)
        .single();

      if (!error && data?.whatsapp_instance) {
        setInstanceName(data.whatsapp_instance);
        setPhoneNumber(data.whatsapp_phone || "");
        
// Inicialmente, não marcar como conectado até confirmar
setIsConnected(false);
setConnectionStatus('checking...');
        
        // Verificar status real
        await checkConnectionStatus(data.whatsapp_instance);
      } else {
        // Tentar detectar automaticamente instância pelo padrão de nome
        const candidate = `store_${storeId.substring(0, 8)}`;
        try {
const { data: statusData } = await invokeEvolution({
  action: 'check_status',
  instanceName: candidate
});
          const connected = isConnectedState(statusData?.status);
          if (connected) {
            setInstanceName(candidate);
            setIsConnected(true);
            setConnectionStatus(statusData?.status || 'connected');
            // Persistir no banco
            await supabase
              .from('stores')
              .update({ whatsapp_instance: candidate })
              .eq('id', storeId);
          }
        } catch (e) {
          // silencioso
        }
      }
    } catch (error) {
      console.error('Error checking instance:', error);
    }
  };

  const checkConnectionStatus = async (instance: string) => {
    try {
      console.log('[WhatsApp] Verificando status da instância:', instance);
      
const { data, error } = await invokeEvolution({ 
        action: 'check_status',
        instanceName: instance
      });

      console.log('[WhatsApp] Resposta da verificação:', { data, error });

      if (!error && data && data.status) {
        const connected = isConnectedState(data.status);
        console.log('[WhatsApp] Status interpretado:', {
          rawStatus: data.status,
          isConnected: connected
        });
        
        setConnectionStatus(data.status);
        setIsConnected(connected);
        if (connected) setQrCode("");
      } else {
        console.error('[WhatsApp] Erro ao verificar status:', error);
        // Se der erro mas temos instância salva, manter conectado
        // O usuário pode clicar em "Verificar Status" manualmente
        console.log('[WhatsApp] Mantendo status anterior por ter instância salva');
      }
    } catch (error) {
      console.error('[WhatsApp] Exceção ao verificar status:', error);
      // Em caso de exceção, manter o estado atual se houver instância
    }
  };

  const createInstance = async () => {
    if (!phoneNumber) {
      toast({
        title: "Número necessário",
        description: "Por favor, insira seu número de telefone",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const generatedInstanceName = `store_${storeId.substring(0, 8)}`;
      
const { data, error } = await invokeEvolution({ 
        action: 'create_instance',
        instanceName: generatedInstanceName,
        phoneNumber: phoneNumber
      });

      if (error) throw error;

      if (data?.qrcode) {
        setQrCode(data.qrcode.base64);
        setInstanceName(generatedInstanceName);
        
        // Save instance to database
        await supabase
          .from('stores')
          .update({ 
            whatsapp_instance: generatedInstanceName,
            whatsapp_phone: phoneNumber
          })
          .eq('id', storeId);

        toast({
          title: "Instância criada!",
          description: "Escaneie o QR Code para conectar seu WhatsApp"
        });

        // Start polling for connection status
        pollConnectionStatus(generatedInstanceName);
      }
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast({
        title: "Erro ao criar instância",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pollConnectionStatus = (instance: string) => {
    const interval = setInterval(async () => {
const { data } = await invokeEvolution({ 
        action: 'check_status',
        instanceName: instance
      });

      const connected = isConnectedState(data?.status);
      if (connected) {
        setIsConnected(true);
        setConnectionStatus(String(data?.status));
        setQrCode("");
        clearInterval(interval);
        toast({
          title: "WhatsApp conectado!",
          description: "Sua conta foi conectada com sucesso"
        });
      }
    }, 5000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  const disconnectInstance = async () => {
    if (!instanceName) return;

    setIsLoading(true);
    try {
await invokeEvolution({ 
        action: 'disconnect',
        instanceName: instanceName
      });

      await supabase
        .from('stores')
        .update({ 
          whatsapp_instance: null,
          whatsapp_phone: null
        })
        .eq('id', storeId);

      setIsConnected(false);
      setQrCode("");
      setInstanceName("");
      setPhoneNumber("");
      setConnectionStatus("disconnected");

      toast({
        title: "Desconectado",
        description: "WhatsApp desconectado com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao desconectar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                Integração WhatsApp
              </CardTitle>
              <CardDescription className="mt-2">
                Conecte seu WhatsApp para receber pedidos diretamente
              </CardDescription>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-600" : ""}>
              {isConnected ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Conectado
                </>
              ) : (
                <>Desconectado</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected && !qrCode && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Número de Telefone</Label>
                <div className="flex gap-2 mt-2">
                  <div className="flex items-center px-3 border rounded-l-md bg-muted">
                    <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">+55</span>
                  </div>
                  <Input
                    id="phone"
                    placeholder="38999145788"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="rounded-l-none"
                    maxLength={11}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Digite apenas números (DDD + número)
                </p>
              </div>

              <Button 
                onClick={createInstance} 
                disabled={isLoading || !phoneNumber}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando instância...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar QR Code
                  </>
                )}
              </Button>
            </div>
          )}

          {qrCode && !isConnected && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Escaneie o QR Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Abra o WhatsApp no seu celular e escaneie este código
                </p>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  O QR Code é válido por 5 minutos
                </p>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      WhatsApp Conectado
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Telefone: +55 {phoneNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">Informações da Instância</h4>
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                    <span className="font-medium">Nome:</span> {instanceName}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Status:</span> {connectionStatus}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => checkConnectionStatus(instanceName)} 
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>Verificar Status</>
                  )}
                </Button>
                
                <Button 
                  onClick={disconnectInstance} 
                  disabled={isLoading}
                  variant="destructive"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Desconectando...
                    </>
                  ) : (
                    <>Desconectar WhatsApp</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
