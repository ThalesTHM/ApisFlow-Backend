-- Isolamento entre cooperativas no próprio banco (Row-Level Security).
-- Cada tabela de negócio só expõe as linhas do tenant definido na transação pela
-- aplicação (set_config('app.tenant_id', ...)). Sem tenant definido, nenhuma linha
-- é visível e nenhuma escrita é aceita. FORCE faz a regra valer também para o
-- dono das tabelas; só superusuários e papéis com BYPASSRLS escapam dela, e o
-- papel da aplicação (app_user) não é nenhum dos dois.
-- A tabela tenants fica fora: o login precisa localizar a cooperativa pelo
-- identificador antes de saber qual é o tenant, e ela só guarda nome e identificador.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'apiaries', 'hives', 'production_cycles', 'honey_batches',
    'orders', 'order_items', 'notifications', 'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', TRUE), '''')::uuid)
         WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', TRUE), '''')::uuid)',
      t
    );
  END LOOP;
END $$;
