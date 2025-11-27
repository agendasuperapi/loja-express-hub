-- Ensure the trigger function exists and is up to date
CREATE OR REPLACE FUNCTION create_default_order_statuses()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default order statuses with WhatsApp messages
  INSERT INTO public.order_status_configs 
    (store_id, status_key, status_label, status_color, display_order, is_active, whatsapp_message, show_for_delivery, show_for_pickup)
  VALUES
    -- Status 1: Pendente
    (
      NEW.id,
      'pendente',
      'Pendente',
      '#F59E0B',
      0,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}! \n\nRecebemos seu pedido: *{{order_number}}*\n📌*Status: Pendente*\n\n---------------------------------------\n🛍*RESUMO DO PEDIDO*\n---------------------------------------\n\n{{items}}\n\n🛒 TOTAL PRODUTOS: {{subtotal}}\n🏍 TAXA  ENTREGA : {{delivery_fee}}\n------------------------------\n💵 TOTAL PEDIDO  : {{total}}\n\n💰 FORMA PAG.: {{payment_method}}\n\n📌 *{{delivery_type}}:*\n {{delivery_address}}\n {{pickup_address}}\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}\n\n*Salve nosso número nos seus contatos para não perder nenhuma atualização e novidades.*',
      true,
      true
    ),
    
    -- Status 2: Confirmado
    (
      NEW.id,
      'confirmado',
      'Confirmado',
      '#3B82F6',
      1,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nSeu pedido {{order_number}} foi confirmado com sucesso!\nJá estamos preparando tudo com carinho.\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}',
      true,
      true
    ),
    
    -- Status 3: Preparando
    (
      NEW.id,
      'preparando',
      'Preparando',
      '#9333EA',
      2,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nSeu pedido #{{order_number}} está sendo preparado!\n\n🛍️ *VISITE NOSSA VITRINE DE OFERTAS*\n{{store_url}}',
      true,
      true
    ),
    
    -- Status 4: Aguardando Retirada (somente para retirada)
    (
      NEW.id,
      'ready',
      'Aguardando Retirada',
      '#10B981',
      3,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nSeu pedido #{{order_number}} Está Aguardando retirada.\n\n📍*ENDEREÇO RETIRADA*\n• {{pickup_address}} -\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}',
      false,
      true
    ),
    
    -- Status 5: Saiu para Entrega (somente para entrega)
    (
      NEW.id,
      'out_for_delivery',
      'Saiu para Entrega',
      '#06B6D4',
      4,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nBoa notícia seu pedido #{{order_number}} saiu para entrega!\nChegará em breve.\n\n🛍️ *VISITE NOSSO SITE:*\n{{store_url}}',
      true,
      false
    ),
    
    -- Status 6: Entregue
    (
      NEW.id,
      'entregue',
      'Entregue',
      '#10B981',
      5,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}!\nSeu pedido #{{order_number}} foi entregue! Obrigado pela preferência!\n\n🛍️ Visite nosso Site e não perca as promoções do dia.\n\nAcesse: {{store_url}}',
      true,
      true
    ),
    
    -- Status 7: Cancelado
    (
      NEW.id,
      'cancelado',
      'Cancelado',
      '#EF4444',
      6,
      true,
      E'*PEDIDO {{store_name}}.*\n\nOlá {{customer_name}}\nPedido #{{order_number}} foi cancelado. \nEntre em contato para mais informações.\n\n🛍️ Visite nosso Site e faça um novo pedido.\n\nAcesse: {{store_url}}',
      true,
      true
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS create_default_statuses_trigger ON public.stores;
CREATE TRIGGER create_default_statuses_trigger
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION create_default_order_statuses();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_default_order_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_order_statuses() TO service_role;
