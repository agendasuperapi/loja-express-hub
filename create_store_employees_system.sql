-- =============================================
-- SISTEMA DE FUNCIONÁRIOS E PERMISSÕES
-- =============================================

-- Tabela de funcionários vinculados às lojas
CREATE TABLE IF NOT EXISTS public.store_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  employee_phone TEXT,
  position TEXT, -- Cargo (ex: Gerente, Atendente, Caixa)
  is_active BOOLEAN DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{
    "orders": {"view": true, "create": true, "update": true, "delete": false},
    "products": {"view": true, "create": false, "update": false, "delete": false},
    "categories": {"view": true, "create": false, "update": false, "delete": false},
    "coupons": {"view": true, "create": false, "update": false, "delete": false},
    "reports": {"view": false},
    "settings": {"view": false, "update": false},
    "employees": {"view": false, "create": false, "update": false, "delete": false}
  }'::jsonb,
  notes TEXT, -- Observações sobre o funcionário
  hired_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(store_id, user_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_store_employees_store_id ON public.store_employees(store_id);
CREATE INDEX IF NOT EXISTS idx_store_employees_user_id ON public.store_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_store_employees_email ON public.store_employees(employee_email);
CREATE INDEX IF NOT EXISTS idx_store_employees_active ON public.store_employees(is_active);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_store_employees_updated_at
  BEFORE UPDATE ON public.store_employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNÇÕES AUXILIARES
-- =============================================

-- Função para verificar se um usuário é funcionário de uma loja
CREATE OR REPLACE FUNCTION public.is_store_employee(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_employees
    WHERE user_id = _user_id
      AND store_id = _store_id
      AND is_active = true
  )
$$;

-- Função para obter permissões de um funcionário
CREATE OR REPLACE FUNCTION public.get_employee_permissions(_user_id UUID, _store_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT permissions
  FROM public.store_employees
  WHERE user_id = _user_id
    AND store_id = _store_id
    AND is_active = true
  LIMIT 1
$$;

-- Função para verificar se funcionário tem permissão específica
CREATE OR REPLACE FUNCTION public.employee_has_permission(
  _user_id UUID,
  _store_id UUID,
  _resource TEXT,
  _action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perms JSONB;
BEGIN
  SELECT permissions INTO perms
  FROM public.store_employees
  WHERE user_id = _user_id
    AND store_id = _store_id
    AND is_active = true;
  
  IF perms IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE((perms -> _resource ->> _action)::boolean, false);
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.store_employees ENABLE ROW LEVEL SECURITY;

-- Donos de loja e admins podem ver todos os funcionários da sua loja
CREATE POLICY "Store owners can view their employees"
ON public.store_employees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = store_employees.store_id
    AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
  OR user_id = auth.uid() -- Funcionário pode ver seu próprio registro
);

-- Donos de loja e admins podem inserir funcionários
CREATE POLICY "Store owners can insert employees"
ON public.store_employees
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = store_employees.store_id
    AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Donos de loja e admins podem atualizar funcionários
CREATE POLICY "Store owners can update employees"
ON public.store_employees
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = store_employees.store_id
    AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Donos de loja e admins podem deletar funcionários
CREATE POLICY "Store owners can delete employees"
ON public.store_employees
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = store_employees.store_id
    AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- =============================================
-- TABELA DE CONVITES DE FUNCIONÁRIOS
-- =============================================

CREATE TABLE IF NOT EXISTS public.employee_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  position TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  invite_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_employee_invites_store_id ON public.employee_invites(store_id);
CREATE INDEX IF NOT EXISTS idx_employee_invites_email ON public.employee_invites(email);
CREATE INDEX IF NOT EXISTS idx_employee_invites_token ON public.employee_invites(invite_token);

ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;

-- Donos podem gerenciar convites
CREATE POLICY "Store owners can manage invites"
ON public.employee_invites
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = employee_invites.store_id
    AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- =============================================
-- TABELA DE LOG DE ATIVIDADES DOS FUNCIONÁRIOS
-- =============================================

CREATE TABLE IF NOT EXISTS public.employee_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.store_employees(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- Ex: 'order_created', 'product_updated', 'login'
  resource_type TEXT, -- Ex: 'order', 'product', 'coupon'
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_store_id ON public.employee_activity_log(store_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_employee_id ON public.employee_activity_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.employee_activity_log(created_at DESC);

ALTER TABLE public.employee_activity_log ENABLE ROW LEVEL SECURITY;

-- Donos podem ver logs de atividades
CREATE POLICY "Store owners can view activity logs"
ON public.employee_activity_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = employee_activity_log.store_id
    AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Funcionários podem inserir seus próprios logs
CREATE POLICY "Employees can insert their activity logs"
ON public.employee_activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_employees
    WHERE store_employees.id = employee_activity_log.employee_id
    AND store_employees.user_id = auth.uid()
  )
);
