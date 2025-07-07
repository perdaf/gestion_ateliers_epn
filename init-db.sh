#!/bin/bash

# Initialize the database for the EPN Workshop Management Application

echo "Initializing the database..."

# Generate Prisma client
echo "Generating Prisma client..."
npm run prisma:generate

# Run Prisma migrations
echo "Running Prisma migrations..."
npm run prisma:migrate -- --name init

# Seed the database
echo "Seeding the database..."
npx prisma db seed

echo "Database initialization completed successfully!"