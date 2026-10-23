-- ============================================================
-- BATALHA DO CÉU — Schema Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

create table if not exists public.mcs (
  id         uuid primary key default uuid_generate_v4(),
  nome       text not null,
  cidade     text,
  bio        text,
  pontos     integer not null default 0,
  titulos    integer not null default 0,
  foto_url   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.edicoes (
  id            uuid primary key default uuid_generate_v4(),
  titulo        text not null,
  data          date,
  horario       text,
  local         text,
  descricao     text,
  status        text not null default 'em-breve'
                  check (status in ('em-breve','confirmada','encerrada')),
  limite        integer not null default 8,
  banner_url    text,
  campeao_id    uuid references public.mcs(id) on delete set null,
  participantes uuid[] not null default '{}',
  bracket       jsonb,
  -- Formato: individual (solo), dupla ou trio. Em dupla/trio, `equipes` guarda
  -- [{id, nome, membros:[mc_id,...]}] e o bracket usa o id da equipe em mc1/mc2/winner.
  formato       text not null default 'solo'
                  check (formato in ('solo','dupla','trio')),
  equipes       jsonb not null default '[]'::jsonb,
  -- MCs campeões (integrantes da equipe campeã). No formato solo vale campeao_id.
  campeoes      uuid[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Bancos criados antes do formato dupla/trio: adiciona as colunas novas (idempotente)
alter table public.edicoes
  add column if not exists formato  text  not null default 'solo',
  add column if not exists equipes  jsonb not null default '[]'::jsonb,
  add column if not exists campeoes uuid[] not null default '{}';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'edicoes_formato_check') then
    alter table public.edicoes add constraint edicoes_formato_check check (formato in ('solo','dupla','trio'));
  end if;
end $$;

create table if not exists public.fotos (
  id         uuid primary key default uuid_generate_v4(),
  edicao_id  uuid references public.edicoes(id) on delete set null,
  url        text not null,
  nome       text,
  created_at timestamptz not null default now()
);

-- Configurações gerais do site (ex.: liga/desliga da pontuação automática)
create table if not exists public.configuracoes (
  chave      text primary key,
  valor      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger mcs_updated_at
  before update on public.mcs
  for each row execute function public.handle_updated_at();

create trigger edicoes_updated_at
  before update on public.edicoes
  for each row execute function public.handle_updated_at();

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

alter table public.mcs     enable row level security;
alter table public.edicoes enable row level security;
alter table public.fotos   enable row level security;
alter table public.configuracoes enable row level security;

-- Leitura pública
create policy "mcs_read"    on public.mcs     for select using (true);
create policy "edicoes_read" on public.edicoes for select using (true);
create policy "fotos_read"  on public.fotos   for select using (true);

-- Escrita apenas para admins autenticados
create policy "mcs_write"    on public.mcs     for all using (auth.role() = 'authenticated');
create policy "edicoes_write" on public.edicoes for all using (auth.role() = 'authenticated');
create policy "fotos_write"  on public.fotos   for all using (auth.role() = 'authenticated');

create policy "configuracoes_read"   on public.configuracoes for select using (true);
create policy "configuracoes_insert" on public.configuracoes for insert to authenticated with check (true);
create policy "configuracoes_update" on public.configuracoes for update to authenticated using (true) with check (true);

-- Pontuação automática ligada por padrão
insert into public.configuracoes (chave, valor)
values ('pontuacao_automatica', '{"ativo": true}'::jsonb)
on conflict (chave) do nothing;

-- Event trigger de RLS automático: não deve ser chamável via API pública
-- (só se a função rls_auto_enable existir no projeto, como no Supabase hospedado)
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- ============================================================
-- REALTIME — Habilitar tabela edicoes
-- ============================================================

alter publication supabase_realtime add table public.edicoes;

-- ============================================================
-- STORAGE — Buckets públicos
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('fotos',    'fotos',    true),
  ('banners',  'banners',  true),
  ('avatares', 'avatares', true)
on conflict (id) do nothing;

-- Políticas de storage
create policy "storage_read"
  on storage.objects for select
  using (bucket_id in ('fotos','banners','avatares'));

create policy "storage_write"
  on storage.objects for insert
  with check (bucket_id in ('fotos','banners','avatares') and auth.role() = 'authenticated');

create policy "storage_delete"
  on storage.objects for delete
  using (bucket_id in ('fotos','banners','avatares') and auth.role() = 'authenticated');

-- ============================================================
-- SEED — Dados iniciais
-- ============================================================

insert into public.mcs (id, nome, cidade, bio, pontos, titulos) values
  ('11111111-1111-1111-1111-000000000001', 'Caótico',        'Santa Bárbara d''Oeste', 'MC veterano da cena, fundador da Batalha do Céu. Estilo técnico e liricismo apurado. Referência absoluta no cenário regional.', 520, 2),
  ('11111111-1111-1111-1111-000000000002', 'Trovão MC',       'Americana',              'Potência vocal e rimas contundentes. Especialista em argumento e pressão.',             480, 1),
  ('11111111-1111-1111-1111-000000000003', 'Zika da Palavra', 'Santa Bárbara d''Oeste', 'Rapidez e criatividade sem igual. Especialista em bate-boca e réplica afiada.',         430, 1),
  ('11111111-1111-1111-1111-000000000004', 'Nobre',           'Nova Odessa',            'Lirismo e filosofia de rua. Cada rima conta uma história real do cotidiano periférico.', 390, 0),
  ('11111111-1111-1111-1111-000000000005', 'Kraken',          'Sumaré',                 'Força bruta no microfone. Presença de palco inigualável.',                              350, 0),
  ('11111111-1111-1111-1111-000000000006', 'Profeta',         'Campinas',               'Consciência e espiritualidade nas rimas.',                                             310, 0),
  ('11111111-1111-1111-1111-000000000007', 'Mágico',          'Santa Bárbara d''Oeste', 'Criatividade sem limites. Surpresa garantida em cada round.',                          280, 0),
  ('11111111-1111-1111-1111-000000000008', 'Sertão',          'Piracicaba',             'Sotaque e raiz no freestyle. Traz a cultura do interior para o hip-hop.',              250, 0),
  ('11111111-1111-1111-1111-000000000009', 'Venenoso',        'Hortolândia',            'Veneno nas rimas e sangue frio no palco.',                                             220, 0),
  ('11111111-1111-1111-1111-000000000010', 'Tempestade',      'Indaiatuba',             'Velocidade e impacto.',                                                                190, 0),
  ('11111111-1111-1111-1111-000000000011', 'Guerreiro',       'Araras',                 'Representante da quebrada. Cada batalha é uma guerra.',                                160, 0),
  ('11111111-1111-1111-1111-000000000012', 'Crônico',         'Santa Bárbara d''Oeste', 'Rimas crônicas que viram clássicos. O mais técnico dos MCs locais.',                   140, 0)
on conflict (id) do nothing;

insert into public.edicoes (titulo, data, horario, local, status, limite, descricao, campeao_id, participantes)
values
  ('Batalha do Céu I',   '2018-09-15', '14h', 'Praça Central — SBO',      'encerrada', 8,
   'A edição que começou tudo. 8 MCs, muito freestyle e história sendo escrita nas ruas de SBO.',
   '11111111-1111-1111-1111-000000000001',
   ARRAY['11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000002','11111111-1111-1111-1111-000000000003','11111111-1111-1111-1111-000000000004','11111111-1111-1111-1111-000000000005','11111111-1111-1111-1111-000000000006','11111111-1111-1111-1111-000000000007','11111111-1111-1111-1111-000000000008']::uuid[]),
  ('Batalha do Céu II',  '2019-03-20', '15h', 'Centro Cultural SBO',       'encerrada', 8,
   'Segunda edição com público recorde. Trovão MC despachou a concorrência com autoridade.',
   '11111111-1111-1111-1111-000000000002',
   ARRAY['11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000002','11111111-1111-1111-1111-000000000003','11111111-1111-1111-1111-000000000004','11111111-1111-1111-1111-000000000005','11111111-1111-1111-1111-000000000006','11111111-1111-1111-1111-000000000007','11111111-1111-1111-1111-000000000008']::uuid[]),
  ('Batalha do Céu III', '2019-10-05', '15h', 'Praça Central — SBO',      'encerrada', 8,
   'Primeira edição com MC nacional convidado. Zika da Palavra levou o título.',
   '11111111-1111-1111-1111-000000000003', '{}'),
  ('Batalha do Céu IV',  '2021-06-12', '14h', 'Praça Central — SBO',      'encerrada', 8,
   'Retorno pós-pandemia. Emoção tomou conta da praça. Caótico reconquistou o trono.',
   '11111111-1111-1111-1111-000000000001', '{}'),
  ('Batalha do Céu V',   '2022-09-24', '15h', 'IFSP — Santa Bárbara d''Oeste', 'encerrada', 8,
   'Primeira edição no IFSP. Parceria acadêmica consolidada.',
   '11111111-1111-1111-1111-000000000002', '{}'),
  ('Batalha do Céu VI',  '2024-04-20', '15h', 'Praça Central — SBO',      'encerrada', 16,
   'Edição do aniversário. 16 MCs e a Zika recuperando o trono.',
   '11111111-1111-1111-1111-000000000003', '{}'),
  ('Batalha do Céu VII', '2025-04-12', '15h', 'Praça Central — SBO',      'confirmada', 16,
   'A sétima edição promete ser a maior de todas. 16 MCs, convidados especiais e muita cultura.',
   null, '{}');
