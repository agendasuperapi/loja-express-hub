-- Debug: verificar pedidos #73621315 e #73535988

-- 1. Ver os pedidos e seus cupons
SELECT 
  o.id, 
  o.order_number, 
  o.coupon_code, 
  o.total, 
  o.subtotal,
  o.store_id,
  o.created_at
FROM orders o
WHERE o.order_number LIKE '%73621315%' 
   OR o.order_number LIKE '%73535988%';

-- 2. Verificar se há comissões para esses pedidos
SELECT ae.*, o.order_number
FROM affiliate_earnings ae
JOIN orders o ON o.id = ae.order_id
WHERE o.order_number LIKE '%73621315%' 
   OR o.order_number LIKE '%73535988%';

-- 3. Verificar todos os cupons da afiliada luana (store_affiliate_coupons)
SELECT 
  sac.*,
  c.code,
  sa.affiliate_account_id,
  aa.email
FROM store_affiliate_coupons sac
JOIN coupons c ON c.id = sac.coupon_id
JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE LOWER(aa.email) = 'luanateste04@gmail.com';

-- 4. Verificar todos os cupons da afiliada luana (affiliate_coupons - legado)
SELECT 
  ac.*,
  c.code,
  a.email,
  a.name
FROM affiliate_coupons ac
JOIN coupons c ON c.id = ac.coupon_id
JOIN affiliates a ON a.id = ac.affiliate_id
WHERE LOWER(a.email) = 'luanateste04@gmail.com';

-- 5. Verificar affiliates.coupon_id (campo legado único)
SELECT a.id, a.email, a.coupon_id, c.code
FROM affiliates a
LEFT JOIN coupons c ON c.id = a.coupon_id
WHERE LOWER(a.email) = 'luanateste04@gmail.com';

-- 6. Ver todos os cupons ativos da loja
SELECT id, code, store_id, is_active
FROM coupons
WHERE store_id = '6bc45f44-067a-4008-b6b5-767851233975'
AND is_active = true;
