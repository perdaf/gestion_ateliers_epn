# **Cahier des Charges MVP+ : Application de Planning EPN (avec Récurrence & Export)**

**Objectif de l'MVP+ :** L'utilisateur doit pouvoir planifier des événements **uniques ET récurrents**. Il doit également pouvoir exporter une vue du planning aux formats PDF et ICS.

**Compromis pour cet MVP :**
*   **Logique de récurrence :** Les événements récurrents seront générés "à la volée" par le backend lors de l'affichage, plutôt que de créer des centaines d'entrées dans la base de données. C'est plus simple à mettre en place, mais rend la gestion des exceptions (ex: annuler une seule occurrence) plus complexe (reportée post-MVP).
*   **Simplicité des formulaires :** Le formulaire de création gérera la récurrence, mais sans les cas les plus complexes (ex: "le 3ème mardi du mois").
*   **Fonctionnalités reportées :** Validation avancée des conflits, système d'audit, cache, monitoring, déploiement Docker.

---

## **PARTIE 1 : INITIALISATION & MODÈLE DE DONNÉES (MVP+)**

### **Todo 1.0 : Installation des dépendances**

1.  [ ] **Créer le projet (inchangé).**
2.  [ ] **Installer les dépendances MVP+ :**
    ```bash
    # Core + Récurrence
    npm install @prisma/client @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/rrule
    # Forms & Validation
    npm install zustand zod react-hook-form @hookform/resolvers
    # UI, Utils & Export
    npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-label
    npm install lucide-react date-fns sonner clsx tailwind-merge class-variance-authority
    npm install @react-pdf/renderer
    # Dev
    npm install -D prisma
    ```

### **Todo 1.1 : Schéma de Données avec Récurrence**

*On réintroduit le modèle `RegleRecurrence` qui est indispensable.*

1.  [ ] **Remplacer `/prisma/schema.prisma` avec le schéma MVP+ :**

```prisma
// /prisma/schema.prisma (Version MVP+)
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Enums (inchangés)
enum RoleAgent { PORTEUR_PROJET, ANIMATEUR, ADMIN }
enum FrequenceRecurrence { QUOTIDIENNE, HEBDOMADAIRE, MENSUELLE }
enum StatutEvenement { BROUILLON, CONFIRME, ANNULE }

model Agent {
  id               String            @id @default(cuid())
  nom              String
  prenom           String
  email            String            @unique
  role             RoleAgent
  couleur          String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  
  evenementsPortes Evenement[]       @relation("PorteurProjetEvenements")
  evenementsAnimes EvenementAnimateur[]
  reglesPortees    RegleRecurrence[] @relation("PorteurProjetRegles")
  reglesAnimes     RegleAnimateur[]
  @@map("agents")
}

model Atelier {
  id               String            @id @default(cuid())
  titre            String
  duree_minutes    Int               @default(60)
  couleur          String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  
  evenements       Evenement[]
  reglesRecurrence RegleRecurrence[]
  @@map("ateliers")
}

// Pivot pour les animateurs d'événements uniques
model EvenementAnimateur {
  id          String    @id @default(cuid())
  evenementId String
  agentId     String
  evenement   Evenement @relation(fields: [evenementId], references: [id], onDelete: Cascade)
  agent       Agent     @relation(fields: [agentId], references: [id], onDelete: Cascade)
  @@unique([evenementId, agentId])
  @@map("evenement_animateurs")
}

// Pivot pour les animateurs de règles de récurrence
model RegleAnimateur {
  id      String          @id @default(cuid())
  regleId String
  agentId String
  regle   RegleRecurrence @relation(fields: [regleId], references: [id], onDelete: Cascade)
  agent   Agent           @relation(fields: [agentId], references: [id], onDelete: Cascade)
  @@unique([regleId, agentId])
  @@map("regle_animateurs")
}

// Règle de récurrence : Stocke le "modèle" de l'événement récurrent
model RegleRecurrence {
  id              String              @id @default(cuid())
  titre           String
  description     String?
  heure_debut     String              // "HH:mm"
  heure_fin       String              // "HH:mm"
  frequence       FrequenceRecurrence
  jours_semaine   Int[]               // [0-6] pour Dim-Sam
  date_debut_serie DateTime           @db.Date
  date_fin_serie  DateTime            @db.Date
  
  atelierId       String
  porteurProjetId String
  atelier         Atelier             @relation(fields: [atelierId], references: [id])
  porteurProjet   Agent               @relation("PorteurProjetRegles", fields: [porteurProjetId], references: [id])
  animateurs      RegleAnimateur[]
  
  @@map("regles_recurrence")
}

// Événement unique (ou une exception à une règle dans le futur)
model Evenement {
  id              String           @id @default(cuid())
  titre           String
  date_debut      DateTime
  date_fin        DateTime
  statut          StatutEvenement  @default(CONFIRME)
  
  atelierId       String
  porteurProjetId String
  atelier         Atelier          @relation(fields: [atelierId], references: [id])
  porteurProjet   Agent            @relation("PorteurProjetEvenements", fields: [porteurProjetId], references: [id])
  animateurs      EvenementAnimateur[]
  
  @@map("evenements")
}
```
2.  [ ] **Appliquer la migration :**
    ```bash
    npx prisma migrate dev --name add-recurrence-schema
    npx prisma generate
    ```

---

## **PARTIE 2 : VALIDATION (MVP+)**

### **Todo 2.1 : Schémas de validation Zod avec Récurrence**

1.  [ ] **Mettre à jour `/src/lib/validations.ts` :**

```typescript
import { z } from 'zod';

// Pour un événement unique
export const evenementUniqueSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis'),
  date_debut: z.date(),
  date_fin: z.date(),
  atelierId: z.string({ required_error: "L'atelier est requis" }),
  porteurProjetId: z.string({ required_error: "Le porteur de projet est requis" }),
  animateursIds: z.array(z.string()).min(1, 'Au moins un animateur requis'),
}).refine(data => data.date_fin > data.date_debut, {
  message: 'La date de fin doit être après la date de début',
  path: ['date_fin'],
});

// Pour un événement récurrent
export const evenementRecurrentSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis'),
  heure_debut: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:mm invalide"),
  heure_fin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:mm invalide"),
  frequence: z.enum(['QUOTIDIENNE', 'HEBDOMADAIRE', 'MENSUELLE']),
  jours_semaine: z.array(z.number().min(0).max(6)).min(1, 'Sélectionnez au moins un jour'),
  date_debut_serie: z.date(),
  date_fin_serie: z.date(),
  atelierId: z.string({ required_error: "L'atelier est requis" }),
  porteurProjetId: z.string({ required_error: "Le porteur de projet est requis" }),
  animateursIds: z.array(z.string()).min(1, 'Au moins un animateur requis'),
}).refine(data => data.date_fin_serie > data.date_debut_serie, {
  message: 'La date de fin doit être après la date de début de série',
  path: ['date_fin_serie'],
});
```

---

## **PARTIE 3 : BACKEND - API ROUTES (MVP+)**

### **Todo 3.1 : API pour lire les événements (avec expansion de récurrence)**

1.  [ ] **Mettre à jour `/src/app/api/evenements/route.ts` :**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RRule } from 'rrule'; // Bibliothèque pour calculer les dates de récurrence

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = new Date(searchParams.get('start')!);
    const end = new Date(searchParams.get('end')!);

    // 1. Récupérer les événements uniques
    const evenementsUniques = await prisma.evenement.findMany({
      where: {
        date_debut: { gte: start },
        date_fin: { lte: end },
      },
      include: { atelier: true, porteurProjet: true, animateurs: { include: { agent: true } } },
    });

    // 2. Récupérer les règles de récurrence
    const regles = await prisma.regleRecurrence.findMany({
      where: {
        date_debut_serie: { lte: end },
        date_fin_serie: { gte: start },
      },
      include: { atelier: true, porteurProjet: true, animateurs: { include: { agent: true } } },
    });
    
    // 3. "Expanser" les règles en événements virtuels pour le calendrier
    const evenementsRecurrents = regles.flatMap(regle => {
      const rule = new RRule({
        freq: RRule[regle.frequence], // RRule.WEEKLY etc.
        byweekday: regle.jours_semaine,
        dtstart: regle.date_debut_serie,
        until: regle.date_fin_serie,
      });

      return rule.between(start, end).map(date => {
        const [startHours, startMinutes] = regle.heure_debut.split(':').map(Number);
        const [endHours, endMinutes] = regle.heure_fin.split(':').map(Number);
        
        const date_debut = new Date(date);
        date_debut.setHours(startHours, startMinutes, 0, 0);

        const date_fin = new Date(date);
        date_fin.setHours(endHours, endMinutes, 0, 0);

        return {
          id: `${regle.id}-${date.toISOString()}`, // ID unique pour cette occurrence
          titre: regle.titre,
          date_debut,
          date_fin,
          atelier: regle.atelier,
          porteurProjet: regle.porteurProjet,
          animateurs: regle.animateurs,
          isRecurrent: true,
        };
      });
    });

    return NextResponse.json({ success: true, data: [...evenementsUniques, ...evenementsRecurrents] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
```

### **Todo 3.2 : API pour créer les événements et règles**

*On aura besoin de deux endpoints : un pour les événements uniques et un pour les règles.*

1.  [ ] **Créer `/src/app/api/evenements-uniques/route.ts`** (pour les événements simples).
2.  [ ] **Créer `/src/app/api/recurrence/route.ts`** (pour créer les règles).

---

## **PARTIE 4 : FRONTEND (MVP+)**

### **Todo 4.1 : Formulaire de création/édition**

1.  [ ] **Modifier le formulaire d'événement (`event-form.tsx`) :**
    *   Ajouter une checkbox : `[ ] Répéter cet événement`.
    *   Quand la case est cochée, afficher les champs de récurrence (fréquence, jours de la semaine, dates de début/fin de série).
    *   Quand elle est décochée, afficher les champs pour un événement unique (date et heure de début/fin).
    *   Le `onSubmit` du formulaire doit appeler le bon endpoint API (`/api/evenements-uniques` ou `/api/recurrence`) en fonction de l'état de la checkbox.

### **Todo 4.2 : Calendrier**

1.  [ ] **Mettre à jour `/src/components/calendar/calendar-wrapper.tsx` :**
    *   S'assurer que `fetchEvents` passe bien les paramètres `start` et `end` de la vue actuelle du calendrier.
    *   `FullCalendar` gère nativement le `rrule` si on le lui passe, mais notre approche backend est plus robuste. Le code client change peu. Les événements récurrents apparaîtront comme des événements normaux.

---

## **PARTIE 5 : EXPORT PDF & ICS (MVP+)**

### **Todo 5.0 : API pour l'export**

1.  [ ] **Créer un endpoint `/src/app/api/export/route.ts` :**

```typescript
import { NextRequest } from 'next/server';
import { pdf } from '@react-pdf/renderer';
import { CalendarPDF } from '@/components/pdf/calendar-pdf'; // À créer
// Importer la logique de GET /api/evenements pour réutiliser le code
// Ou copier-coller la logique de récupération et d'expansion des événements.

// Fonction pour générer le contenu ICS
function generateICSContent(evenements: any[]): string {
  // ... (Logique de la spec senior dev)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  const start = new Date(searchParams.get('start')!);
  const end = new Date(searchParams.get('end')!);

  // 1. Récupérer TOUS les événements (uniques + récurrents) dans la plage de dates
  //    (Réutiliser la logique de GET /api/evenements)
  const allEvents = [/* ... */]; 

  if (format === 'pdf') {
    const doc = CalendarPDF({ evenements: allEvents });
    const blob = await pdf(doc).toBlob();
    return new Response(blob, {
      headers: { 'Content-Type': 'application/pdf' },
    });
  }

  if (format === 'ics') {
    const icsContent = generateICSContent(allEvents);
    return new Response(icsContent, {
      headers: { 'Content-Type': 'text/calendar;charset=utf-8' },
    });
  }
  
  return new Response('Format non supporté', { status: 400 });
}
```

### **Todo 5.1 : Composants Frontend pour l'Export**

1.  [ ] **Créer le composant de document PDF `/src/components/pdf/calendar-pdf.tsx` :**
    *   Utilise les composants de `@react-pdf/renderer` (`<Document>`, `<Page>`, `<View>`, `<Text>`).
    *   Prend `evenements` en props.
    *   Affiche une liste ou un tableau simple des événements avec titre, date et animateurs.

2.  [ ] **Ajouter un bouton d'export dans l'interface :**
    *   Un bouton "Exporter" sur la page du calendrier.
    *   Au clic, il ouvre une petite modale demandant :
        *   Une plage de dates (pré-remplie avec la vue actuelle).
        *   Le format (PDF ou ICS).
    *   Au "submit" de cette modale, il construit l'URL (`/api/export?format=...&start=...&end=...`) et déclenche le téléchargement du fichier.

---

## **Checklist de Fin d'MVP+**

-   [ ] Le schéma de base de données gère les **règles de récurrence**.
-   [ ] L'API peut **créer** des événements uniques ET des règles de récurrence.
-   [ ] L'API peut **lire** et **combiner** les événements uniques et les occurrences d'événements récurrents pour une période donnée.
-   [ ] Le formulaire de création permet de basculer entre un événement **unique** et **récurrent**.
-   [ ] Le calendrier affiche correctement tous les événements.
-   [ ] Un bouton "Exporter" permet de télécharger un fichier **PDF** listant les événements de la période choisie.
-   [ ] Un bouton "Exporter" permet de télécharger un fichier **.ics** compatible avec les agendas externes.