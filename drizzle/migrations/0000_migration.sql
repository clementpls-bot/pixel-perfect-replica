
create type public.can_category as enum ('Energy Drink','Soda','Soft Drink','Limited Edition');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1), 'collector'),
    new.raw_user_meta_data->>'avatar_url');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  color text not null default '#888888',
  created_at timestamptz not null default now()
);
grant select on public.brands to anon, authenticated;
grant all on public.brands to service_role;
alter table public.brands enable row level security;
create policy "brands public" on public.brands for select using (true);

create table public.cans (
  id uuid primary key default gen_random_uuid(),
  barcode text unique not null,
  name text not null,
  brand_id uuid not null references public.brands(id) on delete cascade,
  release_year int,
  flavour text,
  description text,
  historical_context text,
  image_url text,
  color_primary text not null default '#444444',
  color_secondary text not null default '#111111',
  category public.can_category not null default 'Energy Drink',
  created_at timestamptz not null default now()
);
grant select on public.cans to anon, authenticated;
grant all on public.cans to service_role;
alter table public.cans enable row level security;
create policy "cans public" on public.cans for select using (true);

create table public.user_cans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  can_id uuid not null references public.cans(id) on delete cascade,
  quantity int not null default 1 check (quantity >= 1),
  first_scanned_at timestamptz not null default now(),
  unique (user_id, can_id)
);
grant select, insert, update, delete on public.user_cans to authenticated;
grant all on public.user_cans to service_role;
alter table public.user_cans enable row level security;
create policy "own cans select" on public.user_cans for select to authenticated using (auth.uid() = user_id);
create policy "own cans insert" on public.user_cans for insert to authenticated with check (auth.uid() = user_id);
create policy "own cans update" on public.user_cans for update to authenticated using (auth.uid() = user_id);
create policy "own cans delete" on public.user_cans for delete to authenticated using (auth.uid() = user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  can_id uuid not null references public.cans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "comments public" on public.comments for select using (true);
create policy "own comment insert" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "own comment delete" on public.comments for delete to authenticated using (auth.uid() = user_id);

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null,
  primary key (comment_id, user_id)
);
grant select on public.comment_likes to anon, authenticated;
grant insert, delete on public.comment_likes to authenticated;
grant all on public.comment_likes to service_role;
alter table public.comment_likes enable row level security;
create policy "likes public" on public.comment_likes for select using (true);
create policy "own like insert" on public.comment_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "own like delete" on public.comment_likes for delete to authenticated using (auth.uid() = user_id);

create table public.ratings (
  can_id uuid not null references public.cans(id) on delete cascade,
  user_id uuid not null,
  design smallint check (design between 1 and 5),
  taste smallint check (taste between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (can_id, user_id)
);
grant select on public.ratings to anon, authenticated;
grant insert, update on public.ratings to authenticated;
grant all on public.ratings to service_role;
alter table public.ratings enable row level security;
create policy "ratings public" on public.ratings for select using (true);
create policy "own rating insert" on public.ratings for insert to authenticated with check (auth.uid() = user_id);
create policy "own rating update" on public.ratings for update to authenticated using (auth.uid() = user_id);

insert into public.brands (slug,name,color) values
('monster','Monster','#7ac142'),('red-bull','Red Bull','#db0a40'),('coca-cola','Coca-Cola','#e41e2b'),
('pepsi','Pepsi','#1f4fa3'),('rockstar','Rockstar','#f2b705'),('burn','Burn','#f15a22');

insert into public.cans (barcode,name,brand_id,release_year,flavour,description,historical_context,color_primary,color_secondary,category)
select v.barcode,v.name,b.id,v.yr,v.flavour,v.descr,v.hist,v.c1,v.c2,v.cat::public.can_category
from (values
('5060337500401','Monster Energy Original','monster',2002,'Original','The iconic black can with the green claw.','Launched by Hansen Natural in 2002, the claw logo became one of the most recognizable marks in energy drinks.','#1a1a1a','#7ac142','Energy Drink'),
('5060337500784','Monster Ultra White','monster',2012,'Citrus (zero sugar)','Light, crisp and sugar-free.','Ultra White kicked off the Ultra line, pivoting Monster toward zero-sugar drinkers.','#f2f2f2','#9a9a9a','Energy Drink'),
('5060639126361','Monster Pipeline Punch','monster',2016,'Passion fruit, orange, guava','A Juice Monster inspired by Hawaii''s North Shore.','Named after the Banzai Pipeline surf break, it became a cult favourite.','#f48fb1','#ff7043','Energy Drink'),
('5060337502580','Monster Mango Loco','monster',2014,'Mango','Juice Monster with Día de los Muertos artwork.','Its skull artwork celebrates Mexican folk art traditions.','#29b6f6','#ffca28','Energy Drink'),
('5060896625492','Monster Ultra Paradise','monster',2018,'Kiwi, lime, cucumber','Green, refreshing, zero sugar.','Released as part of the Ultra colour series.','#66bb6a','#c5e1a5','Energy Drink'),
('5060896620008','Monster x Halo Infinite','monster',2021,'Original','Collector can for the Halo Infinite launch.','Limited run featuring Master Chief, with in-game XP codes under the tab.','#2e7d32','#d4af37','Limited Edition'),
('9002490100070','Red Bull Original','red-bull',1987,'Original','The can that started it all.','Dietrich Mateschitz adapted the Thai drink Krating Daeng and launched in Austria in 1987.','#1e3a8a','#c0c0c0','Energy Drink'),
('9002490205973','Red Bull Sugarfree','red-bull',2003,'Original (sugar-free)','All the wings, none of the sugar.','One of the first mass-market sugar-free energy drinks.','#60a5fa','#e5e7eb','Energy Drink'),
('9002490233891','Red Bull Red Edition','red-bull',2013,'Watermelon','The red edition.','The Editions line introduced fruit flavours with colour-coded cans.','#dc2626','#fca5a5','Energy Drink'),
('9002490242152','Red Bull Tropical Edition','red-bull',2014,'Tropical fruits','The yellow edition.','Became the best-selling Edition worldwide.','#facc15','#f97316','Energy Drink'),
('9002490254759','Red Bull Winter Edition 2023','red-bull',2023,'Fig & apple','Seasonal winter release.','Winter Editions are available for only a few months each year.','#7c3aed','#e9d5ff','Limited Edition'),
('5449000000996','Coca-Cola Classic','coca-cola',1886,'Cola','The original recipe in its signature red.','Created by pharmacist John Pemberton in Atlanta in 1886.','#e41e2b','#ffffff','Soda'),
('5449000131805','Coca-Cola Zero Sugar','coca-cola',2005,'Cola (zero sugar)','Real taste, zero sugar.','Launched as Coke Zero in 2005, reformulated as Zero Sugar in 2017.','#111111','#e41e2b','Soda'),
('5449000214911','Diet Coke','coca-cola',1982,'Cola (diet)','The silver can.','The first brand extension under the Coca-Cola trademark.','#d1d5db','#e41e2b','Soda'),
('5449000236623','Coca-Cola Christmas Can','coca-cola',2020,'Cola','Holiday polar bear artwork.','Coca-Cola''s winter imagery helped shape the modern Santa Claus.','#b91c1c','#fde68a','Limited Edition'),
('4060800001580','Pepsi Cola','pepsi',1893,'Cola','The blue globe classic.','Invented as "Brad''s Drink" by Caleb Bradham in North Carolina, 1893.','#1f4fa3','#e11d48','Soda'),
('4060800100245','Pepsi Max','pepsi',1993,'Cola (zero sugar)','Maximum taste, no sugar.','First launched in the UK in 1993.','#0b0b2b','#3b82f6','Soda'),
('4060800165817','Pepsi Lime','pepsi',2005,'Cola & lime','Citrus twist on the classic.','Released across Europe as a seasonal variant.','#16a34a','#1f4fa3','Soda'),
('4060800300027','7UP Lemon Lime','pepsi',1929,'Lemon-lime','Crisp, clear, caffeine-free.','Originally named "Bib-Label Lithiated Lemon-Lime Soda".','#22c55e','#ef4444','Soft Drink'),
('0818094005777','Rockstar Original','rockstar',2001,'Original','Party like a rockstar.','Founded by Russell Weiner in Las Vegas in 2001.','#111111','#f2b705','Energy Drink'),
('0818094005807','Rockstar Punched','rockstar',2008,'Fruit punch','The punched variant.','Juice-based line aimed at fruit-forward drinkers.','#dc2626','#111111','Energy Drink'),
('0818094006576','Rockstar Recovery','rockstar',2010,'Lemonade','Non-carbonated electrolyte energy.','Pioneered the still-energy category.','#facc15','#111111','Energy Drink'),
('5449000165862','Burn Original','burn',1997,'Original','Fuel your fire.','Launched by Coca-Cola in Europe as its global energy brand.','#111111','#f15a22','Energy Drink'),
('5449000188489','Burn Zero','burn',2012,'Original (sugar-free)','Fire without sugar.','Introduced to compete with sugar-free rivals.','#374151','#f97316','Energy Drink'),
('5449000214805','Burn Dark Energy','burn',2018,'Dark berries','Dark, intense flavour.','A nightlife-themed reformulation.','#1e1b4b','#a855f7','Energy Drink'),
('5000112611861','Fanta Orange','coca-cola',1940,'Orange','Bright, bubbly orange.','Created in Germany during WWII due to syrup import restrictions.','#f97316','#1d4ed8','Soft Drink')
) as v(barcode,name,brand_slug,yr,flavour,descr,hist,c1,c2,cat)
join public.brands b on b.slug = v.brand_slug;
