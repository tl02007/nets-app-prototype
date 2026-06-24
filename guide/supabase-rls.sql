-- Row-level security policies for Supabase

-- Enable RLS on all tables
alter table users enable row level security;
alter table transactions enable row level security;
alter table circles enable row level security;
alter table circle_members enable row level security;
alter table circle_expenses enable row level security;

-- users: users can only see their own profile
create policy "Users can view own profile"
  on users for select
  using (auth.uid()::text = id);

create policy "Users can update own profile"
  on users for update
  using (auth.uid()::text = id);

-- transactions: users can see their own transactions
create policy "Users can view own transactions"
  on transactions for select
  using (true); -- For now, allow all; can refine with user_id column

-- circles: users can see circles they're members of
create policy "Users can view circles they're in"
  on circles for select
  using (id in (
    select circle_id from circle_members where member_id = auth.uid()::text
  ));

create policy "Users can create circles"
  on circles for insert
  with check (true);

create policy "Users can update circles they're in"
  on circles for update
  using (id in (
    select circle_id from circle_members where member_id = auth.uid()::text
  ));

-- circle_members: users can see members of circles they're in
create policy "Users can view circle members"
  on circle_members for select
  using (circle_id in (
    select circle_id from circle_members where member_id = auth.uid()::text
  ));

create policy "Users can add circle members"
  on circle_members for insert
  with check (circle_id in (
    select circle_id from circle_members where member_id = auth.uid()::text
  ));

-- circle_expenses: users can see expenses in circles they're in
create policy "Users can view expenses in their circles"
  on circle_expenses for select
  using (circle_id in (
    select circle_id from circle_members where member_id = auth.uid()::text
  ));

create policy "Users can add expenses to their circles"
  on circle_expenses for insert
  with check (circle_id in (
    select circle_id from circle_members where member_id = auth.uid()::text
  ));

-- Create settlements table for tracking payments
create table if not exists settlements (
  id text primary key,
  circle_id text references circles(id) on delete cascade,
  from_member_id text,
  to_member_id text,
  amount numeric,
  status text,
  nets_transaction_id text,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

alter table settlements enable row level security;

create policy "Users can view settlements in their circles"
  on settlements for select
  using (circle_id in (
    select circle_id from circle_members where member_id = auth.uid()::text
  ));

create policy "Users can create settlements"
  on settlements for insert
  with check (circle_id in (
    select circle_id from circle_members where member_id = auth.uid()::text
  ));

-- Create payment_logs for audit trail
create table if not exists payment_logs (
  id text primary key,
  settlement_id text references settlements(id) on delete cascade,
  status text,
  nets_response jsonb,
  error_message text,
  created_at timestamp with time zone default now()
);

alter table payment_logs enable row level security;

create policy "Users can view payment logs for their settlements"
  on payment_logs for select
  using (settlement_id in (
    select id from settlements where circle_id in (
      select circle_id from circle_members where member_id = auth.uid()::text
    )
  ));
