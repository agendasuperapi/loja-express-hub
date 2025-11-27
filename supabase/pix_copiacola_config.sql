-- Add PIX Copia e Cola button configuration to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS pix_copiacola_button_text TEXT DEFAULT '📋 COPIAR CÓDIGO PIX';

-- Add comment to document the feature
COMMENT ON COLUMN public.stores.pix_copiacola_button_text IS 'Text displayed on the PIX copy-paste button in the orders page';
