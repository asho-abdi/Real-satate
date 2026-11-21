-- Update office M-PESA / invoice contact number
UPDATE "Setting"
SET value = '"+254999999972"'::jsonb,
    "updatedAt" = NOW()
WHERE key = 'payments.officeMpesaNumber';

INSERT INTO "Setting" (id, key, value, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'payments.officeMpesaNumber', '"+254999999972"'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE key = 'payments.officeMpesaNumber');
