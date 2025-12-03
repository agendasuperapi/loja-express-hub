-- Trigger para criar comissão de afiliado automaticamente quando um pedido com cupom é criado
-- Este trigger é mais confiável que o código cliente pois roda com permissões de banco

-- Função que processa a comissão
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
  v_commission_amount NUMERIC;
  v_store_affiliate_id UUID;
  v_affiliate_id UUID;
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

  -- Buscar o cupom
  SELECT id, code, discount_type, discount_value 
  INTO v_coupon
  FROM coupons 
  WHERE store_id = NEW.store_id 
  AND UPPER(code) = UPPER(NEW.coupon_code)
  LIMIT 1;

  IF v_coupon.id IS NULL THEN
    RAISE NOTICE '[COMMISSION] Cupom não encontrado: %', NEW.coupon_code;
    RETURN NEW;
  END IF;

  RAISE NOTICE '[COMMISSION] Cupom encontrado: % (ID: %)', v_coupon.code, v_coupon.id;

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
    
    -- Buscar affiliate_id legado pelo email
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

  -- MÉTODO 2: Buscar via store_affiliates.coupon_id (sistema novo - cupom único legado)
  IF v_store_affiliate_id IS NULL THEN
    SELECT 
      sa.id,
      sa.default_commission_type,
      sa.default_commission_value
    INTO v_store_affiliate
    FROM store_affiliates sa
    WHERE sa.coupon_id = v_coupon.id
    AND sa.store_id = NEW.store_id
    AND sa.is_active = true
    LIMIT 1;

    IF v_store_affiliate.id IS NOT NULL THEN
      RAISE NOTICE '[COMMISSION] Afiliado encontrado via store_affiliates.coupon_id: %', v_store_affiliate.id;
      v_store_affiliate_id := v_store_affiliate.id;
      v_commission_type := v_store_affiliate.default_commission_type;
      v_commission_value := v_store_affiliate.default_commission_value;
      
      -- Buscar affiliate_id legado
      SELECT a.id INTO v_affiliate_id
      FROM affiliates a
      JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE LOWER(a.email) = LOWER(aa.email)
      AND a.store_id = NEW.store_id
      LIMIT 1;
    END IF;
  END IF;

  -- MÉTODO 3: Buscar via affiliate_coupons (sistema legado - múltiplos cupons)
  IF v_affiliate_id IS NULL THEN
    SELECT 
      a.id,
      a.default_commission_type,
      a.default_commission_value
    INTO v_affiliate
    FROM affiliate_coupons ac
    JOIN affiliates a ON a.id = ac.affiliate_id
    WHERE ac.coupon_id = v_coupon.id
    AND a.store_id = NEW.store_id
    AND a.is_active = true
    LIMIT 1;

    IF v_affiliate.id IS NOT NULL THEN
      RAISE NOTICE '[COMMISSION] Afiliado encontrado via affiliate_coupons: %', v_affiliate.id;
      v_affiliate_id := v_affiliate.id;
      v_commission_type := v_affiliate.default_commission_type;
      v_commission_value := v_affiliate.default_commission_value;
      
      -- Tentar encontrar store_affiliate correspondente
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
    SELECT 
      a.id,
      a.default_commission_type,
      a.default_commission_value
    INTO v_affiliate
    FROM affiliates a
    WHERE a.coupon_id = v_coupon.id
    AND a.store_id = NEW.store_id
    AND a.is_active = true
    LIMIT 1;

    IF v_affiliate.id IS NOT NULL THEN
      RAISE NOTICE '[COMMISSION] Afiliado encontrado via affiliates.coupon_id: %', v_affiliate.id;
      v_affiliate_id := v_affiliate.id;
      v_commission_type := v_affiliate.default_commission_type;
      v_commission_value := v_affiliate.default_commission_value;
      
      -- Tentar encontrar store_affiliate correspondente
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

  -- Calcular comissão
  IF v_commission_type = 'percentage' THEN
    v_commission_amount := (NEW.subtotal * v_commission_value) / 100;
  ELSE
    v_commission_amount := v_commission_value;
  END IF;

  RAISE NOTICE '[COMMISSION] Calculando comissão: tipo=%, valor=%, subtotal=%, comissão=%', 
    v_commission_type, v_commission_value, NEW.subtotal, v_commission_amount;

  -- Se não temos affiliate_id mas temos store_affiliate_id, criar um placeholder
  IF v_affiliate_id IS NULL AND v_store_affiliate_id IS NOT NULL THEN
    -- Buscar ou criar affiliate_id baseado no store_affiliate
    SELECT a.id INTO v_affiliate_id
    FROM affiliates a
    JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
    JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
    WHERE LOWER(a.email) = LOWER(aa.email)
    AND a.store_id = NEW.store_id
    LIMIT 1;
    
    -- Se ainda não existe, usar o store_affiliate_id como fallback
    IF v_affiliate_id IS NULL THEN
      -- Criar um registro em affiliates baseado no affiliate_account
      INSERT INTO affiliates (
        store_id, name, email, default_commission_type, default_commission_value, is_active
      )
      SELECT 
        NEW.store_id, aa.name, aa.email, sa.default_commission_type, sa.default_commission_value, true
      FROM store_affiliates sa
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE sa.id = v_store_affiliate_id
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_affiliate_id;
      
      -- Se o insert falhou (já existe), buscar novamente
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

  -- Inserir comissão
  INSERT INTO affiliate_earnings (
    affiliate_id,
    store_affiliate_id,
    order_id,
    order_total,
    commission_type,
    commission_value,
    commission_amount,
    status
  ) VALUES (
    v_affiliate_id,
    v_store_affiliate_id,
    NEW.id,
    NEW.total,
    v_commission_type,
    v_commission_value,
    v_commission_amount,
    'pending'
  );

  RAISE NOTICE '[COMMISSION] ✅ Comissão criada! affiliate_id=%, store_affiliate_id=%, amount=%', 
    v_affiliate_id, v_store_affiliate_id, v_commission_amount;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[COMMISSION] ❌ Erro ao processar comissão: % - %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS process_affiliate_commission_trigger ON orders;

-- Criar trigger que executa após insert de pedido
CREATE TRIGGER process_affiliate_commission_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION process_affiliate_commission();

-- Também criar trigger para quando o pedido é atualizado com cupom
DROP TRIGGER IF EXISTS process_affiliate_commission_update_trigger ON orders;

CREATE TRIGGER process_affiliate_commission_update_trigger
  AFTER UPDATE OF coupon_code ON orders
  FOR EACH ROW
  WHEN (OLD.coupon_code IS DISTINCT FROM NEW.coupon_code AND NEW.coupon_code IS NOT NULL)
  EXECUTE FUNCTION process_affiliate_commission();

-- Conceder permissões
GRANT EXECUTE ON FUNCTION process_affiliate_commission() TO authenticated, anon, service_role;
