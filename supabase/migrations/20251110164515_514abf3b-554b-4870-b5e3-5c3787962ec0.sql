-- Add WhatsApp integration columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS whatsapp_instance TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;