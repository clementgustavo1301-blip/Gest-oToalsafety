-- Fluxo de turmas e presença para certificados de treinamento.
-- Execute este arquivo uma vez no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.training_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_name text not null default '',
  description text not null default '',
  instructors jsonb not null default '[]'::jsonb,
  instructor_name text not null default '',
  instructor_role text not null default '',
  instructor_registration text not null default '',
  tech_lead jsonb,
  tech_lead_name text not null default '',
  tech_lead_role text not null default '',
  tech_lead_registration text not null default '',
  duration text not null default '',
  validade text not null default '24 meses',
  cert_model text not null default 'modelo1',
  start_date date,
  location text not null default '',
  company text not null default '',
  content text not null default '',
  status text not null default 'Aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_enrollments (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid references public.training_classes(id) on delete set null,
  nome text not null,
  cpf text not null,
  data_nascimento date,
  telefone text,
  empresa text,
  status text not null default 'Inscrito',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_enrollments_turma_id_idx
  on public.training_enrollments(turma_id);

create unique index if not exists training_enrollments_turma_cpf_uidx
  on public.training_enrollments(turma_id, regexp_replace(cpf, '\D', '', 'g'))
  where turma_id is not null;

alter table public.training_classes enable row level security;
alter table public.training_enrollments enable row level security;

drop policy if exists "Public can view training classes" on public.training_classes;
create policy "Public can view training classes"
  on public.training_classes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users manage training classes" on public.training_classes;
create policy "Authenticated users manage training classes"
  on public.training_classes
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Public can register in a training class" on public.training_enrollments;
create policy "Public can register in a training class"
  on public.training_enrollments
  for insert
  to anon, authenticated
  with check (
    turma_id is not null
    and exists (
      select 1
      from public.training_classes tc
      where tc.id = turma_id
    )
  );

drop policy if exists "Authenticated users view training enrollments" on public.training_enrollments;
create policy "Authenticated users view training enrollments"
  on public.training_enrollments
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users update training enrollments" on public.training_enrollments;
create policy "Authenticated users update training enrollments"
  on public.training_enrollments
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users delete training enrollments" on public.training_enrollments;
create policy "Authenticated users delete training enrollments"
  on public.training_enrollments
  for delete
  to authenticated
  using (true);

grant select on public.training_classes to anon, authenticated;
grant insert, update, delete on public.training_classes to authenticated;
grant insert on public.training_enrollments to anon;
grant select, insert, update, delete on public.training_enrollments to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.training_enrollments;
exception
  when duplicate_object then null;
end $$;
