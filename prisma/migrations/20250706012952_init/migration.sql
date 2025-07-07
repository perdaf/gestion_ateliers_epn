-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "couleur" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ateliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "duree_minutes" INTEGER NOT NULL DEFAULT 60,
    "couleur" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "evenement_animateurs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evenementId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    CONSTRAINT "evenement_animateurs_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "evenements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "evenement_animateurs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "regle_animateurs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regleId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    CONSTRAINT "regle_animateurs_regleId_fkey" FOREIGN KEY ("regleId") REFERENCES "regles_recurrence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "regle_animateurs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "regles_recurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "heure_debut" TEXT NOT NULL,
    "heure_fin" TEXT NOT NULL,
    "frequence" TEXT NOT NULL,
    "jours_semaine" TEXT NOT NULL,
    "date_debut_serie" DATETIME NOT NULL,
    "date_fin_serie" DATETIME NOT NULL,
    "atelierId" TEXT NOT NULL,
    "porteurProjetId" TEXT NOT NULL,
    CONSTRAINT "regles_recurrence_atelierId_fkey" FOREIGN KEY ("atelierId") REFERENCES "ateliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "regles_recurrence_porteurProjetId_fkey" FOREIGN KEY ("porteurProjetId") REFERENCES "agents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evenements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "date_debut" DATETIME NOT NULL,
    "date_fin" DATETIME NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'CONFIRME',
    "atelierId" TEXT NOT NULL,
    "porteurProjetId" TEXT NOT NULL,
    CONSTRAINT "evenements_atelierId_fkey" FOREIGN KEY ("atelierId") REFERENCES "ateliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "evenements_porteurProjetId_fkey" FOREIGN KEY ("porteurProjetId") REFERENCES "agents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "agents_email_key" ON "agents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "evenement_animateurs_evenementId_agentId_key" ON "evenement_animateurs"("evenementId", "agentId");

-- CreateIndex
CREATE UNIQUE INDEX "regle_animateurs_regleId_agentId_key" ON "regle_animateurs"("regleId", "agentId");
