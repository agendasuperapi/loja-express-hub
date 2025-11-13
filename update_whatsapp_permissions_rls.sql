-- Atualizar políticas RLS da tabela store_instances para usar nova estrutura de permissões

-- Drop políticas antigas
DROP POLICY IF EXISTS "Store owners and employees can view instances" ON store_instances;
DROP POLICY IF EXISTS "Store owners and employees can insert instances" ON store_instances;
DROP POLICY IF EXISTS "Store owners and employees can update instances" ON store_instances;
DROP POLICY IF EXISTS "Store owners and employees can delete instances" ON store_instances;

-- Criar novas políticas com estrutura de permissões atualizada
CREATE POLICY "Store owners and employees can view instances"
ON store_instances
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM stores
    WHERE stores.id = store_instances.store_id
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM store_employees
        WHERE store_employees.store_id = stores.id
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (
          ((store_employees.permissions -> 'whatsapp' ->> 'view')::boolean = true)
          OR ((store_employees.permissions -> 'whatsapp' ->> 'edit')::boolean = true)
          OR ((store_employees.permissions -> 'settings' ->> 'manage_whatsapp')::boolean = true) -- Backward compatibility
        )
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Store owners and employees can insert instances"
ON store_instances
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM stores
    WHERE stores.id = store_instances.store_id
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM store_employees
        WHERE store_employees.store_id = stores.id
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (
          ((store_employees.permissions -> 'whatsapp' ->> 'edit')::boolean = true)
          OR ((store_employees.permissions -> 'settings' ->> 'manage_whatsapp')::boolean = true) -- Backward compatibility
        )
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Store owners and employees can update instances"
ON store_instances
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM stores
    WHERE stores.id = store_instances.store_id
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM store_employees
        WHERE store_employees.store_id = stores.id
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (
          ((store_employees.permissions -> 'whatsapp' ->> 'edit')::boolean = true)
          OR ((store_employees.permissions -> 'settings' ->> 'manage_whatsapp')::boolean = true) -- Backward compatibility
        )
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Store owners and employees can delete instances"
ON store_instances
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM stores
    WHERE stores.id = store_instances.store_id
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM store_employees
        WHERE store_employees.store_id = stores.id
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (
          ((store_employees.permissions -> 'whatsapp' ->> 'edit')::boolean = true)
          OR ((store_employees.permissions -> 'settings' ->> 'manage_whatsapp')::boolean = true) -- Backward compatibility
        )
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);
