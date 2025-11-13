import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, QrCode, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Unified invoker to Evolution function using supabase.functions.invoke
const invokeEvolution = async (payload: any) => {
  console.log('[WhatsApp] Enviando para edge function:', payload);
  
  // Verify user session before calling edge function
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('[WhatsApp] Erro de sessão:', sessionError);
    return { 
      data: null, 
      error: new Error('Sessão expirada. Por favor, faça login novamente.') 
    };
  }
  
  console.log('[WhatsApp] Sessão ativa. Access token:', session.access_token.substring(0, 20) + '...');
  console.log('[WhatsApp] Chamando edge function...');
  
  // Use supabase.functions.invoke passing the JWT explicitly
  const { data, error } = await supabase.functions.invoke('evolution-whatsapp', {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    }
  });
  
  if (error) {
    console.error('[WhatsApp] Erro na resposta:', error);
    console.error('[WhatsApp] Detalhes do erro:', JSON.stringify(error, null, 2));
    return { data: null, error };
  }
  
  console.log('[WhatsApp] Resposta da edge function:', data);
  return { data, error: null };
};
const isConnectedState = (status?: string) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  console.log('[WhatsApp] Verificando estado de conexão:', { original: status, normalized: s });
  // Apenas estados que indicam conexão ativa
  const connectedStates = ['open', 'connected'];
  const isConnected = connectedStates.includes(s);
  console.log('[WhatsApp] Estado é conectado?', isConnected);
  return isConnected;
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

  // Atualizar QR code automaticamente a cada 10 segundos enquanto não conectar
  useEffect(() => {
    if (!qrCode || isConnected || !instanceName) return;

    console.log('[WhatsApp] Iniciando atualização automática do QR code');
    
    const qrRefreshInterval = setInterval(async () => {
      console.log('[WhatsApp] Atualizando QR code...');
      try {
        const { data, error } = await invokeEvolution({ 
          action: 'create_instance',
          storeId: storeId,
          instanceName: instanceName,
          phoneNumber: phoneNumber
        });

        if (!error && data?.qrcode) {
          setQrCode(data.qrcode.base64);
          console.log('[WhatsApp] QR code atualizado com sucesso');
        }
      } catch (error) {
        console.error('[WhatsApp] Erro ao atualizar QR code:', error);
      }
    }, 10000); // Atualizar a cada 10 segundos

    return () => {
      console.log('[WhatsApp] Parando atualização automática do QR code');
      clearInterval(qrRefreshInterval);
    };
  }, [qrCode, isConnected, instanceName, phoneNumber, storeId]);

  const checkExistingInstance = async () => {
    try {
      // Buscar da tabela store_instances
      const { data, error } = await supabase
        .from('store_instances' as any)
        .select('evolution_instance_id')
        .eq('store_id', storeId)
        .maybeSingle();

      if (!error && (data as any)?.evolution_instance_id) {
        setInstanceName((data as any).evolution_instance_id);
        
        // Buscar telefone da loja
        const { data: storeData } = await supabase
          .from('stores')
          .select('phone')
          .eq('id', storeId)
          .single();
        
        if (storeData?.phone) {
          // Remover +55 e formatação do telefone
          const cleanPhone = storeData.phone.replace(/\D/g, '').replace(/^55/, '');
          setPhoneNumber(cleanPhone);
        }
        
        // Inicialmente, não marcar como conectado até confirmar
        setIsConnected(false);
        setConnectionStatus('checking...');
        
        // Verificar status real
        await checkConnectionStatus((data as any).evolution_instance_id);
      } else {
        // Tentar detectar automaticamente instância pelo padrão de nome
        const candidate = `store_${storeId.substring(0, 8)}`;
        try {
          const { data: statusData } = await invokeEvolution({
            action: 'check_status',
            storeId: storeId,
            instanceName: candidate
          });
          const connected = isConnectedState(statusData?.status);
          if (connected) {
            setInstanceName(candidate);
            setIsConnected(true);
            setConnectionStatus(statusData?.status || 'connected');
            // Persistir no banco
            await supabase
              .from('store_instances' as any)
              .upsert({ 
                store_id: storeId,
                evolution_instance_id: candidate 
              });
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
        storeId: storeId,
        instanceName: instance
      });

      console.log('[WhatsApp] Resposta completa da verificação:', JSON.stringify({ data, error }, null, 2));

      if (!error && data) {
        console.log('[WhatsApp] Dados recebidos:', data);
        console.log('[WhatsApp] Status recebido:', data.status);
        
        const connected = isConnectedState(data.status);
        console.log('[WhatsApp] Status interpretado:', {
          rawStatus: data.status,
          isConnected: connected
        });
        
        setConnectionStatus(data.status || 'unknown');
        setIsConnected(connected);
        if (connected) setQrCode("");
      } else {
        console.error('[WhatsApp] Erro ao verificar status:', error);
        setConnectionStatus('error');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('[WhatsApp] Exceção ao verificar status:', error);
      setConnectionStatus('error');
      setIsConnected(false);
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
        storeId: storeId,
        instanceName: generatedInstanceName,
        phoneNumber: phoneNumber
      });

      if (error) {
        console.error('[WhatsApp] Erro ao criar instância:', error);
        throw error;
      }

      if (!data || !data.qrcode) {
        throw new Error('Resposta inválida da API - QR Code não recebido');
      }

      if (data?.qrcode) {
        setQrCode(data.qrcode.base64);
        setInstanceName(generatedInstanceName);
        
        // Save instance to database
        await supabase
          .from('store_instances' as any)
          .upsert({ 
            store_id: storeId,
            evolution_instance_id: generatedInstanceName
          });

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
        storeId: storeId,
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
        storeId: storeId,
        instanceName: instanceName
      });

      await supabase
        .from('store_instances' as any)
        .delete()
        .eq('store_id', storeId);

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
                  O QR Code será atualizado automaticamente, até que você faça a conexão.
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
                    <span className="font-medium">Status:</span>{' '}
                    {connectionStatus === 'open' || connectionStatus === 'connected' 
                      ? 'WhatsApp Conectado com sucesso' 
                      : connectionStatus === 'connecting' 
                      ? 'Conectando...' 
                      : connectionStatus}
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
