-- Add accessToken to guardian. Existing rows get a generated UUID, then
-- the column is promoted to NOT NULL UNIQUE.

ALTER TABLE "guardian" ADD COLUMN "accessToken" UUID;

UPDATE "guardian" SET "accessToken" = gen_random_uuid() WHERE "accessToken" IS NULL;

ALTER TABLE "guardian" ALTER COLUMN "accessToken" SET NOT NULL;
CREATE UNIQUE INDEX "guardian_accessToken_key" ON "guardian"("accessToken");
