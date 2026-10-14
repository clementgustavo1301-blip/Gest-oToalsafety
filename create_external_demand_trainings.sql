-- ==============================================================================
-- MIGRAÇÃO SQL: Suporte a Demandas Fora do TotalSafety na Agenda de Treinamentos
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Garante que company_id possa ser nulo (para empresas de demandas avulsas/externas)
ALTER TABLE public.trainings 
ALTER COLUMN company_id DROP NOT NULL;

-- 2. Adiciona colunas para identificar demandas externas e o nome da empresa solicitante
ALTER TABLE public.trainings 
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS external_company_name TEXT,
ADD COLUMN IF NOT EXISTS demand_type TEXT DEFAULT 'totalsafety' CHECK (demand_type IN ('totalsafety', 'externa'));

-- 3. Cria índices para otimização de consultas e filtros no calendário
CREATE INDEX IF NOT EXISTS idx_trainings_is_external ON public.trainings(is_external);
CREATE INDEX IF NOT EXISTS idx_trainings_external_company_name ON public.trainings(external_company_name);
CREATE INDEX IF NOT EXISTS idx_trainings_demand_type ON public.trainings(demand_type);

-- 4. Comentários para documentação do banco de dados
COMMENT ON COLUMN public.trainings.is_external IS 'Indica se o treinamento é uma demanda externa (empresa fora do contrato TotalSafety)';
COMMENT ON COLUMN public.trainings.external_company_name IS 'Nome da empresa externa solicitante quando não vinculada ao cadastro principal de empresas do TotalSafety';
COMMENT ON COLUMN public.trainings.demand_type IS 'Tipo de demanda: totalsafety (cliente contratado padrão) ou externa (demanda fora do totalsafety)';

-- 5. Atualiza registros pré-existentes que possam ter a tag na descrição (se houver)
UPDATE public.trainings
SET 
    is_external = TRUE,
    demand_type = 'externa',
    external_company_name = substring(description from '\[EXTERNAL_COMPANY:([^\]]+)\]')
WHERE description LIKE '%[EXTERNAL_COMPANY:%'
  AND (external_company_name IS NULL OR external_company_name = '');

-- 6. Notificar PostgREST para recarregar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';
