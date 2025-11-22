-- Add delivery_city column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_city TEXT;

-- Add comment
COMMENT ON COLUMN orders.delivery_city IS 'City for delivery orders';
