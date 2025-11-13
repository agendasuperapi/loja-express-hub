-- Remover a constraint de foreign key para auth.users
-- e tornar user_id nullable para permitir cadastro de funcionários
-- que ainda não têm conta no sistema

-- Primeiro, remover a constraint existente
ALTER TABLE public.store_employees
DROP CONSTRAINT IF EXISTS store_employees_user_id_fkey;

-- Tornar o campo user_id nullable
ALTER TABLE public.store_employees
ALTER COLUMN user_id DROP NOT NULL;

-- Criar um índice para melhorar performance nas buscas por user_id
CREATE INDEX IF NOT EXISTS idx_store_employees_user_id 
ON public.store_employees(user_id) 
WHERE user_id IS NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.store_employees.user_id IS 
'User ID from auth.users - can be NULL for employees invited but not yet registered';
