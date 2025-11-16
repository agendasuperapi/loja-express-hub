import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Phone, QrCode, CheckCircle2, Loader2, FileText, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmployeeAccess } from "@/hooks/useEmployeeAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { motion } from "framer-motion";

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
  const { isEmployee, permissions } = useEmployeeAccess();
  const { isAdmin, isStoreOwner } = useUserRole();
  
  // Verificar se o usuário tem permissão de editar WhatsApp
  const canEditWhatsApp = isAdmin || isStoreOwner || (isEmployee && permissions?.whatsapp?.edit === true);
  const canViewWhatsApp = isAdmin || isStoreOwner || (isEmployee && permissions?.whatsapp?.view === true);
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");
  const [connectionLogs, setConnectionLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }>>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [autoReconnectEnabled, setAutoReconnectEnabled] = useState(true);

  useEffect(() => {
    checkExistingInstance();
  }, [storeId]);

  // Sistema profissional de monitoramento e reconexão automática
  useEffect(() => {
    if (!instanceName || !autoReconnectEnabled) return;

    let healthCheckInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;
    let isCheckingHealth = false;

    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      const time = new Date().toLocaleTimeString('pt-BR');
      setConnectionLogs(prev => [...prev, { time, message, type }]);
    };

    const performHealthCheck = async () => {
      if (isCheckingHealth) return;
      isCheckingHealth = true;

      try {
        addLog('🔍 Executando health check...', 'info');
        
        const { data, error } = await invokeEvolution({
          action: 'check_status',
          storeId: storeId,
          instanceName: instanceName
        });

        if (error) {
          throw new Error(error.message || 'Erro ao verificar status');
        }

        const connected = isConnectedState(data?.status);
        
        if (connected) {
          setIsConnected(true);
          setConnectionStatus(data.status);
          setReconnectAttempts(0);
          setIsReconnecting(false);
          addLog('✅ Health check: Conexão ativa', 'success');
        } else {
          addLog(`⚠️ Health check: Desconectado (${data?.status})`, 'error');
          
          if (autoReconnectEnabled && !isReconnecting) {
            triggerReconnect();
          }
        }
      } catch (error: any) {
        addLog(`❌ Health check falhou: ${error.message}`, 'error');
        
        if (autoReconnectEnabled && !isReconnecting) {
          triggerReconnect();
        }
      } finally {
        isCheckingHealth = false;
      }
    };

    const triggerReconnect = async () => {
      setIsReconnecting(true);
      const attempt = reconnectAttempts + 1;
      setReconnectAttempts(attempt);

      // Backoff exponencial: 5s, 10s, 20s, 40s, 60s (máximo)
      const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
      
      addLog(`🔄 Tentativa de reconexão ${attempt} em ${delay / 1000}s...`, 'info');

      reconnectTimeout = setTimeout(async () => {
        try {
          addLog(`🔌 Iniciando reconexão (tentativa ${attempt})...`, 'info');

          // Tentar recuperar a conexão
          const { data, error } = await invokeEvolution({
            action: 'check_status',
            storeId: storeId,
            instanceName: instanceName
          });

          if (!error && isConnectedState(data?.status)) {
            addLog('✅ Reconexão bem-sucedida!', 'success');
            setIsConnected(true);
            setConnectionStatus(data.status);
            setReconnectAttempts(0);
            setIsReconnecting(false);
            
            toast({
              title: "WhatsApp Reconectado",
              description: "A conexão foi restaurada automaticamente",
            });
          } else {
            throw new Error('Ainda desconectado');
          }
        } catch (error: any) {
          addLog(`❌ Reconexão falhou: ${error.message}`, 'error');
          
          // Tentar novamente se não excedeu 10 tentativas
          if (attempt < 10) {
            triggerReconnect();
          } else {
            addLog('⛔ Máximo de tentativas atingido. Gerando novo QR Code...', 'error');
            setIsReconnecting(false);
            setIsConnected(false);
            
            toast({
              title: "Reconexão Falhou",
              description: "Por favor, escaneie o QR Code novamente",
              variant: "destructive"
            });
            
            // Gerar novo QR Code automaticamente
            try {
              const { data } = await invokeEvolution({
                action: 'create_instance',
                storeId: storeId,
                instanceName: instanceName,
                phoneNumber: phoneNumber
              });
              
              if (data?.qrcode) {
                setQrCode(data.qrcode.base64);
                setReconnectAttempts(0);
                addLog('📱 Novo QR Code gerado. Por favor, escaneie novamente.', 'info');
              }
            } catch (qrError) {
              addLog('❌ Erro ao gerar QR Code', 'error');
            }
          }
        }
      }, delay);
    };

    // Health check a cada 15 segundos (mais frequente para detecção rápida)
    healthCheckInterval = setInterval(performHealthCheck, 15000);
    
    // Executar primeiro check imediatamente
    performHealthCheck();

    return () => {
      clearInterval(healthCheckInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [instanceName, autoReconnectEnabled, reconnectAttempts, isReconnecting, phoneNumber, storeId]);

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
      console.log('[WhatsApp] Verificando instância existente para storeId:', storeId);
      // Buscar da tabela store_instances
      const { data, error } = await supabase
        .from('store_instances' as any)
        .select('evolution_instance_id')
        .eq('store_id', storeId)
        .maybeSingle();

      console.log('[WhatsApp] Resultado:', { data, error, nota: 'Instância usa storeId, não slug da loja' });

      if (!error && (data as any)?.evolution_instance_id) {
        const instanceId = (data as any).evolution_instance_id;
        setInstanceName(instanceId);
        console.log('[WhatsApp] Instância encontrada:', instanceId);
        
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
        await checkConnectionStatus(instanceId);
      } else {
        // Tentar detectar automaticamente instância pelo padrão de nome
        // Nome baseado em storeId, não no slug (para não ser afetado por mudanças de URL)
        const candidate = `store_${storeId.substring(0, 8)}`;
        console.log('[WhatsApp] Tentando detectar instância:', candidate);
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
            console.log('[WhatsApp] Instância detectada e salva');
          }
        } catch (e) {
          // silencioso
          console.log('[WhatsApp] Nenhuma instância ativa detectada');
        }
      }
    } catch (error) {
      console.error('Error checking instance:', error);
    }
  };

  const checkConnectionStatus = async (instance: string) => {
    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      const time = new Date().toLocaleTimeString('pt-BR');
      setConnectionLogs(prev => [...prev, { time, message, type }]);
    };

    try {
      addLog(`Verificando status da instância: ${instance}`, 'info');
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
        
        addLog(`Status recebido da API: ${data.status}`, 'info');
        
        const connected = isConnectedState(data.status);
        console.log('[WhatsApp] Status interpretado:', {
          rawStatus: data.status,
          isConnected: connected
        });
        
        setConnectionStatus(data.status || 'unknown');
        setIsConnected(connected);
        
        if (connected) {
          addLog('✅ WhatsApp conectado com sucesso!', 'success');
          setQrCode("");
        } else {
          addLog(`⚠️ WhatsApp não conectado. Status: ${data.status}`, 'error');
        }
      } else {
        console.error('[WhatsApp] Erro ao verificar status:', error);
        addLog(`❌ Erro ao verificar status: ${error?.message || 'Erro desconhecido'}`, 'error');
        setConnectionStatus('error');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('[WhatsApp] Exceção ao verificar status:', error);
      addLog(`❌ Exceção ao verificar status: ${error}`, 'error');
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
      // Gerar nome da instância baseado no storeId (UUID), NÃO no slug
      // Isso garante que mudanças no slug da loja não afetem o WhatsApp
      const generatedInstanceName = `store_${storeId.substring(0, 8)}`;
      console.log('[WhatsApp] Criando instância:', { generatedInstanceName, storeId, note: 'Usa storeId, não slug' });
      
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
        
        // Save instance to database (vincula storeId ao instanceName)
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
          {/* Mensagem para funcionários com permissão apenas de visualizar */}
          {isEmployee && canViewWhatsApp && !canEditWhatsApp && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                    Modo Somente Visualização
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Você pode visualizar o status do WhatsApp, mas não pode conectar ou desconectar. 
                    Entre em contato com o proprietário para solicitar permissão de edição.
                  </p>
                </div>
              </div>
            </div>
          )}
          
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
                disabled={isLoading || !phoneNumber || !canEditWhatsApp}
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-8">
                {/* Header decorativo */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                
                <div className="text-center space-y-6">
                  {/* Badge de status */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">Aguardando Conexão</span>
                  </div>

                  {/* Título e descrição */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <QrCode className="w-6 h-6 text-primary" />
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Escaneie o QR Code
                      </h3>
                    </div>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Abra o WhatsApp no seu celular e escaneie este código para conectar sua loja
                    </p>
                  </div>

                  {/* QR Code com moldura moderna */}
                  <div className="relative inline-block">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-2xl" />
                    
                    {/* Container do QR Code */}
                    <div className="relative flex justify-center p-6 bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border-2 border-primary/20">
                      <motion.div
                        animate={{ 
                          boxShadow: [
                            "0 0 0 0 rgba(var(--primary), 0)",
                            "0 0 0 10px rgba(var(--primary), 0.1)",
                            "0 0 0 0 rgba(var(--primary), 0)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="rounded-xl overflow-hidden"
                      >
                        <img 
                          src={qrCode} 
                          alt="QR Code WhatsApp" 
                          className="w-72 h-72 object-contain"
                        />
                      </motion.div>
                    </div>

                    {/* Cantos decorativos */}
                    <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                    <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
                  </div>

                  {/* Instruções passo a passo */}
                  <div className="grid gap-3 max-w-lg mx-auto">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-sm text-left">Abra o <strong>WhatsApp</strong> no seu celular</p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-sm text-left">Toque em <strong>Mais opções</strong> (⋮) → <strong>Aparelhos conectados</strong></p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <p className="text-sm text-left">Toque em <strong>Conectar um aparelho</strong> e escaneie o código acima</p>
                    </div>
                  </div>

                  {/* Nota sobre atualização automática */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>O QR Code é atualizado automaticamente a cada 10 segundos</span>
                  </div>
                </div>
              </div>
            </motion.div>
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

              {/* Sistema de Reconexão Automática */}
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                    <div>
                      <p className="font-semibold text-sm text-green-900 dark:text-green-100">
                        Sistema de Proteção Ativo
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Monitoramento contínuo e reconexão automática
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutoReconnectEnabled(!autoReconnectEnabled)}
                    className={autoReconnectEnabled ? "text-green-600" : "text-muted-foreground"}
                  >
                    {autoReconnectEnabled ? "Ativo" : "Inativo"}
                  </Button>
                </div>
              </div>

              {isReconnecting && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
                    <div>
                      <p className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">
                        Reconectando...
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Tentativa {reconnectAttempts} de 10
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  disabled={isLoading || !canEditWhatsApp}
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

              {connectionLogs.length > 0 && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    <h4 className="font-semibold text-sm">Log de Conexão</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setConnectionLogs([])}
                      className="ml-auto h-6 text-xs"
                    >
                      Limpar
                    </Button>
                  </div>
                  <ScrollArea className="h-[200px] w-full rounded border bg-background p-3">
                    <div className="space-y-2 text-xs font-mono">
                      {connectionLogs.map((log, index) => (
                        <div 
                          key={index} 
                          className={`${
                            log.type === 'error' 
                              ? 'text-destructive' 
                              : log.type === 'success' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-muted-foreground'
                          }`}
                        >
                          <span className="text-muted-foreground">[{log.time}]</span> {log.message}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
