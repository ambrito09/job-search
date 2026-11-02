-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Position" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "searchLc" TEXT NOT NULL DEFAULT '',
    "locationLc" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "companyId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Position_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Position" ("companyId", "createdAt", "description", "id", "location", "mode", "status", "title") SELECT "companyId", "createdAt", "description", "id", "location", "mode", "status", "title" FROM "Position";
DROP TABLE "Position";
ALTER TABLE "new_Position" RENAME TO "Position";
CREATE INDEX "Position_status_idx" ON "Position"("status");
CREATE INDEX "Position_companyId_idx" ON "Position"("companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
