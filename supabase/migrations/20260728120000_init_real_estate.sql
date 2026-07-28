-- Real Estate Management System — initial Supabase schema
-- Adapted for Supabase Auth (auth.users) + public domain tables

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  first_name text not null default '',
  last_name text not null default '',
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index profiles_status_idx on public.profiles (status);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  is_system_role boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null,
  code text unique not null,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  primary key (user_id, role_id)
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  scope_type text not null check (scope_type in ('global', 'property', 'building')),
  scope_id uuid
);

create index user_scopes_user_type_idx on public.user_scopes (user_id, scope_type);

-- ---------------------------------------------------------------------------
-- Portfolio
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  property_type text not null
    check (property_type in ('residential', 'commercial', 'mixed_use', 'hospitality')),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state_region text,
  country text not null,
  postal_code text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index properties_status_idx on public.properties (status);
create index properties_type_idx on public.properties (property_type);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  code text not null,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  number_of_floors integer check (number_of_floors is null or number_of_floors >= 0),
  manager_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, code)
);

create index buildings_property_idx on public.buildings (property_id);
create index buildings_status_idx on public.buildings (status);

create table public.floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete restrict,
  floor_number integer not null,
  name text,
  status text not null default 'active'
    check (status in ('active', 'partial', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, floor_number)
);

create index floors_building_idx on public.floors (building_id);

create table public.unit_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  occupancy_mode text not null
    check (occupancy_mode in ('residential', 'commercial', 'short_term')),
  base_rate numeric(14, 2) not null default 0 check (base_rate >= 0),
  description text,
  status text not null default 'active' check (status in ('active', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  scope text not null check (scope in ('building', 'unit', 'shared')),
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete restrict,
  floor_id uuid not null references public.floors (id) on delete restrict,
  category_id uuid references public.unit_categories (id) on delete set null,
  code text not null,
  name text,
  unit_type text not null default 'apartment',
  occupancy_mode text not null
    check (occupancy_mode in ('residential', 'commercial', 'short_term', 'hybrid')),
  status text not null default 'available'
    check (status in ('available', 'occupied', 'reserved', 'maintenance', 'inactive')),
  availability text not null default 'immediate'
    check (availability in ('immediate', 'in_7_days', 'in_30_days', 'unavailable')),
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(4, 2) check (bathrooms is null or bathrooms >= 0),
  area_sqm numeric(12, 2) check (area_sqm is null or area_sqm >= 0),
  base_rate numeric(14, 2) check (base_rate is null or base_rate >= 0),
  cleaning_status text not null default 'clean'
    check (cleaning_status in ('clean', 'dirty', 'cleaning_in_progress', 'inspected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (building_id, code)
);

create index units_building_idx on public.units (building_id);
create index units_floor_idx on public.units (floor_id);
create index units_mode_idx on public.units (occupancy_mode);
create index units_status_idx on public.units (status);
create index units_building_status_idx on public.units (building_id, status);

create table public.unit_amenities (
  unit_id uuid not null references public.units (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  primary key (unit_id, amenity_id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  building_id uuid references public.buildings (id) on delete set null,
  unit_id uuid references public.units (id) on delete set null,
  category text not null
    check (category in ('exterior', 'interior', 'amenity', 'floor_plan')),
  status text not null default 'draft' check (status in ('published', 'draft')),
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index media_building_idx on public.media_assets (building_id);
create index media_unit_idx on public.media_assets (unit_id);

-- ---------------------------------------------------------------------------
-- Parties
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  external_code text unique,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  government_id_type text,
  government_id_number text,
  date_of_birth date,
  status text not null default 'prospect'
    check (status in ('prospect', 'active', 'inactive', 'blacklisted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tenants_email_idx on public.tenants (email);
create index tenants_status_idx on public.tenants (status);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text,
  registration_number text unique,
  tax_number text unique,
  email text,
  phone text,
  contact_person text,
  business_category text,
  status text not null default 'prospect'
    check (status in ('prospect', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  nationality text,
  date_of_birth date,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_type text,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Leases
-- ---------------------------------------------------------------------------
create table public.leases (
  id uuid primary key default gen_random_uuid(),
  lease_number text unique not null,
  unit_id uuid not null references public.units (id) on delete restrict,
  lease_type text not null check (lease_type in ('residential', 'commercial')),
  business_id uuid references public.businesses (id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'active', 'expired', 'terminated', 'cancelled', 'expiring', 'ended', 'negotiation')),
  start_date date not null,
  end_date date not null,
  notice_date date,
  currency_code char(3) not null default 'USD',
  deposit_amount numeric(14, 2) not null default 0 check (deposit_amount >= 0),
  rent_amount numeric(14, 2) not null default 0 check (rent_amount >= 0),
  billing_frequency text not null default 'monthly'
    check (billing_frequency in ('monthly', 'quarterly', 'yearly', 'custom')),
  contract_duration text,
  lease_agreement text,
  created_by uuid references public.profiles (id) on delete set null,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date < end_date)
);

create index leases_unit_idx on public.leases (unit_id);
create index leases_type_idx on public.leases (lease_type);
create index leases_status_idx on public.leases (status);
create index leases_dates_idx on public.leases (start_date, end_date);

create table public.lease_parties (
  lease_id uuid not null references public.leases (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  party_role text not null
    check (party_role in ('primary', 'co_tenant', 'occupant', 'guarantor')),
  primary key (lease_id, tenant_id)
);

create table public.lease_charges (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases (id) on delete cascade,
  charge_type text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  frequency text not null
    check (frequency in ('one_time', 'monthly', 'quarterly', 'yearly', 'custom')),
  start_date date not null,
  end_date date,
  is_active boolean not null default true
);

create index lease_charges_lease_idx on public.lease_charges (lease_id);

-- ---------------------------------------------------------------------------
-- Short-term reservations (Airbnb)
-- ---------------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text unique not null,
  unit_id uuid not null references public.units (id) on delete restrict,
  guest_id uuid not null references public.guests (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  check_in_date date not null,
  check_out_date date not null,
  adults_count integer not null default 1 check (adults_count >= 1),
  children_count integer not null default 0 check (children_count >= 0),
  currency_code char(3) not null default 'USD',
  base_amount numeric(14, 2) not null default 0 check (base_amount >= 0),
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  cleaning_status text not null default 'clean'
    check (cleaning_status in ('clean', 'dirty', 'cleaning_in_progress', 'inspected')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_in_date < check_out_date)
);

create index reservations_unit_idx on public.reservations (unit_id);
create index reservations_guest_idx on public.reservations (guest_id);
create index reservations_status_idx on public.reservations (status);
create index reservations_dates_idx on public.reservations (unit_id, check_in_date, check_out_date);

create table public.reservation_charges (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  charge_type text not null,
  description text,
  amount numeric(14, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index reservation_charges_res_idx on public.reservation_charges (reservation_id);

-- ---------------------------------------------------------------------------
-- Finance (foundation)
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  lease_id uuid references public.leases (id) on delete restrict,
  reservation_id uuid references public.reservations (id) on delete restrict,
  invoice_type text not null
    check (invoice_type in ('lease', 'reservation', 'adjustment', 'deposit')),
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'partially_paid', 'paid', 'void')),
  issue_date date not null,
  due_date date not null,
  currency_code char(3) not null default 'USD',
  subtotal_amount numeric(14, 2) not null check (subtotal_amount >= 0),
  tax_amount numeric(14, 2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  balance_amount numeric(14, 2) not null check (balance_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lease_id is not null or reservation_id is not null)
);

create index invoices_lease_idx on public.invoices (lease_id);
create index invoices_reservation_idx on public.invoices (reservation_id);
create index invoices_status_idx on public.invoices (status);
create index invoices_due_idx on public.invoices (due_date);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  line_type text not null,
  reference_id uuid,
  description text not null,
  quantity numeric(14, 2) not null default 1 check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  line_total numeric(14, 2) not null check (line_total >= 0)
);

create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text unique not null,
  payer_type text not null check (payer_type in ('tenant', 'business', 'guest')),
  payer_id uuid not null,
  payment_method text not null
    check (payment_method in ('cash', 'card', 'bank_transfer', 'mobile_money', 'wallet', 'other')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'reversed', 'refunded')),
  currency_code char(3) not null default 'USD',
  amount numeric(14, 2) not null check (amount >= 0),
  paid_at timestamptz,
  received_by uuid references public.profiles (id) on delete set null,
  reference_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_payer_idx on public.payments (payer_type, payer_id);
create index payments_status_idx on public.payments (status);
create index payments_paid_at_idx on public.payments (paid_at);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  allocated_amount numeric(14, 2) not null check (allocated_amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, invoice_id)
);

create index payment_allocations_payment_idx on public.payment_allocations (payment_id);
create index payment_allocations_invoice_idx on public.payment_allocations (invoice_id);

-- ---------------------------------------------------------------------------
-- Maintenance
-- ---------------------------------------------------------------------------
create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text unique not null,
  property_id uuid references public.properties (id) on delete restrict,
  building_id uuid references public.buildings (id) on delete restrict,
  floor_id uuid references public.floors (id) on delete restrict,
  unit_id uuid references public.units (id) on delete restrict,
  reported_by_user_id uuid references public.profiles (id) on delete set null,
  reported_by_tenant_id uuid references public.tenants (id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled')),
  assigned_to_user_id uuid references public.profiles (id) on delete set null,
  vendor_id uuid references public.vendors (id) on delete set null,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  estimated_cost numeric(14, 2) check (estimated_cost is null or estimated_cost >= 0),
  actual_cost numeric(14, 2) check (actual_cost is null or actual_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index maintenance_property_idx on public.maintenance_requests (property_id);
create index maintenance_building_idx on public.maintenance_requests (building_id);
create index maintenance_unit_idx on public.maintenance_requests (unit_id);
create index maintenance_status_idx on public.maintenance_requests (status);

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_actor_idx on public.audit_logs (actor_user_id);
create index audit_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_created_idx on public.audit_logs (created_at);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  message text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index activity_entity_idx on public.activity_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Auth profile bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    'active'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_scopes enable row level security;
alter table public.properties enable row level security;
alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.unit_categories enable row level security;
alter table public.amenities enable row level security;
alter table public.units enable row level security;
alter table public.unit_amenities enable row level security;
alter table public.media_assets enable row level security;
alter table public.tenants enable row level security;
alter table public.businesses enable row level security;
alter table public.guests enable row level security;
alter table public.vendors enable row level security;
alter table public.leases enable row level security;
alter table public.lease_parties enable row level security;
alter table public.lease_charges enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_charges enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.activity_logs enable row level security;

-- Authenticated staff can read/write operational data (tighten with roles later)
create policy "Authenticated read profiles" on public.profiles
  for select to authenticated using (true);
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "Authenticated full access properties" on public.properties
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access buildings" on public.buildings
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access floors" on public.floors
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access unit_categories" on public.unit_categories
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access amenities" on public.amenities
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access units" on public.units
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access unit_amenities" on public.unit_amenities
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access media_assets" on public.media_assets
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access tenants" on public.tenants
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access businesses" on public.businesses
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access guests" on public.guests
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access vendors" on public.vendors
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access leases" on public.leases
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access lease_parties" on public.lease_parties
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access lease_charges" on public.lease_charges
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access reservations" on public.reservations
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access reservation_charges" on public.reservation_charges
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access invoices" on public.invoices
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access invoice_lines" on public.invoice_lines
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access payments" on public.payments
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access payment_allocations" on public.payment_allocations
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access maintenance_requests" on public.maintenance_requests
  for all to authenticated using (true) with check (true);
create policy "Authenticated read audit_logs" on public.audit_logs
  for select to authenticated using (true);
create policy "Authenticated insert audit_logs" on public.audit_logs
  for insert to authenticated with check (true);
create policy "Authenticated full access activity_logs" on public.activity_logs
  for all to authenticated using (true) with check (true);
create policy "Authenticated read roles" on public.roles
  for select to authenticated using (true);
create policy "Authenticated read permissions" on public.permissions
  for select to authenticated using (true);
create policy "Authenticated read user_roles" on public.user_roles
  for select to authenticated using (true);
create policy "Authenticated read role_permissions" on public.role_permissions
  for select to authenticated using (true);
create policy "Authenticated read user_scopes" on public.user_scopes
  for select to authenticated using (true);

-- Service role / dashboard development: allow anon read for demo seed views if needed
-- Prefer authenticated; service role bypasses RLS.