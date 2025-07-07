#!/bin/bash

# Setup script for the EPN Workshop Management Application

echo "Setting up the EPN Workshop Management Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm and try again."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate dev --name init

# Seed the database
echo "Seeding the database..."
npx prisma db seed

echo "Setup completed successfully!"
echo "You can now start the development server with: npm run dev"