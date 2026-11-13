-- ==============================================================================
-- CHAT INTERNO POR EMPRESA (COMUNICAÇÃO ENTRE TÉCNICOS) - SUPABASE
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Script idempotente (seguro para executar mais de uma vez sem apagar dados).
-- ==============================================================================

-- 1. Extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tabela de mensagens por empresa
CREATE TABLE IF NOT EXISTS public.company_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT,
    author_sector TEXT,
    category TEXT NOT NULL DEFAULT 'geral',
    message TEXT NOT NULL DEFAULT '',
    attachment_path TEXT,
    attachment_name TEXT,
    reply_to_id UUID REFERENCES public.company_messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir constraints de forma idempotente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'company_messages_category_check'
          AND conrelid = 'public.company_messages'::regclass
    ) THEN
        ALTER TABLE public.company_messages
            ADD CONSTRAINT company_messages_category_check
            CHECK (category IN ('geral', 'visita', 'pendencia'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'company_messages_content_check'
          AND conrelid = 'public.company_messages'::regclass
    ) THEN
        ALTER TABLE public.company_messages
            ADD CONSTRAINT company_messages_content_check
            CHECK (char_length(btrim(message)) > 0 OR attachment_path IS NOT NULL);
    END IF;
END $$;

-- 3. Índices de performance (chaves estrangeiras, paginação por empresa e RLS)
CREATE INDEX IF NOT EXISTS idx_company_messages_company_created
    ON public.company_messages (company_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_company_messages_user_id
    ON public.company_messages (user_id);

CREATE INDEX IF NOT EXISTS idx_company_messages_reply_to_id
    ON public.company_messages (reply_to_id)
    WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_links_user_id_status
    ON public.user_links (user_id, status);

-- 4. Trigger automático de updated_at
CREATE OR REPLACE FUNCTION public.set_company_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_messages_updated_at ON public.company_messages;
CREATE TRIGGER trg_company_messages_updated_at
    BEFORE UPDATE ON public.company_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_messages_updated_at();

-- 5. Segurança: Row Level Security (RLS) e Permissões
ALTER TABLE public.company_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.company_messages FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_messages TO authenticated;

-- Leitura: apenas usuários autenticados com vínculo aprovado na plataforma
DROP POLICY IF EXISTS "Approved users can view company messages" ON public.company_messages;
CREATE POLICY "Approved users can view company messages"
    ON public.company_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_links ul
            WHERE ul.user_id = (select auth.uid())
              AND ul.status = 'approved'
        )
    );

-- Envio: apenas usuários aprovados, garantindo que user_id pertence ao remetente
DROP POLICY IF EXISTS "Approved users can send company messages" ON public.company_messages;
CREATE POLICY "Approved users can send company messages"
    ON public.company_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (select auth.uid()) = user_id
        AND EXISTS (
            SELECT 1 FROM public.user_links ul
            WHERE ul.user_id = (select auth.uid())
              AND ul.status = 'approved'
        )
    );

-- Edição: apenas o autor pode editar sua própria mensagem (sem transferir user_id)
DROP POLICY IF EXISTS "Authors can update own company messages" ON public.company_messages;
CREATE POLICY "Authors can update own company messages"
    ON public.company_messages
    FOR UPDATE
    TO authenticated
    USING (
        (select auth.uid()) = user_id
        AND EXISTS (
            SELECT 1 FROM public.user_links ul
            WHERE ul.user_id = (select auth.uid())
              AND ul.status = 'approved'
        )
    )
    WITH CHECK (
        (select auth.uid()) = user_id
    );

-- Exclusão: autor da mensagem ou Admin aprovado
DROP POLICY IF EXISTS "Authors or admins can delete company messages" ON public.company_messages;
CREATE POLICY "Authors or admins can delete company messages"
    ON public.company_messages
    FOR DELETE
    TO authenticated
    USING (
        (
            (select auth.uid()) = user_id
            AND EXISTS (
                SELECT 1 FROM public.user_links ul
                WHERE ul.user_id = (select auth.uid())
                  AND ul.status = 'approved'
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.user_links ul
            WHERE ul.user_id = (select auth.uid())
              AND ul.status = 'approved'
              AND ul.role = 'Admin'
        )
    );

-- 6. Habilitar sincronização em tempo real (Supabase Realtime)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_messages;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 7. Recarregar o cache do schema no PostgREST / Supabase
NOTIFY pgrst, 'reload schema';
