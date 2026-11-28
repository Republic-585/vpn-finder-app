create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'pending' check (status in ('pending','active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.partner_memberships (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  telegram_id bigint not null references public.telegram_profiles(telegram_id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager')),
  status text not null default 'active' check (status in ('invited','active','revoked')),
  invited_by_telegram_id bigint references public.telegram_profiles(telegram_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (partner_id, telegram_id)
);
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_telegram_id bigint not null references public.telegram_profiles(telegram_id) on delete restrict,
  partner_id uuid references public.partners(id) on delete set null,
  service_id text references public.vpn_services(id) on delete set null,
  application_type text not null default 'new_service' check (application_type in ('new_service','claim_existing','invitation')),
  service_name text not null check (char_length(service_name) between 1 and 120),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 32768),
  status text not null default 'submitted' check (status in ('draft','submitted','reviewing','changes_requested','approved','published','rejected')),
  admin_note text,
  reviewed_by_telegram_id bigint,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_applications_status_created_idx on public.partner_applications(status, created_at desc);
create index if not exists partner_applications_applicant_idx on public.partner_applications(applicant_telegram_id, created_at desc);
create table if not exists public.partner_services (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  service_id text not null references public.vpn_services(id) on delete restrict,
  status text not null default 'active' check (status in ('pending','active','suspended')),
  created_at timestamptz not null default now(),
  unique (partner_id, service_id),
  unique (service_id)
);
create table if not exists public.partner_service_versions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  service_id text not null references public.vpn_services(id) on delete restrict,
  submitted_by_telegram_id bigint not null references public.telegram_profiles(telegram_id) on delete restrict,
  version_number integer not null check (version_number > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 32768),
  status text not null default 'pending' check (status in ('pending','approved','changes_requested','rejected')),
  moderator_note text,
  reviewed_by_telegram_id bigint,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (service_id, version_number)
);
create index if not exists partner_service_versions_queue_idx on public.partner_service_versions(status, created_at desc);
create table if not exists public.affiliate_programs (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  service_id text not null references public.vpn_services(id) on delete restrict,
  referral_url text not null check (referral_url ~ '^https://'),
  commission_model text not null default 'manual' check (commission_model in ('cpa','revshare','hybrid','manual')),
  commission_value numeric(12,4),
  commission_currency text not null default 'RUB' check (commission_currency ~ '^[A-Z]{3}$'),
  confirmation_method text not null default 'manual' check (confirmation_method in ('manual','api','webhook','import')),
  status text not null default 'active' check (status in ('active','paused','ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, service_id)
);
create table if not exists public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  service_id text not null references public.vpn_services(id) on delete restrict,
  click_id uuid references public.affiliate_clicks(click_id) on delete set null,
  external_conversion_id text,
  amount numeric(14,2),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  source text not null default 'manual' check (source in ('manual','api','webhook','import')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 8192),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (partner_id, external_conversion_id)
);
create index if not exists affiliate_conversions_partner_idx on public.affiliate_conversions(partner_id, created_at desc);
create index if not exists affiliate_conversions_service_idx on public.affiliate_conversions(service_id, status, created_at desc);
create table if not exists public.partner_invites (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  invite_code_hash text not null unique,
  preassigned_telegram_id bigint references public.telegram_profiles(telegram_id) on delete cascade,
  created_by_telegram_id bigint not null references public.telegram_profiles(telegram_id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_telegram_id bigint references public.telegram_profiles(telegram_id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.partner_integrations (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  service_id text not null references public.vpn_services(id) on delete cascade,
  integration_type text not null check (integration_type in ('api','webhook','import')),
  status text not null default 'pending' check (status in ('pending','active','paused','revoked')),
  endpoint_url text,
  secret_vault_id text,
  public_config jsonb not null default '{}'::jsonb check (jsonb_typeof(public_config) = 'object' and pg_column_size(public_config) <= 8192),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, service_id, integration_type)
);
create or replace function public.partner_dashboard_stats(p_service_ids text[], p_since timestamptz default null)
returns table(service_id text, views bigint, clicks bigint, unique_clicks bigint, conversions bigint)
language sql stable set search_path = public
as $$
  with service_set as (select unnest(coalesce(p_service_ids, array[]::text[])) as service_id),
  view_counts as (
    select e.service_id, count(*)::bigint as views
    from public.analytics_events e join service_set s on s.service_id=e.service_id
    where e.event_name='service_view' and (p_since is null or e.occurred_at>=p_since) group by e.service_id
  ),
  click_counts as (
    select c.service_id,count(*)::bigint as clicks,
      count(distinct coalesce('tg:'||c.telegram_id::text,'session:'||c.session_id::text,'click:'||c.click_id::text))::bigint as unique_clicks
    from public.affiliate_clicks c join service_set s on s.service_id=c.service_id
    where p_since is null or c.clicked_at>=p_since group by c.service_id
  ),
  conversion_counts as (
    select c.service_id,count(*)::bigint as conversions
    from public.affiliate_conversions c join service_set s on s.service_id=c.service_id
    where c.status='confirmed' and (p_since is null or c.confirmed_at>=p_since) group by c.service_id
  )
  select s.service_id,coalesce(v.views,0),coalesce(k.clicks,0),coalesce(k.unique_clicks,0),coalesce(x.conversions,0)
  from service_set s left join view_counts v on v.service_id=s.service_id
  left join click_counts k on k.service_id=s.service_id left join conversion_counts x on x.service_id=s.service_id;
$$;
alter table public.partners enable row level security;
alter table public.partner_memberships enable row level security;
alter table public.partner_applications enable row level security;
alter table public.partner_services enable row level security;
alter table public.partner_service_versions enable row level security;
alter table public.affiliate_programs enable row level security;
alter table public.affiliate_conversions enable row level security;
alter table public.partner_invites enable row level security;
alter table public.partner_integrations enable row level security;
revoke all on public.partners,public.partner_memberships,public.partner_applications,public.partner_services,public.partner_service_versions,public.affiliate_programs,public.affiliate_conversions,public.partner_invites,public.partner_integrations from anon,authenticated;
grant all on public.partners,public.partner_memberships,public.partner_applications,public.partner_services,public.partner_service_versions,public.affiliate_programs,public.affiliate_conversions,public.partner_invites,public.partner_integrations to service_role;
revoke all on function public.partner_dashboard_stats(text[],timestamptz) from public,anon,authenticated;
grant execute on function public.partner_dashboard_stats(text[],timestamptz) to service_role;
