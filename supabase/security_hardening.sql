-- ==============================================================================
-- SCRIPT DE ENDURECIMENTO DE SEGURANÇA (RLS, RBAC, STORAGE & RPC) - SUPABASE
-- Execute TODO este script no SQL Editor do Supabase (https://supabase.com/dashboard).
-- Todo o script está envolvido em um único bloco DO $security_hardening$ para que
-- seja executado atomicamente de ponta a ponta, independente de onde o cursor estiver.
-- ==============================================================================

DO $security_hardening$
DECLARE
  tbl TEXT;
  pol RECORD;
  internal_tables TEXT[] := ARRAY[
    'companies',
    'groups',
    'contracts',
    'deliverables',
    'trainings',
    'inventory',
    'convocations',
    'group_contacts',
    'custom_trainings',
    'company_messages',
    'user_notifications',
    'ipa_campaigns',
    'ipa_partners',
    'ipa_professionals'
  ];
BEGIN
  -- 1. Tabelas exclusivamente internas (somente usuários autenticados)
  FOREACH tbl IN ARRAY internal_tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon;', tbl);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', tbl);

      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY "Authenticated full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
        tbl
      );
    END IF;
  END LOOP;

  -- 2. Tabela public.profiles (autenticados leem, usuário altera apenas o próprio perfil)
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'REVOKE ALL ON public.profiles FROM anon;';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;';

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles;', pol.policyname);
    END LOOP;

    EXECUTE 'CREATE POLICY "Authenticated users view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);';
    EXECUTE 'CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);';
    EXECUTE 'CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);';
  END IF;

  -- 3. Função auxiliar sem recursão para verificar se o usuário é Admin aprovado
  EXECUTE $ddl$
    CREATE OR REPLACE FUNCTION public.is_approved_admin()
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      SELECT EXISTS (
        SELECT 1
        FROM public.user_links
        WHERE user_id = (select auth.uid())
          AND status = 'approved'
          AND (role = 'Admin' OR sector = 'IPA')
      );
    $fn$;
  $ddl$;
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_approved_admin() FROM PUBLIC, anon;';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_approved_admin() TO authenticated;';

  -- 4. Tabela public.user_links (previne auto-aprovação e escalação para Admin)
  IF to_regclass('public.user_links') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.user_links ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'REVOKE ALL ON public.user_links FROM anon;';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_links TO authenticated;';

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_links' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_links;', pol.policyname);
    END LOOP;

    EXECUTE 'CREATE POLICY "Users view own links and admins view all" ON public.user_links FOR SELECT TO authenticated USING ((select auth.uid()) = user_id OR public.is_approved_admin());';
    EXECUTE $ddl$
      CREATE POLICY "Users request pending link only"
        ON public.user_links FOR INSERT TO authenticated
        WITH CHECK (((select auth.uid()) = user_id AND status = 'pending') OR public.is_approved_admin());
    $ddl$;
    EXECUTE 'CREATE POLICY "Admins update user links" ON public.user_links FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());';
    EXECUTE 'CREATE POLICY "Admins delete user links" ON public.user_links FOR DELETE TO authenticated USING (public.is_approved_admin());';
  END IF;

  -- 5. Tabela public.cat_records (anon só envia nova CAT; leitura/edição/exclusão só autenticados)
  IF to_regclass('public.cat_records') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.cat_records ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'REVOKE ALL ON public.cat_records FROM anon;';
    EXECUTE 'GRANT INSERT ON public.cat_records TO anon;';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.cat_records TO authenticated;';

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cat_records' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.cat_records;', pol.policyname);
    END LOOP;

    EXECUTE $ddl$
      CREATE POLICY "Public can submit CAT records"
        ON public.cat_records FOR INSERT TO anon, authenticated
        WITH CHECK (
          length(coalesce(trim(company_name), '')) >= 2
          AND length(coalesce(trim(employee_name), '')) >= 3
        );
    $ddl$;
    EXECUTE 'CREATE POLICY "Authenticated users manage CAT records" ON public.cat_records FOR SELECT TO authenticated USING (true);';
    EXECUTE 'CREATE POLICY "Authenticated users update CAT records" ON public.cat_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Authenticated users delete CAT records" ON public.cat_records FOR DELETE TO authenticated USING (true);';
  END IF;

  -- 6. Tabela public.training_classes (garante coluna signatures; leitura pública; gestão somente autenticados)
  IF to_regclass('public.training_classes') IS NOT NULL THEN
    EXECUTE $ddl$ALTER TABLE public.training_classes ADD COLUMN IF NOT EXISTS signatures JSONB DEFAULT '{}'::jsonb;$ddl$;
    EXECUTE 'ALTER TABLE public.training_classes ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'REVOKE ALL ON public.training_classes FROM anon;';
    EXECUTE 'GRANT SELECT ON public.training_classes TO anon, authenticated;';
    EXECUTE 'GRANT INSERT, UPDATE, DELETE ON public.training_classes TO authenticated;';

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_classes' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.training_classes;', pol.policyname);
    END LOOP;

    EXECUTE 'CREATE POLICY "Public can view training classes" ON public.training_classes FOR SELECT TO anon, authenticated USING (true);';
    EXECUTE 'CREATE POLICY "Authenticated users manage training classes" ON public.training_classes FOR INSERT TO authenticated WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Authenticated users update training classes" ON public.training_classes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Authenticated users delete training classes" ON public.training_classes FOR DELETE TO authenticated USING (true);';
  END IF;

  -- 7. Tabela public.training_enrollments (anon só inscreve em turma com status 'Aberta')
  IF to_regclass('public.training_enrollments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'REVOKE ALL ON public.training_enrollments FROM anon;';
    EXECUTE 'GRANT INSERT ON public.training_enrollments TO anon;';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_enrollments TO authenticated;';

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_enrollments' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.training_enrollments;', pol.policyname);
    END LOOP;

    EXECUTE $ddl$
      CREATE POLICY "Public can register only in open training classes"
        ON public.training_enrollments FOR INSERT TO anon, authenticated
        WITH CHECK (
          turma_id IS NOT NULL
          AND length(coalesce(trim(nome), '')) >= 3
          AND EXISTS (
            SELECT 1
            FROM public.training_classes tc
            WHERE tc.id = turma_id
              AND lower(coalesce(tc.status, 'Aberta')) = 'aberta'
          )
        );
    $ddl$;
    EXECUTE 'CREATE POLICY "Authenticated users view training enrollments" ON public.training_enrollments FOR SELECT TO authenticated USING (true);';
    EXECUTE 'CREATE POLICY "Authenticated users update training enrollments" ON public.training_enrollments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Authenticated users delete training enrollments" ON public.training_enrollments FOR DELETE TO authenticated USING (true);';
  END IF;

  -- 8. Tabela dedicada de tokens de assinatura + RPCs seguras cross-device
  IF to_regclass('public.training_classes') IS NOT NULL THEN
    EXECUTE $ddl$
      CREATE TABLE IF NOT EXISTS public.turma_signing_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT NOT NULL UNIQUE,
        turma_id UUID NOT NULL REFERENCES public.training_classes(id) ON DELETE CASCADE,
        role_key TEXT NOT NULL,
        instructor_id TEXT,
        signer_name TEXT NOT NULL DEFAULT '',
        role_title TEXT NOT NULL DEFAULT '',
        turma_name TEXT NOT NULL DEFAULT '',
        course_name TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'revoked')),
        signed_at TIMESTAMPTZ,
        signature_data_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    $ddl$;
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_turma_signing_tokens_turma_id ON public.turma_signing_tokens(turma_id);';
    EXECUTE 'ALTER TABLE public.turma_signing_tokens ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'REVOKE ALL ON public.turma_signing_tokens FROM anon;';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.turma_signing_tokens TO authenticated;';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users manage signing tokens" ON public.turma_signing_tokens;';
    EXECUTE 'CREATE POLICY "Authenticated users manage signing tokens" ON public.turma_signing_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);';

    EXECUTE $ddl$
      CREATE OR REPLACE FUNCTION public.get_turma_signing_token(p_token TEXT)
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      DECLARE
        v_tok public.turma_signing_tokens%ROWTYPE;
      BEGIN
        IF p_token IS NULL OR length(trim(p_token)) < 12 THEN
          RETURN NULL;
        END IF;

        SELECT * INTO v_tok
        FROM public.turma_signing_tokens
        WHERE token = p_token
        LIMIT 1;

        IF NOT FOUND OR v_tok.status = 'revoked' THEN
          RETURN NULL;
        END IF;

        RETURN jsonb_build_object(
          'token', v_tok.token,
          'turmaId', v_tok.turma_id,
          'roleKey', v_tok.role_key,
          'instructorId', v_tok.instructor_id,
          'signerName', v_tok.signer_name,
          'roleTitle', v_tok.role_title,
          'turmaName', v_tok.turma_name,
          'courseName', v_tok.course_name,
          'status', v_tok.status,
          'createdAt', v_tok.created_at,
          'signedAt', v_tok.signed_at,
          'signatureDataUrl', v_tok.signature_data_url
        );
      END;
      $fn$;
    $ddl$;
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_turma_signing_token(TEXT) FROM PUBLIC;';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_turma_signing_token(TEXT) TO anon, authenticated;';

    EXECUTE $ddl$
      CREATE OR REPLACE FUNCTION public.complete_turma_signing_token(
        p_turma_id UUID,
        p_token TEXT,
        p_signature_data_url TEXT
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      DECLARE
        v_tok public.turma_signing_tokens%ROWTYPE;
        v_row public.training_classes%ROWTYPE;
        v_now TIMESTAMPTZ := now();
        v_now_iso TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
        v_sigs JSONB;
        v_sig_entry JSONB;
      BEGIN
        IF p_turma_id IS NULL OR p_token IS NULL OR length(trim(p_token)) < 12 THEN
          RAISE EXCEPTION 'Token inválido';
        END IF;

        IF p_signature_data_url IS NULL
           OR left(p_signature_data_url, 22) <> 'data:image/png;base64,'
           OR length(p_signature_data_url) > 600000 THEN
          RAISE EXCEPTION 'Formato ou tamanho da assinatura inválido';
        END IF;

        SELECT * INTO v_tok
        FROM public.turma_signing_tokens
        WHERE token = p_token AND turma_id = p_turma_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Token não localizado nesta turma';
        END IF;

        IF v_tok.status <> 'pending' THEN
          RAISE EXCEPTION 'Este link já foi utilizado ou cancelado';
        END IF;

        IF v_tok.role_key !~ '^(instructor(_[0-9]+)?|tech_lead|coordinator)$' THEN
          RAISE EXCEPTION 'Papel de assinatura inválido';
        END IF;

        UPDATE public.turma_signing_tokens
        SET
          status = 'signed',
          signed_at = v_now,
          signature_data_url = p_signature_data_url
        WHERE id = v_tok.id;

        SELECT * INTO v_row
        FROM public.training_classes
        WHERE id = p_turma_id
        FOR UPDATE;

        IF FOUND THEN
          v_sig_entry := jsonb_build_object(
            'dataUrl', p_signature_data_url,
            'signerName', COALESCE(v_tok.signer_name, ''),
            'roleTitle', COALESCE(v_tok.role_title, ''),
            'signedAt', v_now_iso,
            'instructorId', v_tok.instructor_id
          );

          v_sigs := COALESCE(v_row.signatures, '{}'::jsonb) || jsonb_build_object(
            v_tok.role_key, v_sig_entry,
            'updatedAt', v_now_iso
          );

          IF v_tok.role_key = 'instructor' THEN
            v_sigs := v_sigs || jsonb_build_object('instructor_0', v_sig_entry);
          ELSIF v_tok.role_key = 'instructor_0' THEN
            v_sigs := v_sigs || jsonb_build_object('instructor', v_sig_entry);
          END IF;

          UPDATE public.training_classes
          SET
            signatures = v_sigs,
            updated_at = v_now
          WHERE id = p_turma_id;
        END IF;

        RETURN jsonb_build_object(
          'success', true,
          'token', jsonb_build_object(
            'token', v_tok.token,
            'turmaId', v_tok.turma_id,
            'roleKey', v_tok.role_key,
            'signerName', v_tok.signer_name,
            'roleTitle', v_tok.role_title,
            'turmaName', v_tok.turma_name,
            'courseName', v_tok.course_name,
            'status', 'signed',
            'signedAt', v_now_iso,
            'signatureDataUrl', p_signature_data_url
          )
        );
      END;
      $fn$;
    $ddl$;
    EXECUTE 'REVOKE ALL ON FUNCTION public.complete_turma_signing_token(UUID, TEXT, TEXT) FROM PUBLIC;';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_turma_signing_token(UUID, TEXT, TEXT) TO anon, authenticated;';
  END IF;

  -- 9. Storage bucket 'documents': upload, update e remoção restritos a autenticados
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Public Insert" ON storage.objects;';
    EXECUTE 'DROP POLICY IF EXISTS "Public Update" ON storage.objects;';
    EXECUTE 'DROP POLICY IF EXISTS "Public Delete" ON storage.objects;';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated Insert Documents" ON storage.objects;';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated Update Documents" ON storage.objects;';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated Delete Documents" ON storage.objects;';
    EXECUTE $ddl$CREATE POLICY "Authenticated Insert Documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');$ddl$;
    EXECUTE $ddl$CREATE POLICY "Authenticated Update Documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');$ddl$;
    EXECUTE $ddl$CREATE POLICY "Authenticated Delete Documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');$ddl$;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem permissão para alterar políticas de storage.objects neste papel; configure via Dashboard Storage.';
  END;

  -- 10. Proteger função get_db_size() contra chamadas anônimas
  EXECUTE $ddl$
    CREATE OR REPLACE FUNCTION public.get_db_size()
    RETURNS bigint
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_catalog
    AS $fn$
    BEGIN
      RETURN pg_database_size(current_database());
    END;
    $fn$;
  $ddl$;
  EXECUTE 'REVOKE ALL ON FUNCTION public.get_db_size() FROM PUBLIC, anon;';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_db_size() TO authenticated;';

  -- 11. Recarregar schema do PostgREST
  PERFORM pg_notify('pgrst', 'reload schema');
END
$security_hardening$;
