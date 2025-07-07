#!/bin/bash

# Script pour lancer l'application Electron en mode développement

echo "Démarrage de l'application Electron en mode développement..."

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "Node.js n'est pas installé. Veuillez installer Node.js pour continuer."
    exit 1
fi

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
    echo "npm n'est pas installé. Veuillez installer npm pour continuer."
    exit 1
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances..."
    npm install
fi

# Générer les fichiers Prisma si nécessaire
if [ ! -d "node_modules/.prisma" ]; then
    echo "Génération des fichiers Prisma..."
    npm run prisma:generate
fi

# Lancer l'application Electron en mode développement
echo "Lancement de l'application Electron..."
npm run electron-dev

echo "Application Electron arrêtée."