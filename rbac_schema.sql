-- Criação da tabela de Perfis
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT, -- Ex: 'SST', 'Clínica', 'Administrativo'
  role TEXT,   -- Ex: 'Técnico', 'Médico', 'Supervisor', 'Admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ler todos os perfis (útil para listar responsáveis por entregáveis, etc)
CREATE POLICY "Perfis visíveis para todos os usuários logados" 
ON public.profiles FOR SELECT TO authenticated USING (true);

-- Política: Apenas o próprio usuário pode atualizar seu perfil
CREATE POLICY "Usuários atualizam próprio perfil" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Política: Apenas o próprio usuário pode inserir seu perfil inicialmente
CREATE POLICY "Usuários inserem próprio perfil" 
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
