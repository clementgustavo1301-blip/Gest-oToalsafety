-- ==============================================================================
-- MIGRAÇÃO / ATUALIZAÇÃO: CORREÇÃO DAS DATAS DE VALIDADE DOS DOCUMENTOS
-- ECOCLINIC / TOTALSAFETY
-- ==============================================================================
-- Objetivo:
-- 1. Garantir que todo documento com data de emissão preenchida tenha a data de validade
--    real calculada de acordo com as Normas Regulamentadoras (SST):
--    - PGR / GRO: 24 meses (2 anos) a partir da data de emissão (NR-01)
--    - PCMSO / Relatório Analítico: 12 meses (1 ano) a partir da emissão (NR-07)
--    - LTCAT, LI, LP, AET, PCA, PPR, Laudos em geral: 12 meses (1 ano)
--    - Treinamentos gerais (NR-35, NR-10, NR-12): 24 meses (2 anos)
--    - Treinamentos anuais (CIPA, Brigada, Primeiros Socorros): 12 meses (1 ano)
-- 2. Evitar que documentos sem validade fiquem puxando a data de emissão ou o prazo de
--    entrega (due_date) como se fossem a data de validade.
-- ==============================================================================

-- 1. Sincronizar data_emissao se estiver vazia
UPDATE public.deliverables
SET data_emissao = COALESCE(data_emissao, data_envio, delivered_date, due_date, created_at::date)
WHERE data_emissao IS NULL;

-- 2. Atualizar PGR / GRO sem validade -> 2 anos a partir da emissão
UPDATE public.deliverables
SET validity_date = (data_emissao + INTERVAL '2 years')::date
WHERE validity_date IS NULL
  AND data_emissao IS NOT NULL
  AND (
    LOWER(title) LIKE '%pgr%' 
    OR LOWER(title) LIKE '%gerenciamento de risco%'
    OR LOWER(title) LIKE '%gro%'
  );

-- 3. Atualizar PCMSO e Relatório Analítico sem validade -> 1 ano a partir da emissão
UPDATE public.deliverables
SET validity_date = (data_emissao + INTERVAL '1 year')::date
WHERE validity_date IS NULL
  AND data_emissao IS NOT NULL
  AND (
    LOWER(title) LIKE '%pcmso%' 
    OR LOWER(title) LIKE '%controle m%'
    OR LOWER(title) LIKE '%relat%'
  );

-- 4. Atualizar LTCAT, Laudos (LI, LP, AET, PCA, PPR, Psicossocial) sem validade -> 1 ano
UPDATE public.deliverables
SET validity_date = (data_emissao + INTERVAL '1 year')::date
WHERE validity_date IS NULL
  AND data_emissao IS NOT NULL
  AND (
    LOWER(title) LIKE '%ltcat%'
    OR LOWER(title) LIKE '%insalubridade%'
    OR LOWER(title) LIKE '%periculosidade%'
    OR LOWER(title) LIKE '%laudo%'
    OR LOWER(title) LIKE '%aet%'
    OR LOWER(title) LIKE '%ergon%'
    OR LOWER(title) LIKE '%psicossocial%'
    OR LOWER(title) LIKE '%pca%'
    OR LOWER(title) LIKE '%ppr%'
  );

-- 5. Atualizar Treinamentos anuais (CIPA, Brigada, Primeiros Socorros) -> 1 ano
UPDATE public.deliverables
SET validity_date = (data_emissao + INTERVAL '1 year')::date
WHERE validity_date IS NULL
  AND data_emissao IS NOT NULL
  AND (type = 'treinamento' OR LOWER(title) LIKE '%treinamento%' OR LOWER(title) LIKE '%curso%')
  AND (LOWER(title) LIKE '%cipa%' OR LOWER(title) LIKE '%brigada%' OR LOWER(title) LIKE '%primeiros socorros%');

-- 6. Atualizar Demais Treinamentos normativos (NRs 35, 10, 11, 12, etc.) -> 2 anos
UPDATE public.deliverables
SET validity_date = (data_emissao + INTERVAL '2 years')::date
WHERE validity_date IS NULL
  AND data_emissao IS NOT NULL
  AND (type = 'treinamento' OR LOWER(title) LIKE '%treinamento%' OR LOWER(title) LIKE '%curso%');

-- 7. Atualizar programas gerais sem validade -> 1 ano
UPDATE public.deliverables
SET validity_date = (data_emissao + INTERVAL '1 year')::date
WHERE validity_date IS NULL
  AND data_emissao IS NOT NULL
  AND type = 'programa';

-- 8. Atualizar laudos gerais sem validade -> 1 ano
UPDATE public.deliverables
SET validity_date = (data_emissao + INTERVAL '1 year')::date
WHERE validity_date IS NULL
  AND data_emissao IS NOT NULL
  AND type = 'laudo';

-- ==============================================================================
-- 9. TRIGGER OPCIONAL PARA NOVOS ENTREGÁVEIS:
-- Sempre que um novo entregável for cadastrado com data_emissao mas sem validity_date,
-- calcula a validade automaticamente no próprio banco de dados.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_default_deliverable_validity()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT := LOWER(COALESCE(NEW.title, ''));
  v_type TEXT := LOWER(COALESCE(NEW.type, ''));
  v_base_date DATE := COALESCE(NEW.data_emissao, NEW.data_envio, NEW.due_date, CURRENT_DATE);
BEGIN
  IF NEW.validity_date IS NULL AND v_base_date IS NOT NULL THEN
    IF v_title LIKE '%pgr%' OR v_title LIKE '%gerenciamento de risco%' OR v_title LIKE '%gro%' THEN
      NEW.validity_date := (v_base_date + INTERVAL '2 years')::date;
    ELSIF v_title LIKE '%pcmso%' OR v_title LIKE '%controle m%' OR v_title LIKE '%relat%' THEN
      NEW.validity_date := (v_base_date + INTERVAL '1 year')::date;
    ELSIF v_title LIKE '%ltcat%' OR v_title LIKE '%insalubridade%' OR v_title LIKE '%periculosidade%' 
       OR v_title LIKE '%laudo%' OR v_title LIKE '%aet%' OR v_title LIKE '%ergon%' 
       OR v_title LIKE '%psicossocial%' OR v_title LIKE '%pca%' OR v_title LIKE '%ppr%' THEN
      NEW.validity_date := (v_base_date + INTERVAL '1 year')::date;
    ELSIF v_type = 'treinamento' OR v_title LIKE '%treinamento%' OR v_title LIKE '%curso%' THEN
      IF v_title LIKE '%cipa%' OR v_title LIKE '%brigada%' OR v_title LIKE '%primeiros socorros%' THEN
        NEW.validity_date := (v_base_date + INTERVAL '1 year')::date;
      ELSE
        NEW.validity_date := (v_base_date + INTERVAL '2 years')::date;
      END IF;
    ELSIF v_type IN ('programa', 'laudo') THEN
      NEW.validity_date := (v_base_date + INTERVAL '1 year')::date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_default_deliverable_validity ON public.deliverables;
CREATE TRIGGER trg_set_default_deliverable_validity
BEFORE INSERT OR UPDATE OF data_emissao, title, type ON public.deliverables
FOR EACH ROW
EXECUTE FUNCTION public.set_default_deliverable_validity();
