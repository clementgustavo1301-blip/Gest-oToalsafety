-- 1. Criar o Bucket 'documents' no Supabase Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Adicionar coluna para armazenar o arquivo do contrato (caso não exista)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS file_path TEXT;

-- 3. Políticas de Segurança para o Storage (Permitir tudo para testes MVP)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'documents' );

CREATE POLICY "Public Insert" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'documents' );

CREATE POLICY "Public Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'documents' );

CREATE POLICY "Public Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'documents' );
