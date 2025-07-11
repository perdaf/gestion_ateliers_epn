const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

console.log("Available models:");
console.log(
  Object.keys(prisma).filter(
    (key) => !key.startsWith("$") && !key.startsWith("_")
  )
);

prisma.$disconnect();
