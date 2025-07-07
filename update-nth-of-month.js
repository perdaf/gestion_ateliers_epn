// Script to update nth_of_month values in the database
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateNthOfMonth() {
  try {
    console.log("Starting update of nth_of_month values...");

    // Find all recurrence rules with nth_of_month = 2
    const rules = await prisma.regleRecurrence.findMany({
      where: {
        nth_of_month: 2,
        frequence: "MENSUELLE",
      },
    });

    console.log(`Found ${rules.length} recurrence rules with nth_of_month = 2`);

    // Update each rule to use nth_of_month = 1
    for (const rule of rules) {
      console.log(`Updating rule ${rule.id}: ${rule.titre}`);

      await prisma.regleRecurrence.update({
        where: { id: rule.id },
        data: { nth_of_month: 1 },
      });

      console.log(`Updated rule ${rule.id}`);
    }

    console.log("Update completed successfully");
  } catch (error) {
    console.error("Error updating nth_of_month values:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateNthOfMonth();
