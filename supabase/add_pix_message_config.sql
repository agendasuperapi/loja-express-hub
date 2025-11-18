-- Add PIX message configuration fields to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS pix_message_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pix_message_title TEXT DEFAULT '💳 Pagamento via PIX',
ADD COLUMN IF NOT EXISTS pix_message_description TEXT DEFAULT 'Clique no botão abaixo para copiar o código PIX, favor enviar o comprovante após o pagamento.',
ADD COLUMN IF NOT EXISTS pix_message_footer TEXT DEFAULT 'Obrigado pela preferência!',
ADD COLUMN IF NOT EXISTS pix_message_button_text TEXT DEFAULT '📋 COPIAR CHAVE PIX';

-- Add comment to document the feature
COMMENT ON COLUMN public.stores.pix_message_enabled IS 'Enable automatic PIX button message after order confirmation';
COMMENT ON COLUMN public.stores.pix_message_title IS 'Title of the PIX button message';
COMMENT ON COLUMN public.stores.pix_message_description IS 'Description text of the PIX button message';
COMMENT ON COLUMN public.stores.pix_message_footer IS 'Footer text of the PIX button message';
COMMENT ON COLUMN public.stores.pix_message_button_text IS 'Text displayed on the copy PIX button';
