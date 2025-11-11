-- Remove qualquer webhook ou trigger relacionado ao WhatsApp
-- Isso vai garantir que nenhuma função externa seja chamada ao criar pedidos

-- Verificar se existe algum trigger com nome relacionado a whatsapp
DO $$ 
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT tgname, relname
        FROM pg_trigger
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        WHERE tgname ILIKE '%whatsapp%'
          AND pg_trigger.tgisinternal = false
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', 
                      trigger_record.tgname, 
                      trigger_record.relname);
        RAISE NOTICE 'Dropped trigger % on table %', trigger_record.tgname, trigger_record.relname;
    END LOOP;
END $$;

-- Garantir que a tabela stores não tenha problemas com as colunas de WhatsApp
-- Permitir que sejam NULL para não causar erros
ALTER TABLE public.stores 
  ALTER COLUMN whatsapp_phone DROP NOT NULL,
  ALTER COLUMN whatsapp_instance DROP NOT NULL;

-- Adicionar comentário explicando que WhatsApp foi desabilitado
COMMENT ON COLUMN public.stores.whatsapp_phone IS 'WhatsApp desabilitado - coluna mantida para compatibilidade';
COMMENT ON COLUMN public.stores.whatsapp_instance IS 'WhatsApp desabilitado - coluna mantida para compatibilidade';