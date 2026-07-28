-- Demo seed data for local / staging Supabase projects
-- Run after migration: supabase db reset OR SQL editor paste

insert into public.properties (id, code, name, property_type, status, address_line_1, city, country, timezone)
values
  ('11111111-1111-1111-1111-111111111111', 'SKY', 'Skyline Heights', 'mixed_use', 'active', '100 Skyline Ave', 'Seattle', 'US', 'America/Los_Angeles'),
  ('22222222-2222-2222-2222-222222222222', 'HAR', 'Harbor Point', 'residential', '45 Harbor Way', 'Seattle', 'US', 'America/Los_Angeles'),
  ('33333333-3333-3333-3333-333333333333', 'DTP', 'Downtown Plaza', 'commercial', '9 Market St', 'Seattle', 'US', 'America/Los_Angeles'),
  ('44444444-4444-4444-4444-444444444444', 'MAR', 'Marina Suites', 'hospitality', '12 Marina Blvd', 'Seattle', 'US', 'America/Los_Angeles')
on conflict (code) do nothing;

insert into public.buildings (id, property_id, code, name, status, number_of_floors, manager_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'A', 'Skyline Tower A', 'active', 18, 'Mariam Yusuf'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'HVP', 'Harbor View Plaza', 'active', 10, 'David Brown'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'DP', 'Downtown Plaza', 'active', 12, 'Aisha Kareem'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'MSW', 'Marina Suites West', 'active', 8, 'Front Desk')
on conflict do nothing;

insert into public.floors (id, building_id, floor_number, name, status)
values
  ('f1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 12, 'Floor 12', 'active'),
  ('f2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 15, 'Floor 15', 'partial'),
  ('f3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1, 'Ground', 'active'),
  ('f4444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1, 'Floor 1', 'active')
on conflict do nothing;

insert into public.unit_categories (id, name, occupancy_mode, base_rate, description, status)
values
  ('c1111111-1111-1111-1111-111111111111', '2 Bedroom Deluxe', 'residential', 1850, 'Premium family apartment', 'active'),
  ('c2222222-2222-2222-2222-222222222222', 'Commercial Corner', 'commercial', 3600, 'Retail-ready suite', 'active'),
  ('c3333333-3333-3333-3333-333333333333', 'Short-Stay Premium', 'short_term', 145, 'Furnished hospitality unit', 'active')
on conflict (name) do nothing;

insert into public.amenities (id, name, scope, status)
values
  ('a1111111-1111-1111-1111-111111111111', 'Rooftop Pool', 'building', 'active'),
  ('a2222222-2222-2222-2222-222222222222', 'Smart Lock', 'unit', 'active'),
  ('a3333333-3333-3333-3333-333333333333', 'Coworking Lounge', 'shared', 'active')
on conflict (name) do nothing;

insert into public.units (
  id, building_id, floor_id, category_id, code, unit_type, occupancy_mode, status, availability,
  bedrooms, bathrooms, area_sqm, base_rate, cleaning_status
)
values
  (
    'u1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'f1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    'A-1204', 'apartment', 'residential', 'occupied', 'unavailable', 2, 2, 92, 1850, 'clean'
  ),
  (
    'u2222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'f2222222-2222-2222-2222-222222222222',
    'c1111111-1111-1111-1111-111111111111',
    'A-1502', 'studio', 'residential', 'available', 'immediate', 1, 1, 48, 1200, 'clean'
  ),
  (
    'u3333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'f3333333-3333-3333-3333-333333333333',
    'c2222222-2222-2222-2222-222222222222',
    'DP-S01', 'shop', 'commercial', 'occupied', 'unavailable', null, null, 118, 4800, 'clean'
  ),
  (
    'u4444444-4444-4444-4444-444444444444',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'f4444444-4444-4444-4444-444444444444',
    'c3333333-3333-3333-3333-333333333333',
    'MS-101', 'suite', 'short_term', 'occupied', 'unavailable', 1, 1, 42, 145, 'inspected'
  )
on conflict do nothing;

insert into public.roles (name, description, is_system_role)
values
  ('super_admin', 'Full system access', true),
  ('property_manager', 'Portfolio and leasing operations', true),
  ('front_desk', 'Short-term reservations and guests', true),
  ('accountant', 'Finance and payments', true)
on conflict (name) do nothing;

insert into public.permissions (resource, action, code)
values
  ('properties', 'read', 'properties.read'),
  ('properties', 'write', 'properties.write'),
  ('leases', 'read', 'leases.read'),
  ('leases', 'write', 'leases.write'),
  ('reservations', 'read', 'reservations.read'),
  ('reservations', 'manage', 'reservations.manage'),
  ('payments', 'read', 'payments.read'),
  ('reports', 'read', 'reports.read')
on conflict (code) do nothing;