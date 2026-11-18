-- ==============================================================================
-- CHAT INTERNO POR EMPRESA (COM ANEXO DE DOCUMENTOS E COMPRESSÃO) - SUPABASE
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
    attachment_size INTEGER,
    attachment_original_size INTEGER,
    attachment_mime_type TEXT,
    mentioned_user_ids UUID[] NOT NULL DEFAULT '{}',
    mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
    reply_to_id UUID REFERENCES public.company_messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir colunas de anexo e menções caso a tabela já exista de versões anteriores
ALTER TABLE public.company_messages ADD COLUMN IF NOT EXISTS attachment_path TEXT;
ALTER TABLE public.company_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.company_messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER;
ALTER TABLE public.company_messages ADD COLUMN IF NOT EXISTS attachment_original_size INTEGER;
ALTER TABLE public.company_messages ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT;
ALTER TABLE public.company_messages ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE public.company_messages ADD COLUMN IF NOT EXISTS mentions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Atualizar e garantir constraints de forma idempotente (incluindo categoria 'documento')
ALTER TABLE public.company_messages
    DROP CONSTRAINT IF EXISTS company_messages_category_check;

ALTER TABLE public.company_messages
    ADD CONSTRAINT company_messages_category_check
    CHECK (category IN ('geral', 'visita', 'pendencia', 'documento'));

DO $$
BEGIN
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

CREATE INDEX IF NOT EXISTS idx_company_messages_mentioned_users
    ON public.company_messages USING GIN (mentioned_user_ids);

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

-- 5. Segurança: Row Level Security (RLS) e Permissões da tabela company_messages
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

-- 6. Storage: Bucket 'documents' e políticas RLS para documentos e imagens do chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Documents bucket public read" ON storage.objects;
CREATE POLICY "Documents bucket public read"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Approved users can upload documents" ON storage.objects;
CREATE POLICY "Approved users can upload documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
        AND EXISTS (
            SELECT 1 FROM public.user_links ul
            WHERE ul.user_id = (select auth.uid())
              AND ul.status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Approved users can update documents" ON storage.objects;
CREATE POLICY "Approved users can update documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND EXISTS (
            SELECT 1 FROM public.user_links ul
            WHERE ul.user_id = (select auth.uid())
              AND ul.status = 'approved'
        )
    )
    WITH CHECK (
        bucket_id = 'documents'
        AND EXISTS (
            SELECT 1 FROM public.user_links ul
            WHERE ul.user_id = (select auth.uid())
              AND ul.status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Approved users can delete documents" ON storage.objects;
CREATE POLICY "Approved users can delete documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND EXISTS (
            SELECT 1 FROM public.user_links ul
            WHERE ul.user_id = (select auth.uid())
              AND ul.status = 'approved'
        )
    );

-- 7. Notificações de menções (@pessoa) para usuários marcados no chat
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    company_name TEXT,
    message_id UUID REFERENCES public.company_messages(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'mention',
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_created
    ON public.user_notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
    ON public.user_notifications (recipient_user_id)
    WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_message_id
    ON public.user_notifications (message_id)
    WHERE message_id IS NOT NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_notifications FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO authenticated;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications"
    ON public.user_notifications
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = recipient_user_id);

DROP POLICY IF EXISTS "Approved users can send notifications" ON public.user_notifications;
CREATE POLICY "Approved users can send notifications"
    ON public.user_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (select auth.uid()) = sender_user_id
        AND EXISTS (
            SELECT 1 FROM public.user_links ul
            WHERE ul.user_id = (select auth.uid())
              AND ul.status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications"
    ON public.user_notifications
    FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = recipient_user_id)
    WITH CHECK ((select auth.uid()) = recipient_user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete own notifications"
    ON public.user_notifications
    FOR DELETE
    TO authenticated
    USING ((select auth.uid()) = recipient_user_id);

-- 8. Habilitar sincronização em tempo real (Supabase Realtime)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_messages;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 9. Recarregar o cache do schema no PostgREST / Supabase
NOTIFY pgrst, 'reload schema';
