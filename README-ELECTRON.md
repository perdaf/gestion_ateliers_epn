# Gestion Ateliers EPN - Application Electron

Ce document explique comment utiliser l'application Gestion Ateliers EPN en tant qu'application de bureau avec Electron.

## Prérequis

- [Node.js](https://nodejs.org/) (version 18 ou supérieure)
- [npm](https://www.npmjs.com/) (généralement installé avec Node.js)

## Installation

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/votre-nom-utilisateur/gestion_ateliers_epn_nextjs.git
   cd gestion_ateliers_epn_nextjs
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Générez les fichiers Prisma :
   ```bash
   npm run prisma:generate
   ```

## Développement

Pour lancer l'application en mode développement, vous pouvez utiliser le script fourni :

```bash
./run-electron-dev.sh
```

Ou exécuter la commande directement :

```bash
npm run electron-dev
```

Cette commande va :
1. Démarrer le serveur de développement Next.js
2. Attendre que le serveur soit prêt
3. Lancer l'application Electron qui se connectera au serveur Next.js

## Construction pour la distribution

Pour construire l'application pour la distribution, vous pouvez utiliser le script fourni :

```bash
./build-electron.sh
```

Ou exécuter les commandes directement :

```bash
npm run build
npm run package
```

Cette commande va :
1. Construire l'application Next.js
2. Construire l'application Electron pour Windows, macOS et Linux
3. Générer les exécutables dans le dossier `dist`

## Structure des fichiers Electron

- `electron/main.js` : Point d'entrée de l'application Electron
- `electron/preload.js` : Script de préchargement pour exposer des API sécurisées
- `electron/about.html` : Page "À propos" de l'application
- `.env.electron` : Variables d'environnement pour l'application Electron

## Fonctionnalités

L'application Electron offre les mêmes fonctionnalités que l'application web, mais avec les avantages d'une application de bureau :

- Exécution locale sans serveur externe
- Accès à la base de données locale
- Interface native du système d'exploitation
- Menu personnalisé
- Possibilité de fonctionner hors ligne

## Mise à jour de l'application

Pour mettre à jour l'application après avoir ajouté de nouvelles fonctionnalités :

1. Développez et testez vos nouvelles fonctionnalités
2. Mettez à jour la version dans `package.json`
3. Exécutez `./build-electron.sh` pour générer de nouveaux exécutables
4. Distribuez les nouveaux exécutables aux utilisateurs

## Résolution des problèmes

### L'application ne démarre pas

- Vérifiez que toutes les dépendances sont installées : `npm install`
- Vérifiez que les fichiers Prisma sont générés : `npm run prisma:generate`
- Vérifiez les logs dans la console de développement (ouverte avec Ctrl+Shift+I dans l'application)

### Erreurs de base de données

- Vérifiez que le fichier de base de données SQLite existe
- Exécutez les migrations si nécessaire : `npm run prisma:migrate`
- Réinitialisez la base de données si nécessaire : `npm run prisma:migrate reset`

## Licence

Voir le fichier LICENSE pour plus d'informations.