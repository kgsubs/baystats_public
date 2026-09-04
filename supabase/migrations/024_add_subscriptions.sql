create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  ls_subscription_id varchar(255) unique,
  ls_customer_id varchar(255) not null,
  ls_customer_portal_url text,
  plan_tier varchar(50) not null default 'monthly',
  status varchar(50) not null default 'active',
  current_period_end timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_subscriptions_ls_customer on subscriptions(ls_customer_id);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
