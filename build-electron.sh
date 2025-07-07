#!/bin/bash

# Script pour construire l'application Electron pour la distribution

echo "Construction de l'application Electron pour la distribution..."

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

# Construire l'application Next.js
echo "Construction de l'application Next.js..."
npm run build

# Construire l'application Electron
echo "Construction de l'application Electron..."
npm run package

echo "Construction terminée. Les exécutables se trouvent dans le dossier 'dist'."