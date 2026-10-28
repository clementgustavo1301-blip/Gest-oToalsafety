-- ==============================================================================
-- SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS (SUPABASE)
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- É 100% seguro (idempotente com IF NOT EXISTS) e não apaga nenhum dado existente.
-- ==============================================================================

-- 1. Extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Garantir colunas adicionais na tabela de Turmas (training_classes)
CREATE TABLE IF NOT EXISTS public.training_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    instructors JSONB NOT NULL DEFAULT '[]'::jsonb,
    instructor_name TEXT NOT NULL DEFAULT '',
    instructor_role TEXT NOT NULL DEFAULT '',
    instructor_registration TEXT NOT NULL DEFAULT '',
    tech_lead JSONB,
    tech_lead_name TEXT NOT NULL DEFAULT '',
    tech_lead_role TEXT NOT NULL DEFAULT '',
    tech_lead_registration TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '',
    validade TEXT NOT NULL DEFAULT '24 meses',
    cert_model TEXT NOT NULL DEFAULT 'modelo1',
    start_date DATE,
    location TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Aberta',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colunas extras para assinaturas sincronizadas e coordenação
ALTER TABLE public.training_classes ADD COLUMN IF NOT EXISTS signatures JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.training_classes ADD COLUMN IF NOT EXISTS coordinator JSONB;
ALTER TABLE public.training_classes ADD COLUMN IF NOT EXISTS validade TEXT DEFAULT '24 meses';
ALTER TABLE public.training_classes ADD COLUMN IF NOT EXISTS cert_model TEXT DEFAULT 'modelo1';
ALTER TABLE public.training_classes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aberta';

-- 3. Garantir colunas na tabela de Participantes / Inscrições (training_enrollments)
CREATE TABLE IF NOT EXISTS public.training_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id UUID REFERENCES public.training_classes(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    matricula TEXT,
    data_nascimento DATE,
    telefone TEXT,
    empresa TEXT,
    status TEXT NOT NULL DEFAULT 'Inscrito',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir coluna de matrícula caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.training_enrollments ADD COLUMN IF NOT EXISTS matricula TEXT;
ALTER TABLE public.training_enrollments ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE public.training_enrollments ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.training_enrollments ADD COLUMN IF NOT EXISTS empresa TEXT;
ALTER TABLE public.training_enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Inscrito';

-- Índices de busca e unicidade por turma + CPF limpo
CREATE INDEX IF NOT EXISTS training_enrollments_turma_id_idx
    ON public.training_enrollments(turma_id);

CREATE UNIQUE INDEX IF NOT EXISTS training_enrollments_turma_cpf_uidx
    ON public.training_enrollments(turma_id, regexp_replace(cpf, '\D', '', 'g'))
    WHERE turma_id IS NOT NULL;

-- 4. Garantir colunas na tabela de Cursos Personalizados (custom_trainings)
CREATE TABLE IF NOT EXISTS public.custom_trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    duracao TEXT,
    conteudo TEXT,
    descricao TEXT,
    instrutor_nome TEXT,
    instrutor_cargo TEXT,
    instrutor_registro TEXT,
    validade TEXT DEFAULT '24 meses',
    cert_model TEXT DEFAULT 'modelo1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.custom_trainings ADD COLUMN IF NOT EXISTS validade TEXT DEFAULT '24 meses';
ALTER TABLE public.custom_trainings ADD COLUMN IF NOT EXISTS cert_model TEXT DEFAULT 'modelo1';

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE public.training_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_trainings ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de RLS para training_classes
DROP POLICY IF EXISTS "Public can view training classes" ON public.training_classes;
CREATE POLICY "Public can view training classes"
    ON public.training_classes
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users manage training classes" ON public.training_classes;
CREATE POLICY "Authenticated users manage training classes"
    ON public.training_classes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Políticas de RLS para training_enrollments (autoatendimento e listagem)
DROP POLICY IF EXISTS "Public can register in a training class" ON public.training_enrollments;
CREATE POLICY "Public can register in a training class"
    ON public.training_enrollments
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        turma_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.training_classes tc
            WHERE tc.id = turma_id
        )
    );

DROP POLICY IF EXISTS "Authenticated users view training enrollments" ON public.training_enrollments;
CREATE POLICY "Authenticated users view training enrollments"
    ON public.training_enrollments
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users update training enrollments" ON public.training_enrollments;
CREATE POLICY "Authenticated users update training enrollments"
    ON public.training_enrollments
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users delete training enrollments" ON public.training_enrollments;
CREATE POLICY "Authenticated users delete training enrollments"
    ON public.training_enrollments
    FOR DELETE
    TO authenticated
    USING (true);

-- 8. Políticas de RLS para custom_trainings
DROP POLICY IF EXISTS "Enable read access for all" ON public.custom_trainings;
CREATE POLICY "Enable read access for all" ON public.custom_trainings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all" ON public.custom_trainings;
CREATE POLICY "Enable insert for all" ON public.custom_trainings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all" ON public.custom_trainings;
CREATE POLICY "Enable update for all" ON public.custom_trainings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all" ON public.custom_trainings;
CREATE POLICY "Enable delete for all" ON public.custom_trainings FOR DELETE USING (true);

-- 9. Concessão de permissões de tabelas
GRANT SELECT ON public.training_classes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.training_classes TO authenticated;

GRANT INSERT ON public.training_enrollments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_enrollments TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_trainings TO anon, authenticated;

-- 10. Habilitar sincronização em tempo real (Supabase Realtime)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.training_classes;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.training_enrollments;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 11. Recarregar o cache do schema no Supabase imediatamente
NOTIFY pgrst, 'reload schema';
