-- Migration: Create default order statuses for new stores
-- This trigger automatically creates default order status configurations
-- with WhatsApp messages when a new store is created

-- Function to create default order statuses
CREATE OR REPLACE FUNCTION create_default_order_statuses()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default order statuses with WhatsApp messages
  INSERT INTO public.order_status_configs 
    (store_id, status_key, status_label, status_color, display_order, is_active, whatsapp_message)
  VALUES
    -- Status 1: Pendente
    (
      NEW.id,
      'pendente',
      'Pendente',
      '#F59E0B',
      0,
      true,
      E'Olá {{customer_name}}! \n\nRecebemos seu pedido: *{{order_number}}*\n📌*Status: Pendente*\n\n---------------------------------------\n🛍RESUMO DO PEDIDO\n---------------------------------------\n\n{{items}}\n\n🛒 TOTAL PRODUTOS: {{subtotal}}\n🏍 TAXA  ENTREGA : {{delivery_fee}}\n------------------------------\n💵 TOTAL PEDIDO  : {{total}}\n\n💰 *FORMA PAG.: {{payment_method}} *\n\n\n📌 *{{delivery_location_label}}:* \n------------------------------\n*ENDEREÇO:* {{address}}'
    ),
    
    -- Status 2: Separação
    (
      NEW.id,
      'separação',
      'Separação',
      '#3B82F6',
      1,
      true,
      E'Olá {{customer_name}}!\n\nSeu pedido *{{order_number}}* está em separação e logo será enviado.\n\n📦 Estamos preparando tudo com muito cuidado!\n\nQualquer dúvida estamos à disposição.'
    ),
    
    -- Status 3: A caminho
    (
      NEW.id,
      'a_caminho',
      'A Caminho',
      '#10B981',
      2,
      true,
      E'Temos novidades!! 🎉\n\nSeu pedido *{{order_number}}* acaba de ser enviado.\n\n🏍 Você pode rastrear diretamente em nossa loja.\n\nQualquer dúvida estamos à disposição.'
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after store insertion
DROP TRIGGER IF EXISTS create_default_statuses_trigger ON public.stores;
CREATE TRIGGER create_default_statuses_trigger
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION create_default_order_statuses();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_default_order_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_order_statuses() TO service_role;

-- Add default statuses to existing stores that don't have any
DO $$
DECLARE
  store_record RECORD;
  status_count INTEGER;
BEGIN
  FOR store_record IN SELECT id FROM public.stores LOOP
    -- Check if store already has statuses
    SELECT COUNT(*) INTO status_count
    FROM public.order_status_configs
    WHERE store_id = store_record.id;
    
    -- If no statuses exist, create defaults
    IF status_count = 0 THEN
      INSERT INTO public.order_status_configs 
        (store_id, status_key, status_label, status_color, display_order, is_active, whatsapp_message)
      VALUES
        (
          store_record.id,
          'pendente',
          'Pendente',
          '#F59E0B',
          0,
          true,
          E'Olá {{customer_name}}! \n\nRecebemos seu pedido: *{{order_number}}*\n📌*Status: Pendente*\n\n---------------------------------------\n🛍RESUMO DO PEDIDO\n---------------------------------------\n\n{{items}}\n\n🛒 TOTAL PRODUTOS: {{subtotal}}\n🏍 TAXA  ENTREGA : {{delivery_fee}}\n------------------------------\n💵 TOTAL PEDIDO  : {{total}}\n\n💰 *FORMA PAG.: {{payment_method}} *\n\n\n📌 *{{delivery_location_label}}:* \n------------------------------\n*ENDEREÇO:* {{address}}'
        ),
        (
          store_record.id,
          'separação',
          'Separação',
          '#3B82F6',
          1,
          true,
          E'Olá {{customer_name}}!\n\nSeu pedido *{{order_number}}* está em separação e logo será enviado.\n\n📦 Estamos preparando tudo com muito cuidado!\n\nQualquer dúvida estamos à disposição.'
        ),
        (
          store_record.id,
          'a_caminho',
          'A Caminho',
          '#10B981',
          2,
          true,
          E'Temos novidades!! 🎉\n\nSeu pedido *{{order_number}}* acaba de ser enviado.\n\n🏍 Você pode rastrear diretamente em nossa loja.\n\nQualquer dúvida estamos à disposição.'
        );
      
      RAISE NOTICE 'Created default statuses for store %', store_record.id;
    END IF;
  END LOOP;
END $$;
