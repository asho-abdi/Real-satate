-- Seed for schema real_estate (already applied remotely via MCP).
-- Keep this file as the local reference for future resets.

insert into real_estate.properties (id, code, name, property_type, status, address_line_1, city, country, timezone)
values
  ('11111111-1111-1111-1111-111111111111', 'SKY', 'Skyline Heights', 'mixed_use', 'active', '100 Skyline Ave', 'Seattle', 'US', 'America/Los_Angeles'),
  ('22222222-2222-2222-2222-222222222222', 'HAR', 'Harbor Point', 'residential', 'active', '45 Harbor Way', 'Seattle', 'US', 'America/Los_Angeles'),
  ('33333333-3333-3333-3333-333333333333', 'DTP', 'Downtown Plaza', 'commercial', 'active', '9 Market St', 'Seattle', 'US', 'America/Los_Angeles'),
  ('44444444-4444-4444-4444-444444444444', 'MAR', 'Marina Suites', 'hospitality', 'active', '12 Marina Blvd', 'Seattle', 'US', 'America/Los_Angeles')
on conflict (code) do nothing;
