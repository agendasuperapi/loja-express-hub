-- Adicionar política para permitir que lojistas insiram itens em pedidos de sua loja
CREATE POLICY "Store owners can insert order items for their store orders"
ON order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = order_items.order_id
    AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);
