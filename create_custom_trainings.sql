-- ==============================================================================
-- TABELA: custom_trainings (Treinamentos Salvos no Gerador de Certificados)
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.custom_trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    duracao TEXT,
    conteudo TEXT,
    descricao TEXT,
    instrutor_nome TEXT,
    instrutor_cargo TEXT,
    instrutor_registro TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.custom_trainings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para acesso público e autenticado
DROP POLICY IF EXISTS "Enable read access for all" ON public.custom_trainings;
CREATE POLICY "Enable read access for all" ON public.custom_trainings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all" ON public.custom_trainings;
CREATE POLICY "Enable insert for all" ON public.custom_trainings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all" ON public.custom_trainings;
CREATE POLICY "Enable update for all" ON public.custom_trainings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all" ON public.custom_trainings;
CREATE POLICY "Enable delete for all" ON public.custom_trainings FOR DELETE USING (true);

-- Notificar PostgREST para recarregar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';
