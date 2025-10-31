/*
  Warnings:

  - A unique constraint covering the columns `[roleId]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."UserRole_roleId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_roleId_key" ON "UserRole"("roleId");
