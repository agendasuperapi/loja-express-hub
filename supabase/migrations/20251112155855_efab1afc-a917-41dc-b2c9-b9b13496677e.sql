-- Add pickup address field to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS pickup_address TEXT;