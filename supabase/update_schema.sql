-- Atualização do Banco de Dados
-- Adiciona as colunas necessárias para anexar arquivos que estavam faltando

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.deliverables ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Atualiza o cache do Supabase para que a API reconheça as novas colunas imediatamente
NOTIFY pgrst, 'reload schema';
