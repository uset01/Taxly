-- ============================================================================
-- TAXLY — SUPABASE SCHEMA (Auth Trigger, Profiles, Audits, Charges & Storage)
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ============================================================================

-- 1. TABELA PROFILES (vinculada ao auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  plan_status text not null default 'free' check (plan_status in ('free', 'active', 'paused', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usuários podem ler o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuários podem atualizar o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger SQL que cria automaticamente o registro em `profiles` com `plan_status = 'free'`
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, plan_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. TABELA AUDITS (histórico de faturas e extratos analisados)
create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  storage_path text,
  bank_name text not null default 'Banco Identificado',
  reference_month text not null default 'Ciclo Atual',
  invoice_total numeric(12, 2) not null default 0,
  monthly_savings numeric(12, 2) not null default 0,
  annual_savings numeric(12, 2) not null default 0,
  total_transactions integer not null default 0,
  pix_total numeric(12, 2) not null default 0,
  boletos_total numeric(12, 2) not null default 0,
  debitos_total numeric(12, 2) not null default 0,
  is_clean boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.audits enable row level security;

create policy "Usuários leem apenas as próprias auditorias"
  on public.audits for select
  using (auth.uid() = user_id);

create policy "Usuários inserem apenas as próprias auditorias"
  on public.audits for insert
  with check (auth.uid() = user_id);

create policy "Usuários excluem apenas as próprias auditorias"
  on public.audits for delete
  using (auth.uid() = user_id);

-- 3. TABELA DETECTED_CHARGES (cada cobrança suspeita vinculada à auditoria e ao user_id)
create table if not exists public.detected_charges (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references public.audits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null default 'Renovação recorrente',
  merchant_name text not null,
  charge_date text not null default 'Recente',
  monthly_amount numeric(12, 2) not null default 0,
  annual_amount numeric(12, 2) not null default 0,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.detected_charges enable row level security;

create policy "Usuários leem apenas as próprias cobranças detectadas"
  on public.detected_charges for select
  using (auth.uid() = user_id);

create policy "Usuários inserem apenas as próprias cobranças detectadas"
  on public.detected_charges for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam apenas as próprias cobranças detectadas"
  on public.detected_charges for update
  using (auth.uid() = user_id);

create policy "Usuários excluem apenas as próprias cobranças detectadas"
  on public.detected_charges for delete
  using (auth.uid() = user_id);

-- 4. BUCKET PRIVADO DE STORAGE: `bill-screenshots` (${user.id}/${timestamp}-${filename})
insert into storage.buckets (id, name, public)
values ('bill-screenshots', 'bill-screenshots', false)
on conflict (id) do nothing;

create policy "Acesso restrito ao dono para upload em bill-screenshots"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bill-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Acesso restrito ao dono para leitura em bill-screenshots"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'bill-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Acesso restrito ao dono para exclusão em bill-screenshots"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'bill-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

