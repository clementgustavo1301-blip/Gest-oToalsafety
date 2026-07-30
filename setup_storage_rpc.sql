-- Execute este script no SQL Editor do seu painel Supabase
-- Ele cria uma função segura que permite ao sistema ler o tamanho exato do banco de dados

CREATE OR REPLACE FUNCTION get_db_size()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que a função leia dados de sistema
AS $$
BEGIN
  -- Retorna o tamanho exato do banco atual em bytes
  RETURN pg_database_size(current_database());
END;
$$;

-- Permite que usuários autenticados chamem esta função
GRANT EXECUTE ON FUNCTION get_db_size() TO authenticated;
GRANT EXECUTE ON FUNCTION get_db_size() TO anon;
