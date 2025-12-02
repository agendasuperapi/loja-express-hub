-- Sistema de Afiliados - Migration
-- Execute este SQL no Supabase SQL Editor

-- Tabela de afiliados
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  cpf_cnpj text,
  pix_key text,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  commission_enabled boolean NOT NULL DEFAULT true,
  default_commission_type text NOT NULL DEFAULT 'percentage' CHECK (default_commission_type IN ('percentage', 'fixed')),
  default_commission_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_affiliates_store_id ON public.affiliates(store_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_coupon_id ON public.affiliates(coupon_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON public.affiliates(email);

-- Tabela de regras de comissão por categoria/produto
CREATE TABLE IF NOT EXISTS public.affiliate_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  commission_type text NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value numeric NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'category', 'product')),
  category_name text,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commission_rules_affiliate_id ON public.affiliate_commission_rules(affiliate_id);

-- Tabela de ganhos/comissões
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  order_total numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  commission_type text NOT NULL DEFAULT 'percentage',
  commission_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_affiliate_id ON public.affiliate_earnings(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_order_id ON public.affiliate_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_status ON public.affiliate_earnings(status);

-- Tabela de pagamentos aos afiliados
CREATE TABLE IF NOT EXISTS public.affiliate_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  payment_proof text,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payments_affiliate_id ON public.affiliate_payments(affiliate_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_affiliates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS affiliates_updated_at ON public.affiliates;
CREATE TRIGGER affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION update_affiliates_updated_at();

DROP TRIGGER IF EXISTS affiliate_commission_rules_updated_at ON public.affiliate_commission_rules;
CREATE TRIGGER affiliate_commission_rules_updated_at
  BEFORE UPDATE ON public.affiliate_commission_rules
  FOR EACH ROW EXECUTE FUNCTION update_affiliates_updated_at();

-- RLS Policies
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para affiliates
CREATE POLICY "Store owners can manage affiliates" ON public.affiliates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = affiliates.store_id 
      AND (stores.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Affiliates can view their own data" ON public.affiliates
  FOR SELECT USING (user_id = auth.uid());

-- Políticas para affiliate_commission_rules
CREATE POLICY "Store owners can manage commission rules" ON public.affiliate_commission_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      JOIN stores s ON s.id = a.store_id
      WHERE a.id = affiliate_commission_rules.affiliate_id
      AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Affiliates can view their commission rules" ON public.affiliate_commission_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_commission_rules.affiliate_id
      AND a.user_id = auth.uid()
    )
  );

-- Políticas para affiliate_earnings
CREATE POLICY "Store owners can manage earnings" ON public.affiliate_earnings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      JOIN stores s ON s.id = a.store_id
      WHERE a.id = affiliate_earnings.affiliate_id
      AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Affiliates can view their earnings" ON public.affiliate_earnings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_earnings.affiliate_id
      AND a.user_id = auth.uid()
    )
  );

-- Políticas para affiliate_payments
CREATE POLICY "Store owners can manage payments" ON public.affiliate_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      JOIN stores s ON s.id = a.store_id
      WHERE a.id = affiliate_payments.affiliate_id
      AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Affiliates can view their payments" ON public.affiliate_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_payments.affiliate_id
      AND a.user_id = auth.uid()
    )
  );
