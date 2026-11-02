-- DropIndex
DROP INDEX "Position_companyId_idx";

-- CreateIndex
CREATE INDEX "Position_companyId_createdAt_id_idx" ON "Position"("companyId", "createdAt", "id");
