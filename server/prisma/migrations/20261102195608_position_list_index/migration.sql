-- DropIndex
DROP INDEX "Position_status_idx";

-- CreateIndex
CREATE INDEX "Position_status_createdAt_id_idx" ON "Position"("status", "createdAt", "id");
