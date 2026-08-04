-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER',
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;
