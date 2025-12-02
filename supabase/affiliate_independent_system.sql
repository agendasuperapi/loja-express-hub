-- Sistema de Afiliados Independente - Migration (Idempotente)
-- Autenticação separada, múltiplas lojas
-- Este script pode ser executado múltiplas vezes com segurança

-- 1. Criar tabela de contas de afiliados (autenticação separada)
CREATE TABLE IF NOT EXISTS public.affiliate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  cpf_cnpj TEXT,
  pix_key TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para affiliate_accounts
CREATE INDEX IF NOT EXISTS idx_affiliate_accounts_email ON public.affiliate_accounts(email);
CREATE INDEX IF NOT EXISTS idx_affiliate_accounts_verification_token ON public.affiliate_accounts(verification_token);
CREATE INDEX IF NOT EXISTS idx_affiliate_accounts_reset_token ON public.affiliate_accounts(reset_token);

-- 2. Criar tabela de junção store_affiliates (N:N entre afiliados e lojas)
CREATE TABLE IF NOT EXISTS public.store_affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_account_id UUID NOT NULL REFERENCES public.affiliate_accounts(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  commission_enabled BOOLEAN DEFAULT true,
  default_commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (default_commission_type IN ('percentage', 'fixed')),
  default_commission_value NUMERIC NOT NULL DEFAULT 0,
  invite_token TEXT,
  invite_expires TIMESTAMPTZ,
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(affiliate_account_id, store_id)
);

-- Índices para store_affiliates
CREATE INDEX IF NOT EXISTS idx_store_affiliates_account ON public.store_affiliates(affiliate_account_id);
CREATE INDEX IF NOT EXISTS idx_store_affiliates_store ON public.store_affiliates(store_id);
CREATE INDEX IF NOT EXISTS idx_store_affiliates_invite_token ON public.store_affiliates(invite_token);
CREATE INDEX IF NOT EXISTS idx_store_affiliates_status ON public.store_affiliates(status);

-- 3. Criar tabela de sessões de afiliados
CREATE TABLE IF NOT EXISTS public.affiliate_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_account_id UUID NOT NULL REFERENCES public.affiliate_accounts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_affiliate_sessions_token ON public.affiliate_sessions(token);
CREATE INDEX IF NOT EXISTS idx_affiliate_sessions_account ON public.affiliate_sessions(affiliate_account_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sessions_expires ON public.affiliate_sessions(expires_at);

-- 4. Adicionar coluna store_affiliate_id na tabela affiliate_earnings (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'affiliate_earnings' 
    AND column_name = 'store_affiliate_id'
  ) THEN
    ALTER TABLE public.affiliate_earnings 
    ADD COLUMN store_affiliate_id UUID REFERENCES public.store_affiliates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_affiliate_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS affiliate_accounts_updated_at ON public.affiliate_accounts;
CREATE TRIGGER affiliate_accounts_updated_at
  BEFORE UPDATE ON public.affiliate_accounts
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_accounts_updated_at();

DROP TRIGGER IF EXISTS store_affiliates_updated_at ON public.store_affiliates;
CREATE TRIGGER store_affiliates_updated_at
  BEFORE UPDATE ON public.store_affiliates
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_accounts_updated_at();

-- 6. RLS Policies (com DROP IF EXISTS para evitar duplicação)

-- affiliate_accounts
ALTER TABLE public.affiliate_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can check affiliate accounts for login" ON public.affiliate_accounts;
CREATE POLICY "Public can check affiliate accounts for login" ON public.affiliate_accounts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage affiliate accounts" ON public.affiliate_accounts;
CREATE POLICY "Service role can manage affiliate accounts" ON public.affiliate_accounts
  FOR ALL USING (true);

-- store_affiliates
ALTER TABLE public.store_affiliates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can manage their affiliates" ON public.store_affiliates;
CREATE POLICY "Store owners can manage their affiliates" ON public.store_affiliates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_affiliates.store_id
      AND (stores.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

DROP POLICY IF EXISTS "Anyone can view active store affiliates" ON public.store_affiliates;
CREATE POLICY "Anyone can view active store affiliates" ON public.store_affiliates
  FOR SELECT USING (status = 'active' AND is_active = true);

DROP POLICY IF EXISTS "Affiliates can view their own store affiliations" ON public.store_affiliates;
CREATE POLICY "Affiliates can view their own store affiliations" ON public.store_affiliates
  FOR SELECT USING (true);

-- affiliate_sessions
ALTER TABLE public.affiliate_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage affiliate sessions" ON public.affiliate_sessions;
CREATE POLICY "Service role can manage affiliate sessions" ON public.affiliate_sessions
  FOR ALL USING (true);

-- 7. Função para validar sessão de afiliado
CREATE OR REPLACE FUNCTION public.validate_affiliate_session(session_token TEXT)
RETURNS TABLE (
  affiliate_id UUID,
  email TEXT,
  name TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aa.id,
    aa.email,
    aa.name,
    (s.expires_at > now() AND aa.is_active) as is_valid
  FROM affiliate_sessions s
  JOIN affiliate_accounts aa ON aa.id = s.affiliate_account_id
  WHERE s.token = session_token
  LIMIT 1;
  
  -- Atualizar last_used_at
  UPDATE affiliate_sessions 
  SET last_used_at = now() 
  WHERE token = session_token AND expires_at > now();
END;
$$;

-- 8. Função para obter lojas do afiliado
CREATE OR REPLACE FUNCTION public.get_affiliate_stores(p_affiliate_account_id UUID)
RETURNS TABLE (
  store_affiliate_id UUID,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  store_logo TEXT,
  commission_type TEXT,
  commission_value NUMERIC,
  status TEXT,
  coupon_code TEXT,
  coupon_discount_type TEXT,
  coupon_discount_value NUMERIC,
  total_sales NUMERIC,
  total_commission NUMERIC,
  pending_commission NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id as store_affiliate_id,
    s.id as store_id,
    s.name as store_name,
    s.slug as store_slug,
    s.logo_url as store_logo,
    sa.default_commission_type as commission_type,
    sa.default_commission_value as commission_value,
    sa.status,
    c.code as coupon_code,
    c.discount_type::TEXT as coupon_discount_type,
    c.discount_value as coupon_discount_value,
    COALESCE(SUM(ae.order_total), 0) as total_sales,
    COALESCE(SUM(ae.commission_amount), 0) as total_commission,
    COALESCE(SUM(CASE WHEN ae.status = 'pending' THEN ae.commission_amount ELSE 0 END), 0) as pending_commission
  FROM store_affiliates sa
  JOIN stores s ON s.id = sa.store_id
  LEFT JOIN coupons c ON c.id = sa.coupon_id
  LEFT JOIN affiliate_earnings ae ON ae.store_affiliate_id = sa.id
  WHERE sa.affiliate_account_id = p_affiliate_account_id
  AND sa.is_active = true
  GROUP BY sa.id, s.id, s.name, s.slug, s.logo_url, sa.default_commission_type, sa.default_commission_value, sa.status, c.code, c.discount_type, c.discount_value;
END;
$$;

-- 9. Função para estatísticas consolidadas do afiliado
CREATE OR REPLACE FUNCTION public.get_affiliate_consolidated_stats(p_affiliate_account_id UUID)
RETURNS TABLE (
  total_stores BIGINT,
  total_sales NUMERIC,
  total_commission NUMERIC,
  pending_commission NUMERIC,
  paid_commission NUMERIC,
  total_orders BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT sa.store_id) as total_stores,
    COALESCE(SUM(ae.order_total), 0) as total_sales,
    COALESCE(SUM(ae.commission_amount), 0) as total_commission,
    COALESCE(SUM(CASE WHEN ae.status = 'pending' THEN ae.commission_amount ELSE 0 END), 0) as pending_commission,
    COALESCE(SUM(CASE WHEN ae.status = 'paid' THEN ae.commission_amount ELSE 0 END), 0) as paid_commission,
    COUNT(DISTINCT ae.order_id) as total_orders
  FROM store_affiliates sa
  LEFT JOIN affiliate_earnings ae ON ae.store_affiliate_id = sa.id
  WHERE sa.affiliate_account_id = p_affiliate_account_id
  AND sa.is_active = true;
END;
$$;

-- 10. Limpar sessões expiradas (pode ser chamado periodicamente)
CREATE OR REPLACE FUNCTION public.cleanup_expired_affiliate_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM affiliate_sessions WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 11. Função para buscar conta de afiliado por email (para login)
CREATE OR REPLACE FUNCTION public.get_affiliate_account_by_email(p_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  password_hash TEXT,
  is_active BOOLEAN,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aa.id,
    aa.email,
    aa.name,
    aa.password_hash,
    aa.is_active,
    aa.is_verified
  FROM affiliate_accounts aa
  WHERE LOWER(aa.email) = LOWER(p_email)
  LIMIT 1;
END;
$$;

-- 12. Função para criar sessão de afiliado
CREATE OR REPLACE FUNCTION public.create_affiliate_session(
  p_affiliate_account_id UUID,
  p_token TEXT,
  p_expires_at TIMESTAMPTZ,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO affiliate_sessions (affiliate_account_id, token, expires_at, user_agent, ip_address)
  VALUES (p_affiliate_account_id, p_token, p_expires_at, p_user_agent, p_ip_address)
  RETURNING id INTO session_id;
  
  -- Atualizar last_login na conta
  UPDATE affiliate_accounts SET last_login = now() WHERE id = p_affiliate_account_id;
  
  RETURN session_id;
END;
$$;

-- 13. Função para invalidar sessão (logout)
CREATE OR REPLACE FUNCTION public.invalidate_affiliate_session(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM affiliate_sessions WHERE token = p_token;
  RETURN FOUND;
END;
$$;

-- 14. Grant permissions para funções serem chamadas por anon
GRANT EXECUTE ON FUNCTION public.validate_affiliate_session(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_affiliate_stores(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_affiliate_consolidated_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_affiliate_sessions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_affiliate_account_by_email(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_affiliate_session(UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invalidate_affiliate_session(TEXT) TO anon, authenticated;
