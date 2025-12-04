-- Tabela para armazenar comissão calculada para CADA item do pedido
-- Permite rastrear exatamente quais itens tiveram desconto do cupom aplicado

CREATE TABLE IF NOT EXISTS public.affiliate_item_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  earning_id UUID NOT NULL REFERENCES affiliate_earnings(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT NOT NULL,
  product_category TEXT,
  
  -- Valores do item
  item_subtotal NUMERIC NOT NULL,
  item_discount NUMERIC DEFAULT 0, -- Desconto aplicado a este item específico
  item_value_with_discount NUMERIC NOT NULL, -- Valor base para comissão
  
  -- Elegibilidade do cupom
  is_coupon_eligible BOOLEAN DEFAULT false, -- Se o item estava no escopo do cupom
  coupon_scope TEXT, -- 'all', 'category', 'product', ou null
  
  -- Comissão
  commission_type TEXT NOT NULL DEFAULT 'percentage',
  commission_value NUMERIC NOT NULL DEFAULT 0, -- Porcentagem ou valor fixo
  commission_amount NUMERIC NOT NULL DEFAULT 0, -- Comissão calculada para este item
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliate_item_earnings_earning_id ON affiliate_item_earnings(earning_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_item_earnings_order_item_id ON affiliate_item_earnings(order_item_id);

-- Habilitar RLS
ALTER TABLE affiliate_item_earnings ENABLE ROW LEVEL SECURITY;

-- Policy: Afiliados podem ver suas comissões por item
CREATE POLICY "Affiliates can view their item earnings"
  ON affiliate_item_earnings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_earnings ae
      JOIN affiliates a ON a.id = ae.affiliate_id
      WHERE ae.id = affiliate_item_earnings.earning_id
      AND a.user_id = auth.uid()
    )
  );

-- Policy: Store owners podem ver comissões de seus afiliados
CREATE POLICY "Store owners can view item earnings"
  ON affiliate_item_earnings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_earnings ae
      JOIN affiliates a ON a.id = ae.affiliate_id
      JOIN stores s ON s.id = a.store_id
      WHERE ae.id = affiliate_item_earnings.earning_id
      AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Policy: Sistema pode gerenciar todas as comissões
CREATE POLICY "System can manage item earnings"
  ON affiliate_item_earnings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE affiliate_item_earnings IS 'Armazena a comissão detalhada por item do pedido, considerando escopo do cupom';
COMMENT ON COLUMN affiliate_item_earnings.is_coupon_eligible IS 'Indica se o item estava no escopo do cupom (se o desconto se aplica a ele)';
COMMENT ON COLUMN affiliate_item_earnings.item_discount IS 'Desconto do cupom aplicado a este item (0 se não elegível)';
COMMENT ON COLUMN affiliate_item_earnings.item_value_with_discount IS 'Valor do item após desconto - base para cálculo da comissão';
