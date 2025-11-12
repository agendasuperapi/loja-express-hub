-- Create or replace order_complete_view
-- Execute this in Supabase SQL Editor

DROP VIEW IF EXISTS public.order_complete_view;

CREATE VIEW public.order_complete_view AS
SELECT 
  o.id,
  o.customer_id,
  o.store_id,
  o.status,
  o.total,
  o.subtotal,
  o.delivery_fee,
  o.change_amount,
  o.created_at,
  o.updated_at,
  o.notes,
  o.delivery_complement,
  o.delivery_neighborhood,
  o.delivery_number,
  o.delivery_street,
  o.customer_phone,
  o.customer_name,
  o.payment_method,
  o.delivery_type,
  o.order_number,
  COALESCE(
    json_agg(
      json_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'product_name', oi.product_name,
        'product_slug', oi.product_slug,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'subtotal', oi.subtotal,
        'observation', oi.observation,
        'flavors', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'flavor_name', oif.flavor_name,
              'flavor_price', oif.flavor_price
            )
          ), '[]'::json)
          FROM order_item_flavors oif
          WHERE oif.order_item_id = oi.id
        ),
        'addons', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'addon_name', oia.addon_name,
              'addon_price', oia.addon_price
            )
          ), '[]'::json)
          FROM order_item_addons oia
          WHERE oia.order_item_id = oi.id
        )
      )
    ) FILTER (WHERE oi.id IS NOT NULL),
    '[]'::json
  ) AS items
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id;
