-- I4 migration: add referral/profile/subscription fields to User and create Certificate table
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "bio" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "establishment" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "referralCode" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS "referredBy" TEXT,
  ADD COLUMN IF NOT EXISTS "subscription" TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "subscriptionUntil" TIMESTAMP;

-- Add unique constraint on referralCode (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_referralCode_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_referralCode_key" UNIQUE ("referralCode");
  END IF;
END$$;

-- Create Certificate table if missing
CREATE TABLE IF NOT EXISTS "Certificate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "totalQuestions" INTEGER NOT NULL,
  "percentage" INTEGER NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on sessionId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_sessionId_key'
  ) THEN
    ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_sessionId_key" UNIQUE ("sessionId");
  END IF;
END$$;

-- Foreign key from Certificate.userId -> User.id (CASCADE on delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_userId_fkey'
  ) THEN
    ALTER TABLE "Certificate"
      ADD CONSTRAINT "Certificate_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END$$;
