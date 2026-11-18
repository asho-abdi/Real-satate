-- Link refundable security deposits to guest bookings (not accommodation revenue).
ALTER TABLE "SecurityDeposit" ADD COLUMN IF NOT EXISTS "bookingId" UUID;

CREATE INDEX IF NOT EXISTS "SecurityDeposit_bookingId_idx" ON "SecurityDeposit"("bookingId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SecurityDeposit_bookingId_fkey'
  ) THEN
    ALTER TABLE "SecurityDeposit"
      ADD CONSTRAINT "SecurityDeposit_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
