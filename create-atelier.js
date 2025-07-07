const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const atelier = await prisma.atelier.create({
      data: {
        titre: "Informatique",
        duree_minutes: 60,
        couleur: "#3498db",
      },
    });
    console.log("Created atelier:", atelier);
  } catch (error) {
    console.error("Error creating atelier:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
