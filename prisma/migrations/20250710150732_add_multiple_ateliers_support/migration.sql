-- CreateTable
CREATE TABLE "evenement_ateliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evenementId" TEXT NOT NULL,
    "atelierId" TEXT NOT NULL,
    CONSTRAINT "evenement_ateliers_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "evenements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "evenement_ateliers_atelierId_fkey" FOREIGN KEY ("atelierId") REFERENCES "ateliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "regle_ateliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regleId" TEXT NOT NULL,
    "atelierId" TEXT NOT NULL,
    CONSTRAINT "regle_ateliers_regleId_fkey" FOREIGN KEY ("regleId") REFERENCES "regles_recurrence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "regle_ateliers_atelierId_fkey" FOREIGN KEY ("atelierId") REFERENCES "ateliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_evenements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "date_debut" DATETIME NOT NULL,
    "date_fin" DATETIME NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'CONFIRME',
    "atelierId" TEXT,
    "porteurProjetId" TEXT NOT NULL,
    CONSTRAINT "evenements_atelierId_fkey" FOREIGN KEY ("atelierId") REFERENCES "ateliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "evenements_porteurProjetId_fkey" FOREIGN KEY ("porteurProjetId") REFERENCES "agents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_evenements" ("atelierId", "date_debut", "date_fin", "id", "porteurProjetId", "statut", "titre") SELECT "atelierId", "date_debut", "date_fin", "id", "porteurProjetId", "statut", "titre" FROM "evenements";
DROP TABLE "evenements";
ALTER TABLE "new_evenements" RENAME TO "evenements";
CREATE TABLE "new_regles_recurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "heure_debut" TEXT NOT NULL,
    "heure_fin" TEXT NOT NULL,
    "frequence" TEXT NOT NULL,
    "jours_semaine" TEXT NOT NULL,
    "nth_of_month" INTEGER,
    "date_debut_serie" DATETIME NOT NULL,
    "date_fin_serie" DATETIME NOT NULL,
    "atelierId" TEXT,
    "porteurProjetId" TEXT NOT NULL,
    CONSTRAINT "regles_recurrence_atelierId_fkey" FOREIGN KEY ("atelierId") REFERENCES "ateliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "regles_recurrence_porteurProjetId_fkey" FOREIGN KEY ("porteurProjetId") REFERENCES "agents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_regles_recurrence" ("atelierId", "date_debut_serie", "date_fin_serie", "description", "frequence", "heure_debut", "heure_fin", "id", "jours_semaine", "nth_of_month", "porteurProjetId", "titre") SELECT "atelierId", "date_debut_serie", "date_fin_serie", "description", "frequence", "heure_debut", "heure_fin", "id", "jours_semaine", "nth_of_month", "porteurProjetId", "titre" FROM "regles_recurrence";
DROP TABLE "regles_recurrence";
ALTER TABLE "new_regles_recurrence" RENAME TO "regles_recurrence";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "evenement_ateliers_evenementId_atelierId_key" ON "evenement_ateliers"("evenementId", "atelierId");

-- CreateIndex
CREATE UNIQUE INDEX "regle_ateliers_regleId_atelierId_key" ON "regle_ateliers"("regleId", "atelierId");
