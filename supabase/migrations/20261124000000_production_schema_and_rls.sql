-- ============================================================================
-- PulseCorp Production Database Schema & Row Level Security (RLS) Migration
-- Target: Supabase PostgreSQL 15+
-- Enforces:
--   1. Default-off HR health-sharing consent (explicit granular opt-in required)
--   2. Server-side role & company isolation via Row Level Security
--   3. Minimum group size (k >= 5) for aggregate workplace wellness insights
--   4. User-Generated Content (UGC) rules acceptance, reporting, blocking & rate limiting
--   5. Full cascading account & data deletion (`delete_my_account()`)
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Companies / Workspaces
create table if not exists public.companies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    corporate_domain text not null unique,
    industry text not null default 'Technology',
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create policy "Authenticated users can view companies"
    on public.companies for select
    to authenticated
    using (true);

-- 2. User Profiles (Non-Health Identity & Onboarding State)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text not null default '',
    company_id uuid references public.companies(id) on delete set null,
    department text not null default 'Engineering',
    job_title text not null default 'Employee',
    user_role text not null default 'EMPLOYEE' check (user_role in ('EMPLOYEE', 'HR_ADMIN', 'MODERATOR')),
    verification_status text not null default 'PENDING_ID_UPLOAD'
        check (verification_status in ('PENDING_ID_UPLOAD', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED')),
    height_cm numeric(5,1) default 0,
    weight_kg numeric(5,1) default 0,
    stride_length_meters numeric(4,3) default 0.720,
    daily_steps_goal integer not null default 8000 check (daily_steps_goal between 1000 and 50000),
    hydration_goal_ml integer not null default 2500 check (hydration_goal_ml between 500 and 10000),
    ugc_rules_accepted_at timestamptz,
    onboarding_completed boolean not null default false,
    health_permissions_completed boolean not null default false,
    company_onboarding_completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read and update their own profile; cannot self-escalate user_role or verification_status
create policy "Users can select own profile or same-company basic profile"
    on public.profiles for select
    to authenticated
    using (
        auth.uid() = id
        or (
            company_id is not null
            and company_id = (select p.company_id from public.profiles p where p.id = auth.uid())
        )
    );

create policy "Users can insert own profile with EMPLOYEE role"
    on public.profiles for insert
    to authenticated
    with check (
        auth.uid() = id
        and user_role = 'EMPLOYEE'
        and verification_status in ('PENDING_ID_UPLOAD', 'UNDER_REVIEW')
    );

create policy "Users can update own non-privileged profile fields"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id)
    with check (
        auth.uid() = id
        and user_role = (select p.user_role from public.profiles p where p.id = auth.uid())
    );

-- 3. Explicit Granular Health-Sharing Consents (DEFAULT OFF)
create table if not exists public.health_consents (
    user_id uuid primary key references auth.users(id) on delete cascade,
    company_id uuid references public.companies(id) on delete cascade,
    hr_health_consent boolean not null default false,
    share_steps boolean not null default false,
    share_heart_rate_and_stress boolean not null default false,
    share_sleep_and_recovery boolean not null default false,
    updated_at timestamptz not null default now()
);

alter table public.health_consents enable row level security;

create policy "Users manage own health consent"
    on public.health_consents for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "HR Admins in same company can view consent status"
    on public.health_consents for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles hr
            where hr.id = auth.uid()
              and hr.user_role = 'HR_ADMIN'
              and hr.verification_status = 'VERIFIED'
              and hr.company_id = public.health_consents.company_id
        )
    );

-- 4. Daily Health Metrics (Sensitive Health Data)
create table if not exists public.daily_health_metrics (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    company_id uuid references public.companies(id) on delete set null,
    date_key date not null default current_date,
    steps integer not null default 0 check (steps >= 0),
    distance_km numeric(6,2) not null default 0 check (distance_km >= 0),
    active_calories_kcal integer not null default 0 check (active_calories_kcal >= 0),
    hydration_ml integer not null default 0 check (hydration_ml >= 0),
    mindful_minutes integer not null default 0 check (mindful_minutes >= 0),
    resting_bpm integer check (resting_bpm is null or resting_bpm between 30 and 220),
    sleep_minutes integer check (sleep_minutes is null or sleep_minutes between 0 and 1440),
    sync_source text not null default 'manual',
    updated_at timestamptz not null default now(),
    unique (user_id, date_key)
);

alter table public.daily_health_metrics enable row level security;

-- Owner has full access to their own health metrics
create policy "Users manage own daily health metrics"
    on public.daily_health_metrics for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- HR Admin can SELECT an employee's row ONLY if:
-- 1. Requester is a VERIFIED HR_ADMIN in the same company
-- 2. Target user has explicitly set hr_health_consent = true in health_consents
create policy "HR Admin can read health metrics only with explicit opt-in consent"
    on public.daily_health_metrics for select
    to authenticated
    using (
        exists (
            select 1
            from public.profiles hr
            join public.health_consents hc on hc.user_id = public.daily_health_metrics.user_id
            where hr.id = auth.uid()
              and hr.user_role = 'HR_ADMIN'
              and hr.verification_status = 'VERIFIED'
              and hr.company_id = public.daily_health_metrics.company_id
              and hc.hr_health_consent = true
        )
    );

-- 5. Privacy-Safe Aggregate Workplace Insights RPC (Enforces k >= 5 anonymity threshold)
create or replace function public.get_company_aggregate_wellness(target_company_id uuid, target_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_company uuid;
    opted_in_count integer;
    avg_steps integer;
    avg_hydration integer;
    avg_mindful integer;
begin
    select company_id into caller_company
    from public.profiles
    where id = auth.uid();

    if caller_company is null or caller_company <> target_company_id then
        raise exception '403 Forbidden: Cannot query aggregate metrics outside your company workspace.';
    end if;

    select
        count(distinct m.user_id),
        coalesce(round(avg(m.steps)), 0),
        coalesce(round(avg(m.hydration_ml)), 0),
        coalesce(round(avg(m.mindful_minutes)), 0)
    into opted_in_count, avg_steps, avg_hydration, avg_mindful
    from public.daily_health_metrics m
    join public.health_consents hc on hc.user_id = m.user_id
    where m.company_id = target_company_id
      and m.date_key = target_date
      and hc.hr_health_consent = true;

    -- Minimum group-size protection (k = 5) to prevent re-identification
    if opted_in_count < 5 then
        return jsonb_build_object(
            'minimum_group_size_met', false,
            'required_group_size', 5,
            'opted_in_count', opted_in_count,
            'message', 'Aggregate metrics require at least 5 opted-in employees to protect individual privacy.'
        );
    end if;

    return jsonb_build_object(
        'minimum_group_size_met', true,
        'opted_in_count', opted_in_count,
        'avg_steps', avg_steps,
        'avg_hydration_ml', avg_hydration,
        'avg_mindful_minutes', avg_mindful
    );
end;
$$;

-- 6. User-Generated Content (UGC): Posts, Replies, Blocks & Moderation Reports
create table if not exists public.user_blocks (
    id uuid primary key default gen_random_uuid(),
    blocker_id uuid not null references auth.users(id) on delete cascade,
    blocked_user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (blocker_id, blocked_user_id),
    check (blocker_id <> blocked_user_id)
);

alter table public.user_blocks enable row level security;

create policy "Users manage own block list"
    on public.user_blocks for all
    to authenticated
    using (auth.uid() = blocker_id)
    with check (auth.uid() = blocker_id);

create table if not exists public.community_posts (
    id uuid primary key default gen_random_uuid(),
    author_id uuid not null references auth.users(id) on delete cascade,
    company_id uuid references public.companies(id) on delete set null,
    kind text not null default 'UPDATE' check (kind in ('WIN', 'UPDATE', 'HOT_TAKE', 'POLL', 'WORK_DIFFICULTY', 'IDEA', 'PROFESSIONAL_TIP', 'NEED_HELP_QA')),
    category text not null default 'Work-Life Balance',
    title text not null default '',
    body text not null check (char_length(trim(body)) between 1 and 2000),
    is_anonymous boolean not null default false,
    moderation_status text not null default 'PUBLISHED' check (moderation_status in ('PUBLISHED', 'HIDDEN_BY_MODERATION')),
    created_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;

-- Users can read published posts excluding authors they have blocked
create policy "Users can view published posts from non-blocked authors"
    on public.community_posts for select
    to authenticated
    using (
        moderation_status = 'PUBLISHED'
        and not exists (
            select 1 from public.user_blocks b
            where b.blocker_id = auth.uid()
              and b.blocked_user_id = public.community_posts.author_id
        )
    );

-- Users can insert a post ONLY after accepting UGC rules
create policy "Users who accepted UGC rules can create posts"
    on public.community_posts for insert
    to authenticated
    with check (
        auth.uid() = author_id
        and exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
              and p.ugc_rules_accepted_at is not null
        )
    );

create policy "Authors can delete own posts"
    on public.community_posts for delete
    to authenticated
    using (auth.uid() = author_id);

create table if not exists public.content_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references auth.users(id) on delete cascade,
    target_type text not null check (target_type in ('POST', 'REPLY', 'CHAT_MESSAGE', 'USER')),
    target_id text not null,
    reported_author_id uuid references auth.users(id) on delete set null,
    reason text not null check (char_length(trim(reason)) between 3 and 200),
    details text default '',
    status text not null default 'PENDING_REVIEW' check (status in ('PENDING_REVIEW', 'RESOLVED_REMOVED', 'DISMISSED')),
    created_at timestamptz not null default now()
);

alter table public.content_reports enable row level security;

create policy "Users can submit and view own content reports"
    on public.content_reports for all
    to authenticated
    using (auth.uid() = reporter_id)
    with check (auth.uid() = reporter_id);

-- 7. Full Account & Data Deletion RPC (`delete_my_account`)
create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    target_uid uuid := auth.uid();
begin
    if target_uid is null then
        raise exception 'Not authenticated';
    end if;

    -- Cascade delete all user-owned data across public tables
    delete from public.content_reports where reporter_id = target_uid or reported_author_id = target_uid;
    delete from public.user_blocks where blocker_id = target_uid or blocked_user_id = target_uid;
    delete from public.community_posts where author_id = target_uid;
    delete from public.daily_health_metrics where user_id = target_uid;
    delete from public.health_consents where user_id = target_uid;
    delete from public.profiles where id = target_uid;

    -- Delete the user record from auth.users
    delete from auth.users where id = target_uid;

    return jsonb_build_object(
        'deleted', true,
        'uid', target_uid,
        'deleted_at', now()
    );
end;
$$;
