-- ==============================================================================
-- MIGRAÇÃO / PADRONIZAÇÃO DE ENTREGÁVEIS (TOTALSAFETY / ECOCLINIC)
-- ==============================================================================

-- 1. Garantir que a tabela public.deliverables suporte os tipos de entregáveis necessários
ALTER TABLE public.deliverables DROP CONSTRAINT IF EXISTS deliverables_type_check;
ALTER TABLE public.deliverables ADD CONSTRAINT deliverables_type_check 
  CHECK (type IN ('programa', 'laudo', 'contrato', 'documento', 'treinamento', 'visita_tecnica', 'outro'));

-- 2. (Opcional e Recomendado) Criar tabela de referência oficial para os entregáveis padrão
CREATE TABLE IF NOT EXISTS public.standard_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('programa', 'laudo', 'documento', 'treinamento', 'visita_tecnica')),
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS e políticas de leitura pública/autenticada
ALTER TABLE public.standard_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de entregaveis padrao" ON public.standard_deliverables;
CREATE POLICY "Permitir leitura de entregaveis padrao" 
  ON public.standard_deliverables FOR SELECT TO authenticated, anon USING (true);

-- 3. Inserir ou atualizar os 12 entregáveis padronizados solicitados
INSERT INTO public.standard_deliverables (order_index, title, type, description)
VALUES
    (1,  'PGR',                           'programa',  'Programa de Gerenciamento de Riscos (NR-1)'),
    (2,  'PCMSO',                         'programa',  'Programa de Controle Médico de Saúde Ocupacional (NR-7)'),
    (3,  'Mapeamento Psicossocial',       'laudo',     'Avaliação e Mapeamento de Fatores Psicossociais'),
    (4,  'Ordem de Serviço',              'documento', 'Ordens de Serviço de Segurança e Medicina do Trabalho'),
    (5,  'Relatório Analítico do PCMSO',  'laudo',     'Relatório Analítico Anual do PCMSO'),
    (6,  'LTCAT',                         'laudo',     'Laudo Técnico das Condições Ambientais de Trabalho'),
    (7,  'LI',                            'laudo',     'Laudo de Insalubridade (NR-15)'),
    (8,  'LP',                            'laudo',     'Laudo de Periculosidade (NR-16)'),
    (9,  'PCA',                           'programa',  'Programa de Conservação Auditiva'),
    (10, 'PPR',                           'programa',  'Programa de Proteção Respiratória'),
    (11, 'AET',                           'laudo',     'Análise Ergonômica do Trabalho (NR-17)'),
    (12, 'eSocial S-2240',                'documento', 'Condições Ambientais do Trabalho - Agentes Nocivos')
ON CONFLICT (title) DO UPDATE 
SET 
    order_index = EXCLUDED.order_index,
    type = EXCLUDED.type,
    description = EXCLUDED.description;

-- ==============================================================================
-- 4. (SCRIPT OPCIONAL) Carga automática dos 12 entregáveis para todas as empresas ativas
-- Descomente o bloco abaixo caso queira gerar os 12 entregáveis pendentes para as empresas que ainda não possuem:
-- ==============================================================================
/*
INSERT INTO public.deliverables (company_id, title, type, status, due_date)
SELECT 
    c.id AS company_id,
    sd.title,
    sd.type,
    'pendente' AS status,
    CURRENT_DATE + INTERVAL '30 days' AS due_date
FROM public.companies c
CROSS JOIN public.standard_deliverables sd
WHERE NOT EXISTS (
    SELECT 1 FROM public.deliverables d 
    WHERE d.company_id = c.id AND LOWER(TRIM(d.title)) = LOWER(TRIM(sd.title))
);
*/
