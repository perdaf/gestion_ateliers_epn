const { PrismaClient } = require("@prisma/client");
const { RRule, Frequency, Weekday } = require("rrule");

const prisma = new PrismaClient();

// Map our enum to RRule frequency constants
const frequenceToRRuleFreq = {
  QUOTIDIENNE: RRule.DAILY,
  HEBDOMADAIRE: RRule.WEEKLY,
  MENSUELLE: RRule.MONTHLY,
};

async function testRecurrence() {
  try {
    console.log("🔍 Testing recurrence generation...");

    // Fetch all recurrence rules
    const regles = await prisma.regleRecurrence.findMany({
      include: {
        atelier: true,
        porteurProjet: true,
        animateurs: { include: { agent: true } },
      },
    });

    console.log(`📋 Found ${regles.length} recurrence rules`);

    for (const regle of regles) {
      console.log(`\n🔄 Testing rule: "${regle.titre}"`);
      console.log(`   Frequency: ${regle.frequence}`);
      console.log(`   Days: ${regle.jours_semaine}`);
      console.log(`   nth_of_month: ${regle.nth_of_month}`);
      console.log(`   Start: ${regle.date_debut_serie}`);
      console.log(`   End: ${regle.date_fin_serie}`);

      // Parse days of week
      const joursSemaineNums = regle.jours_semaine
        .split(",")
        .map((jour) => parseInt(jour.trim(), 10));

      // Convert to RRule weekdays
      const joursSemaine = joursSemaineNums.map((jour) => {
        switch (jour) {
          case 0:
            return RRule.SU;
          case 1:
            return RRule.MO;
          case 2:
            return RRule.TU;
          case 3:
            return RRule.WE;
          case 4:
            return RRule.TH;
          case 5:
            return RRule.FR;
          case 6:
            return RRule.SA;
          default:
            throw new Error(`Invalid day: ${jour}`);
        }
      });

      // Configure RRule
      const dtstart = new Date(regle.date_debut_serie);
      const [startHours, startMinutes] = regle.heure_debut
        .split(":")
        .map(Number);
      dtstart.setHours(startHours, startMinutes, 0, 0);

      const until = new Date(regle.date_fin_serie);
      until.setHours(23, 59, 59, 999);

      // Base configuration
      const ruleConfig = {
        freq: frequenceToRRuleFreq[regle.frequence],
        byweekday: joursSemaine,
        dtstart: dtstart,
        until: until,
        wkst: RRule.SU,
        interval: 1,
      };

      // Handle monthly recurrence with nth_of_month
      if (regle.frequence === "MENSUELLE" && regle.nth_of_month) {
        const nthOfMonth = Number(regle.nth_of_month);
        ruleConfig.byweekday = joursSemaine.map((jour) => {
          return new Weekday(jour.weekday, nthOfMonth);
        });
      }

      const rule = new RRule(ruleConfig);

      // Generate occurrences for the next 3 months
      const testStart = new Date();
      const testEnd = new Date();
      testEnd.setMonth(testEnd.getMonth() + 3);

      const occurrences = rule.between(testStart, testEnd);

      console.log(
        `   📅 Generated ${occurrences.length} occurrences in next 3 months:`
      );
      occurrences.slice(0, 5).forEach((date, index) => {
        console.log(
          `      ${index + 1}. ${date.toLocaleDateString(
            "fr-FR"
          )} ${date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        );
      });

      if (occurrences.length > 5) {
        console.log(`      ... and ${occurrences.length - 5} more`);
      }
    }
  } catch (error) {
    console.error("❌ Error testing recurrence:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testRecurrence();
