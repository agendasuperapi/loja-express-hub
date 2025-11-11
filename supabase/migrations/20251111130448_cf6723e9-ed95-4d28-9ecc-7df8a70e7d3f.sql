-- Add notes column to orders table if it doesn't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';