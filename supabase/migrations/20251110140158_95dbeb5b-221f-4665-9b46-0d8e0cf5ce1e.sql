-- Revoke public access to the sensitive user views
-- This forces all access to go through the secure SECURITY DEFINER functions
REVOKE ALL ON public.admin_users FROM PUBLIC;
REVOKE ALL ON public.customer_users FROM PUBLIC;
REVOKE ALL ON public.store_owner_users FROM PUBLIC;

-- Grant access only to authenticated users through the secure functions
-- The functions get_admin_users(), get_customer_users(), and get_store_owner_users()
-- already exist and perform proper authorization checks