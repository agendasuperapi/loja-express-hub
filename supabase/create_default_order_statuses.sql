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
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}! \n\nRecebemos seu pedido: *{{order_number}}*\n📌*Status: Pendente*\n\n---------------------------------------\n🛍*RESUMO DO PEDIDO*\n---------------------------------------\n\n{{items}}\n\n🛒 TOTAL PRODUTOS: {{subtotal}}\n🏍 TAXA  ENTREGA : {{delivery_fee}}\n------------------------------\n💵 TOTAL PEDIDO  : {{total}}\n\n💰 FORMA PAG.: {{payment_method}}\n\n📌 *{{delivery_type}}:*\n {{delivery_address}}\n {{pickup_address}}\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}\n\n*Salve nosso número nos seus contatos para não perder nenhuma atualização e novidades.*'
    ),
    
    -- Status 2: Confirmado
    (
      NEW.id,
      'confirmado',
      'Confirmado',
      '#3B82F6',
      1,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nSeu pedido {{order_number}} foi confirmado com sucesso!\nJá estamos preparando tudo com carinho.\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}'
    ),
    
    -- Status 3: Preparando
    (
      NEW.id,
      'preparando',
      'Preparando',
      '#9333EA',
      2,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nSeu pedido #{{order_number}} está sendo preparado!\n\n🛍️ *VISITE NOSSA VITRINE DE OFERTAS*\n{{store_url}}'
    ),
    
    -- Status 4: Pronto / Aguardando Retirada
    (
      NEW.id,
      'pronto',
      'Aguardando Retirada',
      '#10B981',
      3,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nSeu pedido #{{order_number}} Está Aguardando retirada.\n\n📍*ENDEREÇO RETIRADA*\n• {{pickup_address}} -\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}'
    ),
    
    -- Status 5: Saiu para Entrega
    (
      NEW.id,
      'saiu_para_entrega',
      'Saiu para Entrega',
      '#06B6D4',
      4,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nBoa notícia seu pedido #{{order_number}} saiu para entrega!\nChegará em breve.\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}'
    ),
    
    -- Status 6: Entregue
    (
      NEW.id,
      'entregue',
      'Entregue',
      '#10B981',
      5,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}!\nSeu pedido #{{order_number}} foi entregue! Obrigado pela preferência!\n\n🛍️ Visite nosso Site e não perca as promoções do dia.\n\nAcesse: {{store_url}}'
    ),
    
    -- Status 7: Cancelado
    (
      NEW.id,
      'cancelado',
      'Cancelado',
      '#EF4444',
      6,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nPedido #{{order_number}} foi cancelado. \nEntre em contato para mais informações.'
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
          E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}! \n\nRecebemos seu pedido: *{{order_number}}*\n📌*Status: Pendente*\n\n---------------------------------------\n🛍*RESUMO DO PEDIDO*\n---------------------------------------\n\n{{items}}\n\n🛒 TOTAL PRODUTOS: {{subtotal}}\n🏍 TAXA  ENTREGA : {{delivery_fee}}\n------------------------------\n💵 TOTAL PEDIDO  : {{total}}\n\n💰 FORMA PAG.: {{payment_method}}\n\n📌 *{{delivery_type}}:*\n {{delivery_address}}\n {{pickup_address}}\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}\n\n*Salve nosso número nos seus contatos para não perder nenhuma atualização e novidades.*'
        ),
        (
          store_record.id,
          'confirmado',
          'Confirmado',
          '#3B82F6',
          1,
          true,
          E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nSeu pedido {{order_number}} foi confirmado com sucesso!\nJá estamos preparando tudo com carinho.\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}'
        ),
        (
          store_record.id,
          'preparando',
          'Preparando',
          '#9333EA',
          2,
          true,
          E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nSeu pedido #{{order_number}} está sendo preparado!\n\n🛍️ *VISITE NOSSA VITRINE DE OFERTAS*\n{{store_url}}'
        ),
        (
          store_record.id,
          'pronto',
          'Aguardando Retirada',
          '#10B981',
          3,
          true,
          E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nSeu pedido #{{order_number}} Está Aguardando retirada.\n\n📍*ENDEREÇO RETIRADA*\n• {{pickup_address}} -\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}'
        ),
        (
          store_record.id,
          'saiu_para_entrega',
          'Saiu para Entrega',
          '#06B6D4',
          4,
          true,
          E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nBoa notícia seu pedido #{{order_number}} saiu para entrega!\nChegará em breve.\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}'
        ),
        (
          store_record.id,
          'entregue',
          'Entregue',
          '#10B981',
          5,
          true,
          E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}!\nSeu pedido #{{order_number}} foi entregue! Obrigado pela preferência!\n\n🛍️ Visite nosso Site e não perca as promoções do dia.\n\nAcesse: {{store_url}}'
        ),
        (
          store_record.id,
          'cancelado',
          'Cancelado',
          '#EF4444',
          6,
          true,
          E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nPedido #{{order_number}} foi cancelado. \nEntre em contato para mais informações.'
        );
      
      RAISE NOTICE 'Created default statuses for store %', store_record.id;
    END IF;
  END LOOP;
END $$;
