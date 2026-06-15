-- ==========================================
-- GESTÃO TOTALSAFETY - SUPABASE SCHEMA
-- ==========================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- 1. Groups Table
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Companies Table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    contact TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Contracts Table
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    contract_number TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'vencido')),
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Deliverables Table
CREATE TABLE public.deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('programa', 'laudo', 'contrato', 'treinamento', 'visita_tecnica', 'outro')),
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_elaboracao', 'entregue', 'adiado')),
    due_date DATE,
    validity_date DATE,
    delivered_date DATE,
    file_name TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Trainings Table
CREATE TABLE public.trainings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    date DATE,
    time TEXT,
    status TEXT DEFAULT 'agendado' CHECK (status IN ('agendado', 'concluido', 'adiado', 'nao_feito')),
    instructor TEXT,
    participants INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_companies_group_id ON public.companies(group_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_company_id ON public.deliverables(company_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_contract_id ON public.deliverables(contract_id);
CREATE INDEX IF NOT EXISTS idx_trainings_company_id ON public.trainings(company_id);
CREATE INDEX IF NOT EXISTS idx_trainings_deliverable_id ON public.trainings(deliverable_id);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================
CREATE TRIGGER handle_updated_at_groups BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER handle_updated_at_companies BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER handle_updated_at_contracts BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER handle_updated_at_deliverables BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER handle_updated_at_trainings BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Locking down access to authenticated users only.

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

-- GROUPS
CREATE POLICY "Enable read access for authenticated users" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.groups FOR DELETE TO authenticated USING (true);

-- COMPANIES
CREATE POLICY "Enable read access for authenticated users" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.companies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.companies FOR DELETE TO authenticated USING (true);

-- CONTRACTS
CREATE POLICY "Enable read access for authenticated users" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.contracts FOR DELETE TO authenticated USING (true);

-- DELIVERABLES
CREATE POLICY "Enable read access for authenticated users" ON public.deliverables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.deliverables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.deliverables FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.deliverables FOR DELETE TO authenticated USING (true);

-- TRAININGS
CREATE POLICY "Enable read access for authenticated users" ON public.trainings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.trainings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.trainings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.trainings FOR DELETE TO authenticated USING (true);
