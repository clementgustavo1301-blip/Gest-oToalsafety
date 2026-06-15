-- Limpa todos os dados de todas as tabelas (mantendo a estrutura)
-- O CASCADE garante que as tabelas que dependem umas das outras (ex: Entregáveis e Empresas) também sejam apagadas corretamente.

TRUNCATE TABLE public.deliverables CASCADE;
TRUNCATE TABLE public.trainings CASCADE;
TRUNCATE TABLE public.contracts CASCADE;
TRUNCATE TABLE public.companies CASCADE;
TRUNCATE TABLE public.groups CASCADE;

-- Se quiser limpar também os usuários cadastrados (opcional):
-- DELETE FROM auth.users;
