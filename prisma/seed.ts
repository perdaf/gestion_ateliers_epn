import { PrismaClient, FrequenceRecurrence, RoleAgent, StatutEvenement } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.evenementAnimateur.deleteMany();
  await prisma.regleAnimateur.deleteMany();
  await prisma.evenement.deleteMany();
  await prisma.regleRecurrence.deleteMany();
  await prisma.atelier.deleteMany();
  await prisma.agent.deleteMany();

  // Create agents
  const agents = await Promise.all([
    prisma.agent.create({
      data: {
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@epn.fr',
        role: RoleAgent.ANIMATEUR,
        couleur: '#4299e1',
      },
    }),
    prisma.agent.create({
      data: {
        nom: 'Martin',
        prenom: 'Sophie',
        email: 'sophie.martin@epn.fr',
        role: RoleAgent.PORTEUR_PROJET,
        couleur: '#ed8936',
      },
    }),
    prisma.agent.create({
      data: {
        nom: 'Dubois',
        prenom: 'Pierre',
        email: 'pierre.dubois@epn.fr',
        role: RoleAgent.ADMIN,
        couleur: '#48bb78',
      },
    }),
  ]);

  console.log('Created agents:', agents);

  // Create ateliers
  const ateliers = await Promise.all([
    prisma.atelier.create({
      data: {
        titre: 'Initiation à l\'informatique',
        duree_minutes: 120,
        couleur: '#3182ce',
      },
    }),
    prisma.atelier.create({
      data: {
        titre: 'Traitement de texte',
        duree_minutes: 90,
        couleur: '#dd6b20',
      },
    }),
    prisma.atelier.create({
      data: {
        titre: 'Création de site web',
        duree_minutes: 180,
        couleur: '#38a169',
      },
    }),
    prisma.atelier.create({
      data: {
        titre: 'Sécurité en ligne',
        duree_minutes: 120,
        couleur: '#e53e3e',
      },
    }),
  ]);

  console.log('Created ateliers:', ateliers);

  // Create one-time events
  const oneTimeEvents = await Promise.all([
    prisma.evenement.create({
      data: {
        titre: 'Atelier spécial seniors',
        date_debut: new Date('2025-07-15T10:00:00Z'),
        date_fin: new Date('2025-07-15T12:00:00Z'),
        statut: StatutEvenement.CONFIRME,
        atelierId: ateliers[0].id,
        porteurProjetId: agents[1].id,
        animateurs: {
          create: [
            {
              agentId: agents[0].id,
            }
          ]
        }
      },
    }),
    prisma.evenement.create({
      data: {
        titre: 'Formation Word avancée',
        date_debut: new Date('2025-07-20T14:00:00Z'),
        date_fin: new Date('2025-07-20T16:30:00Z'),
        statut: StatutEvenement.CONFIRME,
        atelierId: ateliers[1].id,
        porteurProjetId: agents[1].id,
        animateurs: {
          create: [
            {
              agentId: agents[0].id,
            }
          ]
        }
      },
    }),
  ]);

  console.log('Created one-time events:', oneTimeEvents);

  // Create recurring events
  const recurringEvents = await Promise.all([
    prisma.regleRecurrence.create({
      data: {
        titre: 'Cours d\'informatique hebdomadaire',
        description: 'Cours d\'informatique pour débutants',
        heure_debut: '09:00',
        heure_fin: '11:00',
        frequence: FrequenceRecurrence.HEBDOMADAIRE,
        jours_semaine: '1,3', // Monday and Wednesday
        date_debut_serie: new Date('2025-07-01'),
        date_fin_serie: new Date('2025-08-31'),
        atelierId: ateliers[0].id,
        porteurProjetId: agents[1].id,
        animateurs: {
          create: [
            {
              agentId: agents[0].id,
            }
          ]
        }
      },
    }),
    prisma.regleRecurrence.create({
      data: {
        titre: 'Atelier mensuel de sécurité',
        description: 'Atelier mensuel sur la sécurité en ligne',
        heure_debut: '14:00',
        heure_fin: '16:00',
        frequence: FrequenceRecurrence.MENSUELLE,
        jours_semaine: '15', // 15th day of each month
        date_debut_serie: new Date('2025-07-15'),
        date_fin_serie: new Date('2025-12-15'),
        atelierId: ateliers[3].id,
        porteurProjetId: agents[1].id,
        animateurs: {
          create: [
            {
              agentId: agents[2].id,
            }
          ]
        }
      },
    }),
  ]);

  console.log('Created recurring events:', recurringEvents);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });