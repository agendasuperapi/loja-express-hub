-- Create function to get all users for admin dashboard
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(
  id uuid,
  email text,
  created_at timestamp with time zone,
  email_confirmed_at timestamp with time zone,
  banned_until timestamp with time zone,
  full_name text,
  phone text,
  role text,
  store_name text,
  orders_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return all users with their information
  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    u.banned_until,
    p.full_name,
    p.phone,
    ur.role::text,
    s.name as store_name,
    COALESCE(o.order_count, 0) as orders_count
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.stores s ON s.owner_id = u.id
  LEFT JOIN (
    SELECT customer_id, COUNT(*) as order_count
    FROM public.orders
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
  ) o ON o.customer_id = u.id
  ORDER BY u.created_at DESC;
END;
$function$;
