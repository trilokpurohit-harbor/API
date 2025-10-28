-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('Admin', 'Dealer', 'Broker');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "type" "UserType" NOT NULL DEFAULT 'Dealer';
