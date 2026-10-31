-- Payment methods: keep E_BESA for existing rows; add MPESA + AGENT
DO $$ BEGIN ALTER TYPE "PaymentMethod" ADD VALUE 'MPESA'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "PaymentMethod" ADD VALUE 'AGENT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Unit types / usages for offices
DO $$ BEGIN ALTER TYPE "UnitType" ADD VALUE 'COMMERCIAL_OFFICE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "UnitUsage" ADD VALUE 'OFFICE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Deposit + finance document enums
DO $$ BEGIN
  CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'PARTIALLY_RETURNED', 'FULLY_RETURNED', 'DEDUCTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DepositTxnType" AS ENUM ('RECEIVED', 'RETURN', 'DEDUCTION', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FinanceDocType" AS ENUM ('INVOICE', 'RECEIPT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Monthly payment detail columns
ALTER TABLE "MonthlyPayment"
  ADD COLUMN IF NOT EXISTS "reference" TEXT,
  ADD COLUMN IF NOT EXISTS "receivedByName" TEXT,
  ADD COLUMN IF NOT EXISTS "agentName" TEXT,
  ADD COLUMN IF NOT EXISTS "officeMpesaNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "recordedById" UUID;

CREATE INDEX IF NOT EXISTS "MonthlyPayment_receiptNumber_idx" ON "MonthlyPayment"("receiptNumber");

-- Lease charge payment details
ALTER TABLE "LeaseCharge"
  ADD COLUMN IF NOT EXISTS "method" "PaymentMethod",
  ADD COLUMN IF NOT EXISTS "reference" TEXT,
  ADD COLUMN IF NOT EXISTS "receivedByName" TEXT,
  ADD COLUMN IF NOT EXISTS "agentName" TEXT,
  ADD COLUMN IF NOT EXISTS "officeMpesaNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;

CREATE INDEX IF NOT EXISTS "LeaseCharge_receiptNumber_idx" ON "LeaseCharge"("receiptNumber");

-- Booking payment details
ALTER TABLE "BookingPayment"
  ADD COLUMN IF NOT EXISTS "receivedByName" TEXT,
  ADD COLUMN IF NOT EXISTS "agentName" TEXT,
  ADD COLUMN IF NOT EXISTS "officeMpesaNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;

CREATE INDEX IF NOT EXISTS "BookingPayment_receiptNumber_idx" ON "BookingPayment"("receiptNumber");

-- Shop sale payment details
ALTER TABLE "ShopSalePayment"
  ADD COLUMN IF NOT EXISTS "receivedByName" TEXT,
  ADD COLUMN IF NOT EXISTS "agentName" TEXT,
  ADD COLUMN IF NOT EXISTS "officeMpesaNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;

CREATE INDEX IF NOT EXISTS "ShopSalePayment_receiptNumber_idx" ON "ShopSalePayment"("receiptNumber");

-- Security deposits (liability — not revenue)
CREATE TABLE IF NOT EXISTS "SecurityDeposit" (
  "id" UUID NOT NULL,
  "tenantId" UUID,
  "businessId" UUID,
  "shopSaleId" UUID,
  "unitId" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "dateReceived" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  "reference" TEXT,
  "receivedByName" TEXT,
  "agentName" TEXT,
  "officeMpesaNumber" TEXT,
  "status" "DepositStatus" NOT NULL DEFAULT 'HELD',
  "returnedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "deductedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "remainingAmount" DECIMAL(12,2) NOT NULL,
  "returnDate" TIMESTAMP(3),
  "returnMethod" "PaymentMethod",
  "notes" TEXT,
  "createdById" UUID,
  "updatedById" UUID,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityDeposit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SecurityDeposit_tenantId_idx" ON "SecurityDeposit"("tenantId");
CREATE INDEX IF NOT EXISTS "SecurityDeposit_businessId_idx" ON "SecurityDeposit"("businessId");
CREATE INDEX IF NOT EXISTS "SecurityDeposit_shopSaleId_idx" ON "SecurityDeposit"("shopSaleId");
CREATE INDEX IF NOT EXISTS "SecurityDeposit_unitId_idx" ON "SecurityDeposit"("unitId");
CREATE INDEX IF NOT EXISTS "SecurityDeposit_status_idx" ON "SecurityDeposit"("status");

CREATE TABLE IF NOT EXISTS "SecurityDepositTxn" (
  "id" UUID NOT NULL,
  "depositId" UUID NOT NULL,
  "type" "DepositTxnType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" "PaymentMethod",
  "reference" TEXT,
  "notes" TEXT,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityDepositTxn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SecurityDepositTxn_depositId_idx" ON "SecurityDepositTxn"("depositId");
CREATE INDEX IF NOT EXISTS "SecurityDepositTxn_type_idx" ON "SecurityDepositTxn"("type");
CREATE INDEX IF NOT EXISTS "SecurityDepositTxn_createdAt_idx" ON "SecurityDepositTxn"("createdAt");

CREATE TABLE IF NOT EXISTS "DocumentSequence" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentSequence_key_year_key" ON "DocumentSequence"("key", "year");

CREATE TABLE IF NOT EXISTS "FinanceDocument" (
  "id" UUID NOT NULL,
  "type" "FinanceDocType" NOT NULL,
  "number" TEXT NOT NULL,
  "tenantId" UUID,
  "businessId" UUID,
  "shopSaleId" UUID,
  "unitId" UUID,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "description" TEXT,
  "billingPeriod" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "previousBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currentCharges" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "remainingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "method" "PaymentMethod",
  "reference" TEXT,
  "dueDate" TIMESTAMP(3),
  "paymentDate" TIMESTAMP(3),
  "notes" TEXT,
  "sourceType" TEXT,
  "sourceId" UUID,
  "meta" JSONB,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FinanceDocument_number_key" ON "FinanceDocument"("number");
CREATE INDEX IF NOT EXISTS "FinanceDocument_type_idx" ON "FinanceDocument"("type");
CREATE INDEX IF NOT EXISTS "FinanceDocument_tenantId_idx" ON "FinanceDocument"("tenantId");
CREATE INDEX IF NOT EXISTS "FinanceDocument_businessId_idx" ON "FinanceDocument"("businessId");
CREATE INDEX IF NOT EXISTS "FinanceDocument_unitId_idx" ON "FinanceDocument"("unitId");
CREATE INDEX IF NOT EXISTS "FinanceDocument_createdAt_idx" ON "FinanceDocument"("createdAt");
CREATE INDEX IF NOT EXISTS "FinanceDocument_sourceType_sourceId_idx" ON "FinanceDocument"("sourceType", "sourceId");

-- FKs (safe if re-run)
DO $$ BEGIN
  ALTER TABLE "MonthlyPayment" ADD CONSTRAINT "MonthlyPayment_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SecurityDeposit" ADD CONSTRAINT "SecurityDeposit_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SecurityDeposit" ADD CONSTRAINT "SecurityDeposit_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SecurityDeposit" ADD CONSTRAINT "SecurityDeposit_shopSaleId_fkey"
    FOREIGN KEY ("shopSaleId") REFERENCES "ShopSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SecurityDeposit" ADD CONSTRAINT "SecurityDeposit_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SecurityDeposit" ADD CONSTRAINT "SecurityDeposit_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SecurityDeposit" ADD CONSTRAINT "SecurityDeposit_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SecurityDepositTxn" ADD CONSTRAINT "SecurityDepositTxn_depositId_fkey"
    FOREIGN KEY ("depositId") REFERENCES "SecurityDeposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SecurityDepositTxn" ADD CONSTRAINT "SecurityDepositTxn_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_shopSaleId_fkey"
    FOREIGN KEY ("shopSaleId") REFERENCES "ShopSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed default office MPESA number setting if missing
INSERT INTO "Setting" ("id", "key", "value", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'payments.officeMpesaNumber', '"0700000000"'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE "key" = 'payments.officeMpesaNumber');
