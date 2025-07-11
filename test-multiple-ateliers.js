// Utiliser la fetch API native de Node.js (disponible depuis Node 18+)

async function testMultipleAteliers() {
  const baseUrl = "http://localhost:3000";

  try {
    console.log(
      "🧪 Test de la sélection multiple d'ateliers pour les événements récurrents"
    );
    console.log("=".repeat(80));

    // 1. Récupérer les ateliers disponibles
    console.log("1. Récupération des ateliers...");
    const ateliersResponse = await fetch(`${baseUrl}/api/ateliers`);
    const ateliersData = await ateliersResponse.json();

    if (!ateliersData.success) {
      throw new Error("Impossible de récupérer les ateliers");
    }

    const ateliers = ateliersData.data;
    console.log(`   ✅ ${ateliers.length} ateliers trouvés`);
    ateliers.forEach((atelier) => {
      console.log(`      - ${atelier.titre} (ID: ${atelier.id})`);
    });

    // 2. Récupérer les agents
    console.log("\n2. Récupération des agents...");
    const agentsResponse = await fetch(`${baseUrl}/api/agents`);
    const agentsData = await agentsResponse.json();

    if (!agentsData.success) {
      throw new Error("Impossible de récupérer les agents");
    }

    const agents = agentsData.data;
    const porteurs = agents.filter(
      (a) => a.role === "PORTEUR_PROJET" || a.role === "ADMIN"
    );
    const animateurs = agents.filter(
      (a) => a.role === "ANIMATEUR" || a.role === "ADMIN"
    );

    console.log(
      `   ✅ ${agents.length} agents trouvés (${porteurs.length} porteurs, ${animateurs.length} animateurs)`
    );

    if (ateliers.length < 2) {
      console.log(
        "❌ Il faut au moins 2 ateliers pour tester la sélection multiple"
      );
      return;
    }

    if (porteurs.length === 0 || animateurs.length === 0) {
      console.log(
        "❌ Il faut au moins 1 porteur et 1 animateur pour créer un événement"
      );
      return;
    }

    // 3. Créer un événement récurrent avec plusieurs ateliers
    console.log(
      "\n3. Création d'un événement récurrent avec plusieurs ateliers..."
    );

    const selectedAteliers = ateliers.slice(0, Math.min(3, ateliers.length)); // Prendre les 3 premiers ateliers
    const eventData = {
      titre: "Test Événement Multi-Ateliers",
      heure_debut: "09:00",
      heure_fin: "11:00",
      frequence: "HEBDOMADAIRE",
      jours_semaine: [1, 3], // Lundi et Mercredi
      date_debut_serie: new Date().toISOString(),
      date_fin_serie: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(), // Dans 30 jours
      atelierId: selectedAteliers[0].id, // Pour compatibilité
      atelierIds: selectedAteliers.map((a) => a.id), // Nouveaux multiples ateliers
      porteurProjetId: porteurs[0].id,
      porteurProjetIds: [porteurs[0].id],
      animateursIds: [animateurs[0].id],
    };

    console.log(
      `   📝 Ateliers sélectionnés: ${selectedAteliers
        .map((a) => a.titre)
        .join(", ")}`
    );

    const createResponse = await fetch(`${baseUrl}/api/recurrence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    const createResult = await createResponse.json();

    if (!createResult.success) {
      console.log("❌ Erreur lors de la création:", createResult.error);
      console.log("   Détails:", createResult.details || createResult.message);
      return;
    }

    const createdEvent = createResult.data;
    console.log(`   ✅ Événement créé avec ID: ${createdEvent.id}`);

    // 4. Vérifier que l'événement a bien été créé avec tous les ateliers
    console.log("\n4. Vérification de l'événement créé...");

    const getResponse = await fetch(
      `${baseUrl}/api/recurrence?id=${createdEvent.id}`
    );
    const getResult = await getResponse.json();

    if (!getResult.success) {
      console.log("❌ Erreur lors de la récupération:", getResult.error);
      return;
    }

    const retrievedEvent = getResult.data;
    console.log(`   📋 Titre: ${retrievedEvent.titre}`);
    console.log(
      `   📋 Atelier principal: ${retrievedEvent.atelier?.titre || "N/A"}`
    );

    // Vérifier les multiples ateliers
    if (retrievedEvent.ateliers && retrievedEvent.ateliers.length > 0) {
      console.log(
        `   ✅ Multiples ateliers trouvés: ${retrievedEvent.ateliers.length}`
      );
      retrievedEvent.ateliers.forEach((rel, index) => {
        const atelierName = rel.atelier?.titre || `ID: ${rel.atelierId}`;
        console.log(`      ${index + 1}. ${atelierName}`);
      });

      if (retrievedEvent.ateliers.length === selectedAteliers.length) {
        console.log("   ✅ Tous les ateliers ont été correctement sauvegardés");
      } else {
        console.log(
          `   ❌ Nombre d'ateliers incorrect: attendu ${selectedAteliers.length}, trouvé ${retrievedEvent.ateliers.length}`
        );
      }
    } else {
      console.log(
        "   ❌ Aucun atelier multiple trouvé dans la relation ateliers"
      );
    }

    // 5. Tester la modification avec d'autres ateliers
    console.log("\n5. Test de modification avec d'autres ateliers...");

    const newSelectedAteliers = ateliers.slice(1, Math.min(4, ateliers.length)); // Prendre d'autres ateliers
    const updateData = {
      id: createdEvent.id,
      titre: "Test Événement Multi-Ateliers (Modifié)",
      heure_debut: "10:00",
      heure_fin: "12:00",
      frequence: "HEBDOMADAIRE",
      jours_semaine: [2, 4], // Mardi et Jeudi
      date_debut_serie: eventData.date_debut_serie,
      date_fin_serie: eventData.date_fin_serie,
      atelierId: newSelectedAteliers[0].id,
      atelierIds: newSelectedAteliers.map((a) => a.id),
      porteurProjetId: porteurs[0].id,
      porteurProjetIds: [porteurs[0].id],
      animateursIds: [animateurs[0].id],
    };

    console.log(
      `   📝 Nouveaux ateliers: ${newSelectedAteliers
        .map((a) => a.titre)
        .join(", ")}`
    );

    const updateResponse = await fetch(`${baseUrl}/api/recurrence`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    const updateResult = await updateResponse.json();

    if (!updateResult.success) {
      console.log("❌ Erreur lors de la modification:", updateResult.error);
      console.log("   Détails:", updateResult.details || updateResult.message);
    } else {
      console.log("   ✅ Événement modifié avec succès");

      // Vérifier la modification
      const getUpdatedResponse = await fetch(
        `${baseUrl}/api/recurrence?id=${createdEvent.id}`
      );
      const getUpdatedResult = await getUpdatedResponse.json();

      if (getUpdatedResult.success) {
        const updatedEvent = getUpdatedResult.data;
        console.log(`   📋 Nouveau titre: ${updatedEvent.titre}`);

        if (updatedEvent.ateliers && updatedEvent.ateliers.length > 0) {
          console.log(
            `   ✅ Ateliers après modification: ${updatedEvent.ateliers.length}`
          );
          updatedEvent.ateliers.forEach((rel, index) => {
            const atelierName = rel.atelier?.titre || `ID: ${rel.atelierId}`;
            console.log(`      ${index + 1}. ${atelierName}`);
          });

          if (updatedEvent.ateliers.length === newSelectedAteliers.length) {
            console.log("   ✅ Modification des ateliers réussie");
          } else {
            console.log(`   ❌ Nombre d'ateliers incorrect après modification`);
          }
        } else {
          console.log("   ❌ Aucun atelier trouvé après modification");
        }
      }
    }

    // 6. Nettoyer - supprimer l'événement de test
    console.log("\n6. Nettoyage...");
    const deleteResponse = await fetch(
      `${baseUrl}/api/recurrence?id=${createdEvent.id}`,
      {
        method: "DELETE",
      }
    );

    const deleteResult = await deleteResponse.json();
    if (deleteResult.success) {
      console.log("   ✅ Événement de test supprimé");
    } else {
      console.log("   ⚠️  Impossible de supprimer l'événement de test");
    }

    console.log("\n" + "=".repeat(80));
    console.log("🎉 Test terminé avec succès !");
  } catch (error) {
    console.error("❌ Erreur durant le test:", error.message);
    console.error(error.stack);
  }
}

// Exécuter le test
testMultipleAteliers();
