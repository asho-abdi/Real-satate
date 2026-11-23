-- Lease rent accounting: rent-free concessions, advance receipts, allocations.
-- Safe additive migration — does not rewrite historical payment amounts.

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'RENT_FREE';

DO $$ BEGIN
  CREATE TYPE "RentReceiptKind" AS ENUM ('MONTHLY', 'ADVANCE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "rentFreeMonths" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rentDueDay" INTEGER;

ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "rentFreeMonths" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rentDueDay" INTEGER;

ALTER TABLE "MonthlyPayment"
  ADD COLUMN IF NOT EXISTS "isRentFree" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isAdvance" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "RentReceipt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID,
  "businessId" UUID,
  "kind" "RentReceiptKind" NOT NULL DEFAULT 'MONTHLY',
  "amount" DECIMAL(12,2) NOT NULL,
  "monthsCovered" INTEGER NOT NULL DEFAULT 1,
  "startMonth" TEXT,
  "method" "PaymentMethod",
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "reference" TEXT,
  "receivedByName" TEXT,
  "agentName" TEXT,
  "officeMpesaNumber" TEXT,
  "receiptNumber" TEXT,
  "notes" TEXT,
  "recordedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RentReceipt_tenantId_idx" ON "RentReceipt"("tenantId");
CREATE INDEX IF NOT EXISTS "RentReceipt_businessId_idx" ON "RentReceipt"("businessId");
CREATE INDEX IF NOT EXISTS "RentReceipt_paymentDate_idx" ON "RentReceipt"("paymentDate");
CREATE INDEX IF NOT EXISTS "RentReceipt_kind_idx" ON "RentReceipt"("kind");

CREATE TABLE IF NOT EXISTS "RentAllocation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "receiptId" UUID NOT NULL,
  "month" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "monthlyPaymentId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RentAllocation_receiptId_month_key" ON "RentAllocation"("receiptId", "month");
CREATE INDEX IF NOT EXISTS "RentAllocation_month_idx" ON "RentAllocation"("month");
CREATE INDEX IF NOT EXISTS "RentAllocation_monthlyPaymentId_idx" ON "RentAllocation"("monthlyPaymentId");

DO $$ BEGIN
  ALTER TABLE "RentReceipt"
    ADD CONSTRAINT "RentReceipt_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RentReceipt"
    ADD CONSTRAINT "RentReceipt_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RentReceipt"
    ADD CONSTRAINT "RentReceipt_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RentAllocation"
    ADD CONSTRAINT "RentAllocation_receiptId_fkey"
    FOREIGN KEY ("receiptId") REFERENCES "RentReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RentAllocation"
    ADD CONSTRAINT "RentAllocation_monthlyPaymentId_fkey"
    FOREIGN KEY ("monthlyPaymentId") REFERENCES "MonthlyPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
