-- ============================================
-- Script SQL para criar tabela push_subscriptions
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Criar tabela push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_store_id ON public.push_subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_is_active ON public.push_subscriptions(is_active);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Usuários podem gerenciar suas próprias subscriptions
CREATE POLICY "Users can manage own subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);

-- Store owners podem ver subscriptions da sua loja
CREATE POLICY "Store owners can view store subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = push_subscriptions.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Admins podem ver tudo
CREATE POLICY "Admins can view all subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Comentários para documentação
COMMENT ON TABLE public.push_subscriptions IS 'Armazena subscriptions de Web Push Notifications para envio de notificações push';
COMMENT ON COLUMN public.push_subscriptions.subscription IS 'Objeto JSON com dados da subscription (keys, endpoint, etc)';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'URL única do endpoint de push do navegador';
COMMENT ON COLUMN public.push_subscriptions.is_active IS 'Indica se a subscription ainda está válida';
