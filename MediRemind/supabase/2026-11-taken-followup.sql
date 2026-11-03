-- MediRemind 2026-11 update: follow-up push when a missed dose is taken later.
-- Run once in Supabase → SQL Editor (safe to run again).

-- Set once the guardian has been told the dose was taken after all.
alter table public.slot_alerts add column if not exists taken_sent_at timestamptz;

-- Sends one Expo push. Tapping it opens the guardian screen (data.type).
create or replace function public.send_guardian_push(p_token text, p_title text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'to', p_token,
      'sound', 'default',
      'title', p_title,
      'body', p_body,
      'data', jsonb_build_object('type', 'guardian')
    )
  );
end;
$$;
revoke all on function public.send_guardian_push(text, text, text) from public, anon, authenticated;

-- How a guardian's alert names the patient when no name was set.
create or replace function public.family_word(p_language text) returns text
language sql immutable as $$
  select case p_language
    when 'ko' then '가족' when 'ja' then 'ご家族' when 'zh-Hans' then '家人' when 'zh-Hant' then '家人'
    when 'es' then 'Tu familiar' when 'fr' then 'Votre proche' when 'de' then 'Dein Familienmitglied'
    else 'Your family member' end
$$;

create or replace function public.check_missed_doses() returns integer
language plpgsql security definer set search_path = public as $$
declare
  msg record;
  sent integer := 0;
begin
  -- 1. Missed: doses past each guardian's delay that this guardian hasn't
  --    been told about. Doses from before the link existed, or long past, are skipped.
  for msg in
    with due as (
      insert into slot_alerts (patient_id, slot_id, guardian_id)
      select s.patient_id, s.id, l.guardian_id
      from dose_slots s
      join guardian_links l on l.patient_id = s.patient_id
      where s.taken_at is null
        and s.due_at <= now() - make_interval(mins => l.alert_delay_min)
        and s.due_at > now() - make_interval(mins => l.alert_delay_min) - interval '6 hours'
        and s.due_at > l.created_at
      on conflict do nothing
      returning patient_id, slot_id, guardian_id
    )
    select g.push_token, g.language,
           coalesce(nullif(p.display_name, ''), family_word(g.language)) as who,
           s.medicine_name,
           to_char(s.due_at at time zone coalesce(p.timezone, 'Asia/Seoul'), 'HH24:MI') as at
    from due d
    join dose_slots s on s.patient_id = d.patient_id and s.id = d.slot_id
    join profiles g on g.user_id = d.guardian_id and g.push_token is not null
    left join profiles p on p.user_id = d.patient_id
  loop
    perform send_guardian_push(
      msg.push_token,
      case msg.language
        when 'ko' then '💊 복용 확인이 필요해요'
        when 'ja' then '💊 服薬の確認が必要です'
        when 'zh-Hans' then '💊 需要确认服药'
        when 'zh-Hant' then '💊 需要確認服藥'
        when 'es' then '💊 Dosis sin tomar'
        when 'fr' then '💊 Prise oubliée'
        when 'de' then '💊 Einnahme verpasst'
        else '💊 Missed dose' end,
      case msg.language
        when 'ko' then format('%s님이 %s %s을(를) 아직 복용하지 않았어요.', msg.who, msg.at, msg.medicine_name)
        when 'ja' then format('%sさんが%sの%sをまだ服用していません。', msg.who, msg.at, msg.medicine_name)
        when 'zh-Hans' then format('%s还没有服用%s的%s。', msg.who, msg.at, msg.medicine_name)
        when 'zh-Hant' then format('%s還沒有服用%s的%s。', msg.who, msg.at, msg.medicine_name)
        when 'es' then format('%s aún no ha tomado %s (%s).', msg.who, msg.medicine_name, msg.at)
        when 'fr' then format('%s n''a pas encore pris %s (%s).', msg.who, msg.medicine_name, msg.at)
        when 'de' then format('%s hat %s (%s) noch nicht eingenommen.', msg.who, msg.medicine_name, msg.at)
        else format('%s hasn''t taken %s (%s) yet.', msg.who, msg.medicine_name, msg.at) end
    );
    sent := sent + 1;
  end loop;

  -- 2. Taken after all: a guardian who got a missed alert hears once when the
  --    dose is checked later, so they aren't left worrying. Only for alerts
  --    from the last day, and only while still linked.
  for msg in
    with done as (
      update slot_alerts a set taken_sent_at = now()
      from dose_slots s
      where s.patient_id = a.patient_id and s.id = a.slot_id
        and s.taken_at is not null
        and a.taken_sent_at is null
        and a.sent_at > now() - interval '1 day'
      returning a.patient_id, a.slot_id, a.guardian_id
    )
    select g.push_token, g.language,
           coalesce(nullif(p.display_name, ''), family_word(g.language)) as who,
           s.medicine_name,
           to_char(s.due_at at time zone coalesce(p.timezone, 'Asia/Seoul'), 'HH24:MI') as at,
           to_char(s.taken_at at time zone coalesce(p.timezone, 'Asia/Seoul'), 'HH24:MI') as taken
    from done d
    join guardian_links l on l.patient_id = d.patient_id and l.guardian_id = d.guardian_id
    join dose_slots s on s.patient_id = d.patient_id and s.id = d.slot_id
    join profiles g on g.user_id = d.guardian_id and g.push_token is not null
    left join profiles p on p.user_id = d.patient_id
  loop
    perform send_guardian_push(
      msg.push_token,
      case msg.language
        when 'ko' then '✅ 복용을 확인했어요'
        when 'ja' then '✅ 服薬を確認しました'
        when 'zh-Hans' then '✅ 已确认服药'
        when 'zh-Hant' then '✅ 已確認服藥'
        when 'es' then '✅ Dosis tomada'
        when 'fr' then '✅ Prise confirmée'
        when 'de' then '✅ Einnahme bestätigt'
        else '✅ Dose taken' end,
      case msg.language
        when 'ko' then format('%s님이 %s %s을(를) %s에 복용했어요.', msg.who, msg.at, msg.medicine_name, msg.taken)
        when 'ja' then format('%sさんが%sの%sを%sに服用しました。', msg.who, msg.at, msg.medicine_name, msg.taken)
        when 'zh-Hans' then format('%s已于%s服用了%s的%s。', msg.who, msg.taken, msg.at, msg.medicine_name)
        when 'zh-Hant' then format('%s已於%s服用了%s的%s。', msg.who, msg.taken, msg.at, msg.medicine_name)
        when 'es' then format('%s tomó %s (%s) a las %s.', msg.who, msg.medicine_name, msg.at, msg.taken)
        when 'fr' then format('%s a pris %s (%s) à %s.', msg.who, msg.medicine_name, msg.at, msg.taken)
        when 'de' then format('%s hat %s (%s) um %s eingenommen.', msg.who, msg.medicine_name, msg.at, msg.taken)
        else format('%s took %s (%s) at %s.', msg.who, msg.medicine_name, msg.at, msg.taken) end
    );
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke all on function public.check_missed_doses() from public, anon, authenticated;
