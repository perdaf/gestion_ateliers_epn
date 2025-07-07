# Gestion des Ateliers EPN

Application de gestion des ateliers pour Espace Public Numérique (EPN). Cette application permet de planifier des événements uniques et récurrents, ainsi que d'exporter le planning au format PDF et ICS.

## Fonctionnalités

- Gestion des agents (animateurs et porteurs de projet)
- Gestion des ateliers
- Planification d'événements uniques
- Planification d'événements récurrents (quotidiens, hebdomadaires, mensuels)
- Visualisation du planning sur un calendrier interactif
- Export du planning au format PDF et ICS

## Technologies utilisées

- [Next.js](https://nextjs.org/) avec App Router et TypeScript
- [Prisma ORM](https://www.prisma.io/) avec SQLite (dev) / PostgreSQL (prod)
- [FullCalendar](https://fullcalendar.io/) pour l'affichage du calendrier
- [React Hook Form](https://react-hook-form.com/) avec [Zod](https://zod.dev/) pour la validation des formulaires
- [React PDF](https://react-pdf.org/) pour la génération de PDF
- [Tailwind CSS](https://tailwindcss.com/) pour le styling

## Prérequis

- Node.js 18+ et npm

## Installation

1. Cloner le dépôt
   ```bash
   git clone https://github.com/votre-utilisateur/gestion_ateliers_epn_nextjs.git
   cd gestion_ateliers_epn_nextjs
   ```

2. Installer les dépendances
   ```bash
   npm install
   ```

3. Configurer la base de données
   ```bash
   # Générer le client Prisma
   npm run prisma:generate
   
   # Créer la base de données et appliquer les migrations
   npm run prisma:migrate
   
   # Remplir la base de données avec des données de test
   npm run db:seed
   ```

4. Lancer l'application en mode développement
   ```bash
   npm run dev
   ```

5. Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur

## Structure du projet

- `/prisma` - Schéma de base de données et migrations
- `/src/app` - Pages et API routes (Next.js App Router)
- `/src/components` - Composants React réutilisables
- `/src/lib` - Utilitaires, validations et configuration

## Déploiement

Pour déployer en production :

1. Mettre à jour le fichier `.env` avec les informations de connexion à la base de données PostgreSQL
2. Construire l'application
   ```bash
   npm run build
   ```
3. Démarrer le serveur
   ```bash
   npm run start
   ```

## Licence

Ce projet est sous licence [MIT](LICENSE).
