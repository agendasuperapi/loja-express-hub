-- Update the default value for uncategorized_display_order to -1 (top position)
ALTER TABLE stores 
ALTER COLUMN uncategorized_display_order SET DEFAULT -1;

-- Update existing stores that have 0 to -1 (to keep them at the top)
UPDATE stores 
SET uncategorized_display_order = -1 
WHERE uncategorized_display_order = 0;
