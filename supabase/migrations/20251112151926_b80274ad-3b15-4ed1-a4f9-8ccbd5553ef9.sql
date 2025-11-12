-- Create RPC functions for admin user management
-- All functions require admin role and use SECURITY DEFINER for auth.users access

-- Function to get users with 'customer' role
CREATE OR REPLACE FUNCTION public.get_customer_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return users with customer role
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at,
    p.full_name,
    p.phone
  FROM auth.users u
  INNER JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ur.role = 'customer'
  ORDER BY u.created_at DESC;
END;
$$;

-- Function to get users with 'store_owner' role
CREATE OR REPLACE FUNCTION public.get_store_owner_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return users with store_owner role
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at,
    p.full_name,
    p.phone
  FROM auth.users u
  INNER JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ur.role = 'store_owner'
  ORDER BY u.created_at DESC;
END;
$$;

-- Function to get users with 'admin' role
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return users with admin role
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at,
    p.full_name,
    p.phone
  FROM auth.users u
  INNER JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ur.role = 'admin'
  ORDER BY u.created_at DESC;
END;
$$;

-- Function to confirm a user's email
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Validate input
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;

  -- Update email_confirmed_at in auth.users
  UPDATE auth.users
  SET 
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE id = user_id;

  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;