-- MediRemind guardian link: lets a family member get a push when a dose is
-- missed. Paste this whole file into Supabase → SQL Editor → Run. It is safe
-- to run again after edits (everything is create-or-replace / if-not-exists).
--
-- Model: the patient's app uploads its upcoming dose slots (next 7 days, with
-- taken state). Every 5 minutes a cron job finds slots still untaken 30
-- minutes after they were due and pushes an alert to that patient's guardians
-- through the Expo push service. Users are Supabase anonymous users.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  push_token text,
  language text not null default 'ko',
  timezone text not null default 'Asia/Seoul',
  updated_at timestamptz not null default now()
);

create table if not exists public.guardian_links (
  patient_id uuid not null references auth.users on delete cascade,
  guardian_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (patient_id, guardian_id),
  check (patient_id <> guardian_id)
);
create index if not exists guardian_links_guardian on public.guardian_links (guardian_id);

create table if not exists public.invites (
  code text primary key,
  patient_id uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null
);

create table if not exists public.dose_slots (
  patient_id uuid not null references auth.users on delete cascade,
  id text not null,
  medicine_name text not null,
  due_at timestamptz not null,
  taken_at timestamptz,
  alerted_at timestamptz,
  primary key (patient_id, id)
);
create index if not exists dose_slots_pending
  on public.dose_slots (due_at) where taken_at is null and alerted_at is null;

-- ─── Row level security ──────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.guardian_links enable row level security;
alter table public.invites enable row level security;
alter table public.dose_slots enable row level security;

create or replace function public.is_linked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from guardian_links
    where (patient_id = a and guardian_id = b) or (patient_id = b and guardian_id = a)
  );
$$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_linked(user_id, auth.uid()));
drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists links_read on public.guardian_links;
create policy links_read on public.guardian_links for select to authenticated
  using (patient_id = auth.uid() or guardian_id = auth.uid());
-- Either side may end the link; links are only created through redeem_invite.
drop policy if exists links_delete on public.guardian_links;
create policy links_delete on public.guardian_links for delete to authenticated
  using (patient_id = auth.uid() or guardian_id = auth.uid());

-- invites: no policies, reachable only through the functions below.

drop policy if exists slots_own on public.dose_slots;
create policy slots_own on public.dose_slots for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
drop policy if exists slots_guardian_read on public.dose_slots;
create policy slots_guardian_read on public.dose_slots for select to authenticated
  using (exists (
    select 1 from guardian_links l
    where l.patient_id = dose_slots.patient_id and l.guardian_id = auth.uid()
  ));

-- ─── Functions called by the app ─────────────────────────────────────────────

-- A fresh 6-digit code, valid for 30 minutes, replacing the caller's older ones.
create or replace function public.create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare
  new_code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from invites where patient_id = auth.uid() or expires_at < now();
  loop
    new_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into invites (code, patient_id, expires_at)
      values (new_code, auth.uid(), now() + interval '30 minutes');
      return new_code;
    exception when unique_violation then
      -- try another code
    end;
  end loop;
end;
$$;

-- Links the caller as a guardian of the code's owner; returns the patient id.
create or replace function public.redeem_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select patient_id into target from invites
  where code = trim(p_code) and expires_at > now();
  if target is null then raise exception 'invalid_code'; end if;
  if target = auth.uid() then raise exception 'own_code'; end if;
  insert into guardian_links (patient_id, guardian_id) values (target, auth.uid())
  on conflict do nothing;
  delete from invites where code = trim(p_code);
  return target;
end;
$$;

-- Replaces the caller's slots from p_from on with p_slots
-- ([{id, medicine_name, due_at, taken_at}]). Slots already alerted keep that
-- mark so a resync never alerts twice.
create or replace function public.sync_slots(p_from timestamptz, p_slots jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from dose_slots
  where patient_id = auth.uid() and due_at >= p_from
    and id not in (select s->>'id' from jsonb_array_elements(p_slots) s);
  insert into dose_slots (patient_id, id, medicine_name, due_at, taken_at)
  select auth.uid(), s->>'id', s->>'medicine_name', (s->>'due_at')::timestamptz,
         nullif(s->>'taken_at', '')::timestamptz
  from jsonb_array_elements(p_slots) s
  on conflict (patient_id, id) do update
    set medicine_name = excluded.medicine_name,
        due_at = excluded.due_at,
        taken_at = excluded.taken_at;
  -- History older than two weeks isn't needed by guardians.
  delete from dose_slots where patient_id = auth.uid() and due_at < now() - interval '14 days';
end;
$$;

-- Deletes the caller's account and everything linked to it.
create or replace function public.delete_my_data() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.create_invite() from public, anon;
revoke all on function public.redeem_invite(text) from public, anon;
revoke all on function public.sync_slots(timestamptz, jsonb) from public, anon;
revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.sync_slots(timestamptz, jsonb) to authenticated;
grant execute on function public.delete_my_data() to authenticated;

-- ─── Missed-dose alerts ──────────────────────────────────────────────────────

create or replace function public.check_missed_doses() returns integer
language plpgsql security definer set search_path = public as $$
declare
  msg record;
  sent integer := 0;
begin
  for msg in
    with due as (
      update dose_slots s set alerted_at = now()
      where s.taken_at is null and s.alerted_at is null
        and s.due_at <= now() - interval '30 minutes'
        and s.due_at > now() - interval '6 hours'
      returning s.patient_id, s.medicine_name, s.due_at
    )
    select g.push_token, g.language,
           coalesce(nullif(p.display_name, ''), case when g.language = 'ko' then '가족' else 'Your family member' end) as who,
           d.medicine_name,
           to_char(d.due_at at time zone coalesce(p.timezone, 'Asia/Seoul'), 'HH24:MI') as at
    from due d
    join guardian_links l on l.patient_id = d.patient_id
    join profiles g on g.user_id = l.guardian_id and g.push_token is not null
    left join profiles p on p.user_id = d.patient_id
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'to', msg.push_token,
        'sound', 'default',
        'title', case when msg.language = 'ko' then '💊 복용 확인이 필요해요' else '💊 Missed dose' end,
        'body', case when msg.language = 'ko'
          then format('%s님이 %s %s을(를) 아직 복용하지 않았어요.', msg.who, msg.at, msg.medicine_name)
          else format('%s hasn''t taken %s (%s) yet.', msg.who, msg.medicine_name, msg.at) end,
        'data', jsonb_build_object('type', 'guardian')
      )
    );
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke all on function public.check_missed_doses() from public, anon, authenticated;

select cron.unschedule('mediremind-missed-doses')
where exists (select 1 from cron.job where jobname = 'mediremind-missed-doses');
select cron.schedule('mediremind-missed-doses', '*/5 * * * *', 'select public.check_missed_doses()');
