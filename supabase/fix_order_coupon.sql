-- Atualizar pedido #96187023 com dados do cupom promo10
UPDATE orders
SET 
  coupon_code = 'promo10',
  coupon_discount = 6.90,
  total = subtotal + delivery_fee - 6.90,
  updated_at = NOW()
WHERE order_number = '#96187023';
