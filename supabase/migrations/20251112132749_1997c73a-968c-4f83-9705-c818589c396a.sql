-- Fix the trigger function to use SECURITY DEFINER
-- This allows the trigger to bypass RLS when creating store instances

DROP FUNCTION IF EXISTS public.create_evolution_instance_from_order() CASCADE;

CREATE OR REPLACE FUNCTION public.create_evolution_instance_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  -- só cria se não existir
  if not exists (
    select 1 from public.store_instances
    where store_id = new.store_id
  ) then
    insert into public.store_instances (store_id, evolution_instance_id)
    values (
      new.store_id,
      'store_' || substring(new.store_id::text, 1, 8)
    );
  end if;

  return new;
end;
$$;

-- Recreate the trigger
CREATE TRIGGER trg_create_instance_from_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_evolution_instance_from_order();