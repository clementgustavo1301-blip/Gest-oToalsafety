-- ==============================================================================
-- MIGRAÇÃO DE BANCO DE DADOS - ECOCLINIC / TOTALSAFETY
-- ALTERAÇÕES SOLICITADAS:
-- 1. NO GRUPO E EMPRESAS:
--    - Supervisor
--    - Técnico Responsável
--    - Visitas Técnicas (7, 15, 30, 60, N/A)
--    - PADRONIZAÇÃO COMPLETA BIDIRECIONAL: Ao vincular ou alterar Supervisor e
--      Técnico Responsável no grupo OU em qualquer empresa do grupo, todas as
--      empresas daquele grupo e o próprio grupo são sincronizados automaticamente.
-- 2. NAS EMPRESAS (VISÃO GERAL / CONFORMIDADE SST):
--    - Gestão de CIPA (NR-5: Pendente, Implementado, Não Implementado)
--    - Gestão de EPI (NR-6: Pendente, Implementado, Não Implementado)
-- 3. ENTREGÁVEIS:
--    - Data de Emissão (Obrigatório)
--    - Data de Validade (Não obrigatório)
--    - Última Revisão (Não obrigatório)
-- ==============================================================================

-- 1. TABELA GROUPS (GRUPOS ECONÔMICOS)
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS supervisor TEXT,
ADD COLUMN IF NOT EXISTS tecnico_responsavel TEXT,
ADD COLUMN IF NOT EXISTS visitas_tecnicas TEXT DEFAULT 'N/A';

-- 2. TABELA COMPANIES (EMPRESAS)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS supervisor TEXT,
ADD COLUMN IF NOT EXISTS tecnico_responsavel TEXT,
ADD COLUMN IF NOT EXISTS visitas_tecnicas TEXT,
ADD COLUMN IF NOT EXISTS gestao_cipa TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS gestao_epi TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS gestao_pgr TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS gestao_sipat TEXT DEFAULT 'pendente';

-- Garantir constraints para os status de Gestão de CIPA e Gestão de EPI
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_gestao_cipa_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_gestao_cipa_check 
  CHECK (gestao_cipa IN ('pendente', 'implementado', 'nao_implementado'));

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_gestao_epi_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_gestao_epi_check 
  CHECK (gestao_epi IN ('pendente', 'implementado', 'nao_implementado'));

-- Compatibilidade retroativa para colunas legadas
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_gestao_pgr_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_gestao_pgr_check 
  CHECK (gestao_pgr IN ('pendente', 'implementado', 'nao_implementado'));

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_gestao_sipat_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_gestao_sipat_check 
  CHECK (gestao_sipat IN ('pendente', 'implementado', 'nao_implementado'));

-- Sincronizar dados entre gestao_cipa/gestao_epi e colunas legadas
UPDATE public.companies
SET 
  gestao_cipa = COALESCE(gestao_cipa, gestao_pgr, 'pendente'),
  gestao_epi = COALESCE(gestao_epi, gestao_sipat, 'pendente'),
  gestao_pgr = COALESCE(gestao_cipa, gestao_pgr, 'pendente'),
  gestao_sipat = COALESCE(gestao_epi, gestao_sipat, 'pendente');

-- 3. TABELA DELIVERABLES (ENTREGÁVEIS / LAUDOS / PROGRAMAS)
ALTER TABLE public.deliverables
ADD COLUMN IF NOT EXISTS data_emissao DATE,
ADD COLUMN IF NOT EXISTS data_envio DATE,
ADD COLUMN IF NOT EXISTS ultima_revisao DATE;

UPDATE public.deliverables
SET 
  data_emissao = COALESCE(data_emissao, data_envio, delivered_date, due_date, created_at::date),
  data_envio = COALESCE(data_envio, data_emissao, delivered_date, due_date, created_at::date)
WHERE data_emissao IS NULL OR data_envio IS NULL;

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_companies_gestao_cipa ON public.companies(gestao_cipa);
CREATE INDEX IF NOT EXISTS idx_companies_gestao_epi ON public.companies(gestao_epi);
CREATE INDEX IF NOT EXISTS idx_companies_gestao_pgr ON public.companies(gestao_pgr);
CREATE INDEX IF NOT EXISTS idx_companies_gestao_sipat ON public.companies(gestao_sipat);
CREATE INDEX IF NOT EXISTS idx_deliverables_data_emissao ON public.deliverables(data_emissao);
CREATE INDEX IF NOT EXISTS idx_deliverables_data_envio ON public.deliverables(data_envio);

-- ==============================================================================
-- 5. TRIGGER: PROPAGAÇÃO DO GRUPO PARA AS EMPRESAS (GRUPO -> EMPRESAS)
-- Quando o grupo tiver Supervisor ou Técnico Responsável alterado, todas as empresas
-- pertencentes àquele grupo são atualizadas imediatamente com os mesmos responsáveis.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_group_team_to_companies()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.supervisor IS DISTINCT FROM OLD.supervisor) OR 
     (NEW.tecnico_responsavel IS DISTINCT FROM OLD.tecnico_responsavel) OR
     (NEW.visitas_tecnicas IS DISTINCT FROM OLD.visitas_tecnicas) THEN
    
    UPDATE public.companies
    SET 
      supervisor = NEW.supervisor,
      tecnico_responsavel = NEW.tecnico_responsavel,
      visitas_tecnicas = CASE 
        WHEN NEW.visitas_tecnicas IS NOT NULL AND NEW.visitas_tecnicas <> 'N/A' THEN NEW.visitas_tecnicas 
        ELSE COALESCE(visitas_tecnicas, 'N/A') 
      END
    WHERE group_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_group_team_to_companies ON public.groups;
CREATE TRIGGER trg_sync_group_team_to_companies
AFTER UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.sync_group_team_to_companies();

-- ==============================================================================
-- 6. TRIGGER: PROPAGAÇÃO DA EMPRESA PARA O GRUPO E EMPRESAS IRMÃS (EMPRESA -> GRUPO)
-- Ao alterar Supervisor ou Técnico em qualquer empresa de um grupo, o grupo e todas
-- as outras empresas daquele mesmo grupo são sincronizados automaticamente.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_company_team_to_group()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    IF (NEW.supervisor IS DISTINCT FROM OLD.supervisor AND NEW.supervisor IS NOT NULL) OR 
       (NEW.tecnico_responsavel IS DISTINCT FROM OLD.tecnico_responsavel AND NEW.tecnico_responsavel IS NOT NULL) OR
       (NEW.visitas_tecnicas IS DISTINCT FROM OLD.visitas_tecnicas AND NEW.visitas_tecnicas IS NOT NULL AND NEW.visitas_tecnicas <> 'N/A') THEN
      
      -- Atualiza o grupo
      UPDATE public.groups
      SET 
        supervisor = COALESCE(NEW.supervisor, supervisor),
        tecnico_responsavel = COALESCE(NEW.tecnico_responsavel, tecnico_responsavel),
        visitas_tecnicas = CASE 
          WHEN NEW.visitas_tecnicas IS NOT NULL AND NEW.visitas_tecnicas <> 'N/A' THEN NEW.visitas_tecnicas 
          ELSE visitas_tecnicas 
        END
      WHERE id = NEW.group_id;

      -- Atualiza as outras empresas do mesmo grupo
      UPDATE public.companies
      SET 
        supervisor = COALESCE(NEW.supervisor, supervisor),
        tecnico_responsavel = COALESCE(NEW.tecnico_responsavel, tecnico_responsavel),
        visitas_tecnicas = CASE 
          WHEN NEW.visitas_tecnicas IS NOT NULL AND NEW.visitas_tecnicas <> 'N/A' THEN NEW.visitas_tecnicas 
          ELSE visitas_tecnicas 
        END
      WHERE group_id = NEW.group_id AND id <> NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_company_team_to_group ON public.companies;
CREATE TRIGGER trg_sync_company_team_to_group
AFTER UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_team_to_group();

-- ==============================================================================
-- 7. TRIGGER: HERANÇA AUTOMÁTICA AO CADASTRAR NOVA EMPRESA NO GRUPO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.inherit_group_team_on_company_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_group RECORD;
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    SELECT supervisor, tecnico_responsavel, visitas_tecnicas INTO v_group
    FROM public.groups WHERE id = NEW.group_id;
    
    IF FOUND THEN
      IF (NEW.supervisor IS NULL OR NEW.supervisor = '') AND v_group.supervisor IS NOT NULL THEN
        NEW.supervisor := v_group.supervisor;
      END IF;
      IF (NEW.tecnico_responsavel IS NULL OR NEW.tecnico_responsavel = '') AND v_group.tecnico_responsavel IS NOT NULL THEN
        NEW.tecnico_responsavel := v_group.tecnico_responsavel;
      END IF;
      IF (NEW.visitas_tecnicas IS NULL OR NEW.visitas_tecnicas = '' OR NEW.visitas_tecnicas = 'N/A') AND v_group.visitas_tecnicas IS NOT NULL THEN
        NEW.visitas_tecnicas := v_group.visitas_tecnicas;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inherit_group_team_on_company_insert ON public.companies;
CREATE TRIGGER trg_inherit_group_team_on_company_insert
BEFORE INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.inherit_group_team_on_company_insert();

-- ==============================================================================
-- 8. SINCRONIZAÇÃO RETROATIVA DE TODAS AS EMPRESAS ATUAIS COM SEUS GRUPOS
-- ==============================================================================
-- Se o grupo já possui supervisor/técnico, passa para as empresas
UPDATE public.companies c
SET 
  supervisor = COALESCE(g.supervisor, c.supervisor),
  tecnico_responsavel = COALESCE(g.tecnico_responsavel, c.tecnico_responsavel),
  visitas_tecnicas = CASE 
    WHEN g.visitas_tecnicas IS NOT NULL AND g.visitas_tecnicas <> 'N/A' THEN g.visitas_tecnicas 
    ELSE COALESCE(c.visitas_tecnicas, 'N/A') 
  END
FROM public.groups g
WHERE c.group_id = g.id
  AND (g.supervisor IS NOT NULL OR g.tecnico_responsavel IS NOT NULL OR (g.visitas_tecnicas IS NOT NULL AND g.visitas_tecnicas <> 'N/A'));

-- Se alguma empresa do grupo possui supervisor/técnico e o grupo ainda não, passa para o grupo e irmãs
UPDATE public.groups g
SET 
  supervisor = COALESCE(g.supervisor, sub.supervisor),
  tecnico_responsavel = COALESCE(g.tecnico_responsavel, sub.tecnico_responsavel),
  visitas_tecnicas = CASE 
    WHEN g.visitas_tecnicas IS NOT NULL AND g.visitas_tecnicas <> 'N/A' THEN g.visitas_tecnicas
    ELSE COALESCE(sub.visitas_tecnicas, 'N/A')
  END
FROM (
  SELECT group_id, MAX(supervisor) as supervisor, MAX(tecnico_responsavel) as tecnico_responsavel, MAX(visitas_tecnicas) as visitas_tecnicas
  FROM public.companies
  WHERE group_id IS NOT NULL AND (supervisor IS NOT NULL OR tecnico_responsavel IS NOT NULL)
  GROUP BY group_id
) sub
WHERE g.id = sub.group_id;

UPDATE public.companies c
SET 
  supervisor = COALESCE(c.supervisor, g.supervisor),
  tecnico_responsavel = COALESCE(c.tecnico_responsavel, g.tecnico_responsavel),
  visitas_tecnicas = CASE 
    WHEN g.visitas_tecnicas IS NOT NULL AND g.visitas_tecnicas <> 'N/A' THEN g.visitas_tecnicas 
    ELSE COALESCE(c.visitas_tecnicas, 'N/A') 
  END
FROM public.groups g
WHERE c.group_id = g.id
  AND (g.supervisor IS NOT NULL OR g.tecnico_responsavel IS NOT NULL);

-- 9. RECARREGAR O CACHE DO SCHEMA DO POSTGREST / SUPABASE
NOTIFY pgrst, 'reload schema';
