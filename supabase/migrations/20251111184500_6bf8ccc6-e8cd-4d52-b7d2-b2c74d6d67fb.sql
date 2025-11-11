-- Desabilitar temporariamente TODOS os triggers da tabela orders
-- Isso nos permitirá identificar se o problema está em algum trigger

-- Primeiro, salvar o estado atual
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT tgname 
        FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        WHERE pg_class.relname = 'orders'
          AND tgisinternal = false
    LOOP
        RAISE NOTICE 'Desabilitando trigger: %', trigger_rec.tgname;
        EXECUTE format('ALTER TABLE public.orders DISABLE TRIGGER %I', trigger_rec.tgname);
    END LOOP;
END $$;

-- Adicionar um comentário para lembrar que os triggers foram desabilitados
COMMENT ON TABLE public.orders IS 'ATENÇÃO: Triggers desabilitados temporariamente para debug - 2025-01-11';