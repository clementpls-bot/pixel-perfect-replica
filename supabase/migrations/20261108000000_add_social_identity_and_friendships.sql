-- Cansdex social identity and reciprocal friendships.
-- UUID remains the immutable technical identity; username is the unique public handle;
-- display_name is the freely chosen label shown around the app.

alter table public.profiles
  add column if not exists display_name text;

update public.profiles
set display_name = username
where display_name is null or btrim(display_name) = '';

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));


alter table public.profiles
  drop constraint if exists profiles_display_name_length;
alter table public.profiles
  add constraint profiles_display_name_length
  check (display_name is null or char_length(btrim(display_name)) between 1 and 32);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_low_id uuid generated always as (least(requester_id, addressee_id)) stored,
  user_high_id uuid generated always as (greatest(requester_id, addressee_id)) stored,
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_one_pair unique (user_low_id, user_high_id)
);

-- Keep the direction of a request immutable while it is pending. A declined/cancelled
-- pair may be restarted by either participant, in which case the new sender becomes requester.
create or replace function public.cansdex_guard_friendship_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status in ('accepted', 'declined') then
    if auth.uid() <> old.addressee_id
      or new.requester_id <> old.requester_id
      or new.addressee_id <> old.addressee_id then
      raise exception 'Only the recipient can respond to this friendship request';
    end if;
  elsif old.status = 'pending' and new.status = 'cancelled' then
    if auth.uid() <> old.requester_id
      or new.requester_id <> old.requester_id
      or new.addressee_id <> old.addressee_id then
      raise exception 'Only the sender can cancel this friendship request';
    end if;
  elsif old.status in ('declined', 'cancelled') and new.status = 'pending' then
    if auth.uid() not in (old.requester_id, old.addressee_id)
      or new.requester_id <> auth.uid()
      or new.addressee_id = auth.uid()
      or not (new.addressee_id in (old.requester_id, old.addressee_id)) then
      raise exception 'Only a participant can restart this friendship request';
    end if;
    if public.cansdex_users_blocked(new.requester_id, new.addressee_id) then
      raise exception 'This user cannot receive a friendship request';
    end if;
  else
    raise exception 'Invalid friendship state transition';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cansdex_guard_friendship_update on public.friendships;
create trigger cansdex_guard_friendship_update
before update on public.friendships
for each row execute function public.cansdex_guard_friendship_update();

create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status);
create index if not exists friendships_addressee_status_idx
  on public.friendships (addressee_id, status);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

create or replace function public.cansdex_users_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$$;

revoke all on function public.cansdex_users_blocked(uuid, uuid) from public;
grant execute on function public.cansdex_users_blocked(uuid, uuid) to authenticated;

alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;

drop policy if exists "Users can view their friendship rows" on public.friendships;
create policy "Users can view their friendship rows"
  on public.friendships for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

drop policy if exists "Users can send friendship requests" on public.friendships;
create policy "Users can send friendship requests"
  on public.friendships for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and addressee_id <> (select auth.uid())
    and status = 'pending'
    and not public.cansdex_users_blocked(requester_id, addressee_id)
  );

drop policy if exists "Recipients can respond to friendship requests" on public.friendships;
create policy "Recipients can respond to friendship requests"
  on public.friendships for update to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (addressee_id = (select auth.uid()) and status in ('accepted', 'declined'));

drop policy if exists "Senders can cancel friendship requests" on public.friendships;
create policy "Senders can cancel friendship requests"
  on public.friendships for update to authenticated
  using (requester_id = (select auth.uid()) and status = 'pending')
  with check (requester_id = (select auth.uid()) and status = 'cancelled');

drop policy if exists "Senders can retry declined friendship requests" on public.friendships;
create policy "Senders can retry declined friendship requests"
  on public.friendships for update to authenticated
  using (
    (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()))
    and status in ('declined', 'cancelled')
  )
  with check (
    requester_id = (select auth.uid())
    and addressee_id <> (select auth.uid())
    and status = 'pending'
    and not public.cansdex_users_blocked(requester_id, addressee_id)
  );

drop policy if exists "Friends can end an accepted friendship" on public.friendships;
create policy "Friends can end an accepted friendship"
  on public.friendships for delete to authenticated
  using (
    (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()))
    and status = 'accepted'
  );

drop policy if exists "Users can view their own blocks" on public.user_blocks;
create policy "Users can view their own blocks"
  on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

drop policy if exists "Users can block other accounts" on public.user_blocks;
create policy "Users can block other accounts"
  on public.user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));

drop policy if exists "Users can unblock accounts" on public.user_blocks;
create policy "Users can unblock accounts"
  on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- A block also removes any existing friendship/request between the two accounts.
create or replace function public.cansdex_cleanup_friendship_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.friendships f
  where (f.requester_id = new.blocker_id and f.addressee_id = new.blocked_id)
     or (f.requester_id = new.blocked_id and f.addressee_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists cansdex_cleanup_friendship_on_block on public.user_blocks;
create trigger cansdex_cleanup_friendship_on_block
after insert on public.user_blocks
for each row execute function public.cansdex_cleanup_friendship_on_block();

grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
