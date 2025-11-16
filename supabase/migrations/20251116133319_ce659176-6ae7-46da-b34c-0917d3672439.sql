-- Adicionar campo para controlar exibição do tempo médio de entrega
ALTER TABLE stores ADD COLUMN IF NOT EXISTS show_avg_delivery_time boolean DEFAULT true;