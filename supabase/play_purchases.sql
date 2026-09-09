-- Schema for saving web payment email recovery
create table if not exists play_purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  paystack_ref text unique,
  keys int default 0,
  is_premium boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookup by email
create index if not exists idx_play_purchases_email on play_purchases(email);

-- RLS: reads stay open (client polls payment-complete.tsx by paystack_ref/
-- email to detect the webhook-written row). Writes are now service-role
-- only — paystack-webhook and revenuecat-webhook insert/update this table
-- after verifying the payment; no anon insert/update/delete.
alter table play_purchases enable row level security;
drop policy if exists "allow all on play_purchases" on play_purchases;
drop policy if exists "public select play_purchases" on play_purchases;
create policy "public select play_purchases"
  on play_purchases for select
  to anon, authenticated
  using (true);
