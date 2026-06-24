-- Supabase schema for NETS prototype

create table if not exists users (
  id text primary key,
  name text not null,
  first_name text,
  email text not null unique,
  handle text,
  balance numeric,
  tier text,
  bank text,
  created_at timestamp with time zone default now()
);

create table if not exists transactions (
  id text primary key,
  merchant text not null,
  category text not null,
  amount numeric not null,
  type text not null,
  date text not null,
  icon text,
  color text,
  created_at timestamp with time zone default now()
);

create table if not exists circles (
  id text primary key,
  name text not null,
  emoji text,
  cover text,
  status text not null,
  date text,
  activity_type text,
  estimated_cost_per_person numeric,
  circle_confidence text,
  my_affordability_signal text,
  cost_breakdown jsonb,
  alternatives jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists circle_members (
  circle_id text references circles(id) on delete cascade,
  member_id text,
  name text,
  initial text,
  color text,
  paid numeric,
  primary key (circle_id, member_id)
);

create table if not exists circle_expenses (
  id text primary key,
  circle_id text references circles(id) on delete cascade,
  title text,
  merchant text,
  category text,
  amount numeric,
  paid_by_id text,
  time text,
  created_at timestamp with time zone default now()
);

create table if not exists settlements (
  id text primary key,
  circle_id text references circles(id) on delete cascade,
  from_member_id text not null,
  to_member_id text not null,
  amount numeric not null,
  status text not null default 'pending',
  payment_mode text,
  nets_transaction_id text,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

create table if not exists payment_logs (
  id text primary key,
  settlement_id text references settlements(id) on delete cascade,
  status text,
  nets_response jsonb,
  error_message text,
  created_at timestamp with time zone default now()
);
