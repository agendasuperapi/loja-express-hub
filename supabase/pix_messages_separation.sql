-- =====================================================
-- Migration: Separate PIX Message Configurations
-- Description: Adiciona campos separados para mensagem
--              de PIX chave fixa vs PIX copia e cola gerado
-- =====================================================

-- 1. ADD COLUMNS FOR PIX COPIA E COLA MESSAGE
-- =====================================================
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pix_copiacola_message_title TEXT DEFAULT '💳 Código PIX Gerado',
  ADD COLUMN IF NOT EXISTS pix_copiacola_message_description TEXT DEFAULT 'Use o código PIX Copia e Cola gerado automaticamente para este pedido. Clique no botão abaixo para copiar.',
  ADD COLUMN IF NOT EXISTS pix_copiacola_message_footer TEXT DEFAULT 'Código válido para este pedido específico.',
  ADD COLUMN IF NOT EXISTS pix_copiacola_message_button_text TEXT DEFAULT '📋 COPIAR CÓDIGO PIX',
  ADD COLUMN IF NOT EXISTS pix_copiacola_message_enabled BOOLEAN DEFAULT false;

-- 2. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN public.stores.pix_message_title IS 'Título da mensagem PIX com chave fixa enviada via WhatsApp';
COMMENT ON COLUMN public.stores.pix_message_description IS 'Descrição da mensagem PIX com chave fixa enviada via WhatsApp';
COMMENT ON COLUMN public.stores.pix_message_footer IS 'Rodapé da mensagem PIX com chave fixa enviada via WhatsApp';
COMMENT ON COLUMN public.stores.pix_message_button_text IS 'Texto do botão de copiar chave PIX fixa no WhatsApp';
COMMENT ON COLUMN public.stores.pix_message_enabled IS 'Ativa/desativa envio automático da mensagem PIX com chave fixa';

COMMENT ON COLUMN public.stores.pix_copiacola_message_title IS 'Título da mensagem PIX Copia e Cola gerado enviada via WhatsApp';
COMMENT ON COLUMN public.stores.pix_copiacola_message_description IS 'Descrição da mensagem PIX Copia e Cola gerado enviada via WhatsApp';
COMMENT ON COLUMN public.stores.pix_copiacola_message_footer IS 'Rodapé da mensagem PIX Copia e Cola gerado enviada via WhatsApp';
COMMENT ON COLUMN public.stores.pix_copiacola_message_button_text IS 'Texto do botão de copiar código PIX gerado no WhatsApp';
COMMENT ON COLUMN public.stores.pix_copiacola_message_enabled IS 'Ativa/desativa envio automático da mensagem PIX Copia e Cola gerado';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
