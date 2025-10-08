-- Manual migration: drop phone column and add country column on clients table
-- This is safe to run multiple times: checks existence before altering
DO $$
BEGIN
    -- Drop phone column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'phone'
    ) THEN
        ALTER TABLE "clients" DROP COLUMN "phone";
    END IF;

    -- Add country column if it does not exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'country'
    ) THEN
        ALTER TABLE "clients" ADD COLUMN "country" TEXT;
    END IF;
END$$;
