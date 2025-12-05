-- Fix: Implementar hierarquia de comissões com regras específicas
-- Prioridade: 1. Regra específica do produto, 2. Comissão padrão (se use_default_commission=true), 3. Sem comissão

CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_coupon RECORD;
  v_affiliate RECORD;
  v_store_affiliate RECORD;
  v_commission_type TEXT;
  v_commission_value NUMERIC;
  v_use_default_commission BOOLEAN := true;
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
  -- Novas variáveis para regras específicas
  v_specific_rule RECORD;
  v_item_commission_type TEXT;
  v_item_commission_value NUMERIC;
  v_commission_source TEXT;
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
    COALESCE(sa.use_default_commission, true) as use_default_commission,
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
    RAISE NOTICE '[COMMISSION] Afiliado encontrado via store_affiliate_coupons: %, use_default: %', 
      v_store_affiliate.store_affiliate_id, v_store_affiliate.use_default_commission;
    
    SELECT a.id INTO v_affiliate_id
    FROM affiliates a
    JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
    WHERE aa.id = v_store_affiliate.affiliate_account_id
    AND a.store_id = NEW.store_id
    LIMIT 1;
    
    v_store_affiliate_id := v_store_affiliate.store_affiliate_id;
    v_commission_type := v_store_affiliate.default_commission_type;
    v_commission_value := v_store_affiliate.default_commission_value;
    v_use_default_commission := v_store_affiliate.use_default_commission;
  END IF;

  -- MÉTODO 2: Buscar via store_affiliates.coupon_id
  IF v_store_affiliate_id IS NULL THEN
    SELECT sa.id, sa.default_commission_type, sa.default_commission_value, 
           COALESCE(sa.use_default_commission, true) as use_default_commission
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
      v_use_default_commission := v_store_affiliate.use_default_commission;
      
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
    SELECT a.id, a.default_commission_type, a.default_commission_value,
           COALESCE(a.use_default_commission, true) as use_default_commission
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
      v_use_default_commission := v_affiliate.use_default_commission;
      
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
    SELECT a.id, a.default_commission_type, a.default_commission_value,
           COALESCE(a.use_default_commission, true) as use_default_commission
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
      v_use_default_commission := v_affiliate.use_default_commission;
      
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
      INSERT INTO affiliates (store_id, name, email, default_commission_type, default_commission_value, use_default_commission, is_active)
      SELECT NEW.store_id, aa.name, aa.email, sa.default_commission_type, sa.default_commission_value, 
             COALESCE(sa.use_default_commission, true), true
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

  RAISE NOTICE '[COMMISSION] Afiliado: %, use_default_commission: %, default_type: %, default_value: %',
    v_affiliate_id, v_use_default_commission, v_commission_type, v_commission_value;

  -- Calcular subtotal elegível para desconto
  FOR v_item IN 
    SELECT oi.id, oi.product_id, oi.product_name, oi.subtotal, oi.quantity, oi.unit_price
    FROM order_items oi 
    WHERE oi.order_id = NEW.id AND oi.deleted_at IS NULL
  LOOP
    SELECT category INTO v_product FROM products WHERE id = v_item.product_id;
    
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

  -- Criar registro principal de earnings
  INSERT INTO affiliate_earnings (
    affiliate_id, store_affiliate_id, order_id, order_total,
    commission_type, commission_value, commission_amount, status
  ) VALUES (
    v_affiliate_id, v_store_affiliate_id, NEW.id, NEW.subtotal - COALESCE(NEW.coupon_discount, 0),
    v_commission_type, v_commission_value, 0, 'pending'
  )
  RETURNING id INTO v_earning_id;

  -- Processar cada item com hierarquia de comissão
  FOR v_item IN 
    SELECT oi.id, oi.product_id, oi.product_name, oi.subtotal, oi.quantity, oi.unit_price
    FROM order_items oi 
    WHERE oi.order_id = NEW.id AND oi.deleted_at IS NULL
  LOOP
    SELECT category INTO v_product FROM products WHERE id = v_item.product_id;
    
    -- Verificar elegibilidade para desconto
    v_is_eligible := false;
    IF v_coupon_scope = 'all' THEN
      v_is_eligible := true;
    ELSIF v_coupon_scope = 'category' AND v_product.category IS NOT NULL THEN
      v_is_eligible := v_product.category = ANY(v_category_names);
    ELSIF v_coupon_scope = 'product' THEN
      v_is_eligible := v_item.product_id = ANY(v_product_ids);
    END IF;
    
    -- Calcular desconto do item
    IF v_is_eligible AND v_eligible_subtotal > 0 THEN
      v_item_discount := (v_item.subtotal / v_eligible_subtotal) * COALESCE(NEW.coupon_discount, 0);
    ELSE
      v_item_discount := 0;
    END IF;
    
    v_item_value_with_discount := v_item.subtotal - v_item_discount;
    
    -- ========== HIERARQUIA DE COMISSÃO ==========
    -- 1. Verificar regra específica para o produto
    v_specific_rule := NULL;
    v_commission_source := 'none';
    v_item_commission_type := NULL;
    v_item_commission_value := 0;
    
    IF v_item.product_id IS NOT NULL AND v_affiliate_id IS NOT NULL THEN
      SELECT commission_type, commission_value
      INTO v_specific_rule
      FROM affiliate_commission_rules
      WHERE affiliate_id = v_affiliate_id
      AND product_id = v_item.product_id
      AND applies_to = 'product'
      AND is_active = true
      LIMIT 1;
    END IF;
    
    IF v_specific_rule.commission_type IS NOT NULL THEN
      -- PRIORIDADE 1: Usar regra específica do produto
      v_item_commission_type := v_specific_rule.commission_type;
      v_item_commission_value := v_specific_rule.commission_value;
      v_commission_source := 'specific_product';
      RAISE NOTICE '[COMMISSION] Item %: usando regra ESPECÍFICA do produto (% %)', 
        v_item.product_name, v_item_commission_value, v_item_commission_type;
    ELSIF v_use_default_commission = true THEN
      -- PRIORIDADE 2: Usar comissão padrão (se habilitada)
      v_item_commission_type := v_commission_type;
      v_item_commission_value := v_commission_value;
      v_commission_source := 'default';
      RAISE NOTICE '[COMMISSION] Item %: usando comissão PADRÃO (% %)', 
        v_item.product_name, v_item_commission_value, v_item_commission_type;
    ELSE
      -- PRIORIDADE 3: Sem comissão
      v_item_commission_type := 'percentage';
      v_item_commission_value := 0;
      v_commission_source := 'none';
      RAISE NOTICE '[COMMISSION] Item %: SEM COMISSÃO (use_default=false e sem regra específica)', 
        v_item.product_name;
    END IF;
    
    -- Calcular comissão do item
    IF v_item_commission_value > 0 THEN
      IF v_item_commission_type = 'percentage' THEN
        v_item_commission := (v_item_value_with_discount * v_item_commission_value) / 100;
      ELSE
        -- Comissão fixa: distribuir proporcionalmente
        v_item_commission := (v_item.subtotal / GREATEST(NEW.subtotal, 1)) * v_item_commission_value;
      END IF;
    ELSE
      v_item_commission := 0;
    END IF;
    
    v_total_commission := v_total_commission + v_item_commission;
    
    RAISE NOTICE '[COMMISSION] Item %: source=%, eligible=%, subtotal=%, discount=%, value_after=%, commission_type=%, commission_value=%, item_commission=%', 
      v_item.product_name, v_commission_source, v_is_eligible, v_item.subtotal, v_item_discount, 
      v_item_value_with_discount, v_item_commission_type, v_item_commission_value, v_item_commission;
    
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
      v_item_commission_type, v_item_commission_value, v_item_commission
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
$function$;

-- Recriar os triggers
DROP TRIGGER IF EXISTS process_affiliate_commission_trigger ON public.orders;
DROP TRIGGER IF EXISTS process_affiliate_commission_update_trigger ON public.orders;

CREATE TRIGGER process_affiliate_commission_trigger
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION process_affiliate_commission();

CREATE TRIGGER process_affiliate_commission_update_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.coupon_code IS DISTINCT FROM NEW.coupon_code AND NEW.coupon_code IS NOT NULL)
  EXECUTE FUNCTION process_affiliate_commission();

-- Permissões
GRANT EXECUTE ON FUNCTION public.process_affiliate_commission() TO authenticated, anon, service_role;
