-- Trigger para processar comissão de afiliado automaticamente quando um pedido é criado
-- ATUALIZADO v2: Calcula comissão POR ITEM considerando o escopo do cupom (all, category, product)
-- Itens fora do escopo do cupom pagam comissão sobre valor CHEIO (sem desconto)

CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_coupon RECORD;
  v_affiliate RECORD;
  v_store_affiliate RECORD;
  v_commission_type TEXT;
  v_commission_value NUMERIC;
  v_total_commission NUMERIC := 0;
  v_store_affiliate_id UUID;
  v_affiliate_id UUID;
  v_earning_id UUID;
  v_item RECORD;
  v_product RECORD;
  v_is_eligible BOOLEAN;
  v_item_discount NUMERIC;
  v_item_value_with_discount NUMERIC;
  v_item_commission NUMERIC;
  v_eligible_subtotal NUMERIC := 0;
  v_coupon_scope TEXT;
  v_category_names TEXT[];
  v_product_ids UUID[];
BEGIN
  -- Só processar se tiver cupom
  IF NEW.coupon_code IS NULL OR NEW.coupon_code = '' THEN
    RETURN NEW;
  END IF;

  -- Verificar se já existe comissão para este pedido
  IF EXISTS (SELECT 1 FROM affiliate_earnings WHERE order_id = NEW.id) THEN
    RAISE NOTICE '[COMMISSION] Comissão já existe para pedido %', NEW.id;
    RETURN NEW;
  END IF;

  RAISE NOTICE '[COMMISSION] Processando comissão para pedido % com cupom %', NEW.id, NEW.coupon_code;

  -- Buscar o cupom COM escopo
  SELECT id, code, discount_type, discount_value, applies_to, category_names, product_ids
  INTO v_coupon
  FROM coupons 
  WHERE store_id = NEW.store_id 
  AND UPPER(code) = UPPER(NEW.coupon_code)
  LIMIT 1;

  IF v_coupon.id IS NULL THEN
    RAISE NOTICE '[COMMISSION] Cupom não encontrado: %', NEW.coupon_code;
    RETURN NEW;
  END IF;

  v_coupon_scope := COALESCE(v_coupon.applies_to, 'all');
  v_category_names := COALESCE(v_coupon.category_names, '{}');
  v_product_ids := COALESCE(v_coupon.product_ids, '{}');

  RAISE NOTICE '[COMMISSION] Cupom encontrado: % (ID: %) - Escopo: %, Categorias: %, Produtos: %', 
    v_coupon.code, v_coupon.id, v_coupon_scope, v_category_names, v_product_ids;

  -- MÉTODO 1: Buscar via store_affiliate_coupons (sistema novo - múltiplos cupons)
  SELECT 
    sa.id as store_affiliate_id,
    sa.default_commission_type,
    sa.default_commission_value,
    aa.id as affiliate_account_id
  INTO v_store_affiliate
  FROM store_affiliate_coupons sac
  JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id
  JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
  WHERE sac.coupon_id = v_coupon.id
  AND sa.store_id = NEW.store_id
  AND sa.is_active = true
  LIMIT 1;

  IF v_store_affiliate.store_affiliate_id IS NOT NULL THEN
    RAISE NOTICE '[COMMISSION] Afiliado encontrado via store_affiliate_coupons: %', v_store_affiliate.store_affiliate_id;
    
    SELECT a.id INTO v_affiliate_id
    FROM affiliates a
    JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
    WHERE aa.id = v_store_affiliate.affiliate_account_id
    AND a.store_id = NEW.store_id
    LIMIT 1;
    
    v_store_affiliate_id := v_store_affiliate.store_affiliate_id;
    v_commission_type := v_store_affiliate.default_commission_type;
    v_commission_value := v_store_affiliate.default_commission_value;
  END IF;

  -- MÉTODO 2: Buscar via store_affiliates.coupon_id
  IF v_store_affiliate_id IS NULL THEN
    SELECT sa.id, sa.default_commission_type, sa.default_commission_value
    INTO v_store_affiliate
    FROM store_affiliates sa
    WHERE sa.coupon_id = v_coupon.id
    AND sa.store_id = NEW.store_id
    AND sa.is_active = true
    LIMIT 1;

    IF v_store_affiliate.id IS NOT NULL THEN
      v_store_affiliate_id := v_store_affiliate.id;
      v_commission_type := v_store_affiliate.default_commission_type;
      v_commission_value := v_store_affiliate.default_commission_value;
      
      SELECT a.id INTO v_affiliate_id
      FROM affiliates a
      JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE LOWER(a.email) = LOWER(aa.email)
      AND a.store_id = NEW.store_id
      LIMIT 1;
    END IF;
  END IF;

  -- MÉTODO 3: Buscar via affiliate_coupons (sistema legado)
  IF v_affiliate_id IS NULL THEN
    SELECT a.id, a.default_commission_type, a.default_commission_value
    INTO v_affiliate
    FROM affiliate_coupons ac
    JOIN affiliates a ON a.id = ac.affiliate_id
    WHERE ac.coupon_id = v_coupon.id
    AND a.store_id = NEW.store_id
    AND a.is_active = true
    LIMIT 1;

    IF v_affiliate.id IS NOT NULL THEN
      v_affiliate_id := v_affiliate.id;
      v_commission_type := v_affiliate.default_commission_type;
      v_commission_value := v_affiliate.default_commission_value;
      
      SELECT sa.id INTO v_store_affiliate_id
      FROM store_affiliates sa
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      JOIN affiliates a ON LOWER(a.email) = LOWER(aa.email)
      WHERE a.id = v_affiliate_id
      AND sa.store_id = NEW.store_id
      AND sa.is_active = true
      LIMIT 1;
    END IF;
  END IF;

  -- MÉTODO 4: Buscar via affiliates.coupon_id (sistema legado - cupom único)
  IF v_affiliate_id IS NULL THEN
    SELECT a.id, a.default_commission_type, a.default_commission_value
    INTO v_affiliate
    FROM affiliates a
    WHERE a.coupon_id = v_coupon.id
    AND a.store_id = NEW.store_id
    AND a.is_active = true
    LIMIT 1;

    IF v_affiliate.id IS NOT NULL THEN
      v_affiliate_id := v_affiliate.id;
      v_commission_type := v_affiliate.default_commission_type;
      v_commission_value := v_affiliate.default_commission_value;
      
      SELECT sa.id INTO v_store_affiliate_id
      FROM store_affiliates sa
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE LOWER(aa.email) = (SELECT LOWER(email) FROM affiliates WHERE id = v_affiliate_id)
      AND sa.store_id = NEW.store_id
      AND sa.is_active = true
      LIMIT 1;
    END IF;
  END IF;

  -- Se não encontrou nenhum afiliado, sair
  IF v_affiliate_id IS NULL AND v_store_affiliate_id IS NULL THEN
    RAISE NOTICE '[COMMISSION] Nenhum afiliado encontrado para cupom % no pedido %', NEW.coupon_code, NEW.id;
    RETURN NEW;
  END IF;

  -- Garantir affiliate_id
  IF v_affiliate_id IS NULL AND v_store_affiliate_id IS NOT NULL THEN
    SELECT a.id INTO v_affiliate_id
    FROM affiliates a
    JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
    JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
    WHERE LOWER(a.email) = LOWER(aa.email)
    AND a.store_id = NEW.store_id
    LIMIT 1;
    
    IF v_affiliate_id IS NULL THEN
      INSERT INTO affiliates (store_id, name, email, default_commission_type, default_commission_value, is_active)
      SELECT NEW.store_id, aa.name, aa.email, sa.default_commission_type, sa.default_commission_value, true
      FROM store_affiliates sa
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE sa.id = v_store_affiliate_id
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_affiliate_id;
      
      IF v_affiliate_id IS NULL THEN
        SELECT a.id INTO v_affiliate_id
        FROM affiliates a
        JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
        JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
        WHERE LOWER(a.email) = LOWER(aa.email)
        AND a.store_id = NEW.store_id
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  -- Calcular subtotal elegível para desconto
  FOR v_item IN 
    SELECT oi.id, oi.product_id, oi.product_name, oi.subtotal, oi.quantity, oi.unit_price
    FROM order_items oi 
    WHERE oi.order_id = NEW.id AND oi.deleted_at IS NULL
  LOOP
    -- Buscar categoria do produto
    SELECT category INTO v_product FROM products WHERE id = v_item.product_id;
    
    -- Verificar elegibilidade baseada no escopo do cupom
    v_is_eligible := false;
    IF v_coupon_scope = 'all' THEN
      v_is_eligible := true;
    ELSIF v_coupon_scope = 'category' AND v_product.category IS NOT NULL THEN
      v_is_eligible := v_product.category = ANY(v_category_names);
    ELSIF v_coupon_scope = 'product' THEN
      v_is_eligible := v_item.product_id = ANY(v_product_ids);
    END IF;
    
    IF v_is_eligible THEN
      v_eligible_subtotal := v_eligible_subtotal + v_item.subtotal;
    END IF;
  END LOOP;

  RAISE NOTICE '[COMMISSION] Subtotal elegível para desconto: % de total %', v_eligible_subtotal, NEW.subtotal;

  -- Criar registro principal de earnings (com total 0, será atualizado no final)
  INSERT INTO affiliate_earnings (
    affiliate_id, store_affiliate_id, order_id, order_total,
    commission_type, commission_value, commission_amount, status
  ) VALUES (
    v_affiliate_id, v_store_affiliate_id, NEW.id, NEW.subtotal - COALESCE(NEW.coupon_discount, 0),
    v_commission_type, v_commission_value, 0, 'pending'
  )
  RETURNING id INTO v_earning_id;

  -- Processar cada item individualmente
  FOR v_item IN 
    SELECT oi.id, oi.product_id, oi.product_name, oi.subtotal, oi.quantity, oi.unit_price
    FROM order_items oi 
    WHERE oi.order_id = NEW.id AND oi.deleted_at IS NULL
  LOOP
    -- Buscar categoria do produto
    SELECT category INTO v_product FROM products WHERE id = v_item.product_id;
    
    -- Verificar elegibilidade baseada no escopo do cupom
    v_is_eligible := false;
    IF v_coupon_scope = 'all' THEN
      v_is_eligible := true;
    ELSIF v_coupon_scope = 'category' AND v_product.category IS NOT NULL THEN
      v_is_eligible := v_product.category = ANY(v_category_names);
    ELSIF v_coupon_scope = 'product' THEN
      v_is_eligible := v_item.product_id = ANY(v_product_ids);
    END IF;
    
    -- Calcular desconto do item
    -- Só itens elegíveis recebem desconto proporcional
    IF v_is_eligible AND v_eligible_subtotal > 0 THEN
      v_item_discount := (v_item.subtotal / v_eligible_subtotal) * COALESCE(NEW.coupon_discount, 0);
    ELSE
      v_item_discount := 0;
    END IF;
    
    -- Valor do item para cálculo da comissão
    v_item_value_with_discount := v_item.subtotal - v_item_discount;
    
    -- Calcular comissão sobre o valor (com ou sem desconto)
    IF v_commission_type = 'percentage' THEN
      v_item_commission := (v_item_value_with_discount * v_commission_value) / 100;
    ELSE
      -- Comissão fixa: distribuir proporcionalmente
      v_item_commission := (v_item.subtotal / NEW.subtotal) * v_commission_value;
    END IF;
    
    v_total_commission := v_total_commission + v_item_commission;
    
    RAISE NOTICE '[COMMISSION] Item %: eligible=%, subtotal=%, discount=%, value_after=%, commission=%', 
      v_item.product_name, v_is_eligible, v_item.subtotal, v_item_discount, v_item_value_with_discount, v_item_commission;
    
    -- Inserir detalhes do item
    INSERT INTO affiliate_item_earnings (
      earning_id, order_item_id, product_id, product_name, product_category,
      item_subtotal, item_discount, item_value_with_discount,
      is_coupon_eligible, coupon_scope,
      commission_type, commission_value, commission_amount
    ) VALUES (
      v_earning_id, v_item.id, v_item.product_id, v_item.product_name, v_product.category,
      v_item.subtotal, v_item_discount, v_item_value_with_discount,
      v_is_eligible, v_coupon_scope,
      v_commission_type, v_commission_value, v_item_commission
    );
  END LOOP;

  -- Atualizar total da comissão
  UPDATE affiliate_earnings 
  SET commission_amount = v_total_commission
  WHERE id = v_earning_id;

  RAISE NOTICE '[COMMISSION] ✅ Comissão criada! earning_id=%, affiliate_id=%, store_affiliate_id=%, total=%', 
    v_earning_id, v_affiliate_id, v_store_affiliate_id, v_total_commission;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[COMMISSION] ❌ Erro ao processar comissão: % - %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Remover triggers existentes se houver
DROP TRIGGER IF EXISTS process_affiliate_commission_trigger ON orders;
DROP TRIGGER IF EXISTS process_affiliate_commission_update_trigger ON orders;

-- Criar trigger para INSERT
CREATE TRIGGER process_affiliate_commission_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION process_affiliate_commission();

-- Criar trigger para UPDATE (quando coupon_code é adicionado/alterado)
CREATE TRIGGER process_affiliate_commission_update_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.coupon_code IS DISTINCT FROM NEW.coupon_code AND NEW.coupon_code IS NOT NULL)
  EXECUTE FUNCTION process_affiliate_commission();

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.process_affiliate_commission() TO authenticated, anon, service_role;
