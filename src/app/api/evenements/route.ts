import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RRule, Frequency, Weekday } from 'rrule'; // Bibliothèque pour calculer les dates de récurrence
import { parseJoursSemaine } from '@/lib/validations';
import { FrequenceRecurrence, RegleRecurrence } from '@prisma/client';

// Map our enum to RRule frequency constants
const frequenceToRRuleFreq: Record<FrequenceRecurrence, Frequency> = {
  QUOTIDIENNE: RRule.DAILY,
  HEBDOMADAIRE: RRule.WEEKLY,
  MENSUELLE: RRule.MONTHLY
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if we're fetching a specific event by ID
    const id = searchParams.get('id');
    if (id) {
      // For recurrent events, we need to fetch all events and find the one with the matching ID
      // This is because recurrent events don't exist in the database as individual records
      
      // Extract the recurrence rule ID and date from the event ID
      // The ID format is: regleId-dateString, but dateString contains hyphens
      // So we need to split by the first hyphen only
      const parts = id.split('-');
      const regleId = parts[0];
      const dateString = parts.slice(1).join('-'); // Rejoin the rest of the parts to get the full date
      
      // Fetch the recurrence rule
      const regle = await prisma.regleRecurrence.findUnique({
        where: { id: regleId },
        include: { atelier: true, porteurProjet: true, animateurs: { include: { agent: true } } },
      });
      
      if (!regle) {
        return NextResponse.json({ success: false, error: 'Règle de récurrence non trouvée' }, { status: 404 });
      }
      
      // Generate the events for this recurrence rule
      const joursSemaineNums = parseJoursSemaine(regle.jours_semaine);
      const joursSemaine = joursSemaineNums.map(jour => {
        switch(jour) {
          case 0: return RRule.SU;
          case 1: return RRule.MO;
          case 2: return RRule.TU;
          case 3: return RRule.WE;
          case 4: return RRule.TH;
          case 5: return RRule.FR;
          case 6: return RRule.SA;
          default: throw new Error(`Jour de semaine invalide: ${jour}`);
        }
      });
      
      // Configure RRule
      const dtstart = new Date(regle.date_debut_serie);
      const [startHours, startMinutes] = regle.heure_debut.split(':').map(Number);
      dtstart.setHours(startHours, startMinutes, 0, 0);
      
      const until = new Date(regle.date_fin_serie);
      until.setHours(23, 59, 59, 999);
      
      // Configuration de base pour RRule
      const ruleConfig: any = {
        freq: frequenceToRRuleFreq[regle.frequence],
        byweekday: joursSemaine,
        dtstart: dtstart,
        until: until,
        wkst: RRule.SU,
        interval: 1
      };
      
      // Pour les récurrences mensuelles avec nth_of_month défini
      // Type assertion pour inclure nth_of_month
      const regleWithNth = regle as unknown as (typeof regle & { nth_of_month?: number | null });
      
      if (regleWithNth.frequence === 'MENSUELLE') {
        // Always default to 1 (first occurrence)
        let nthOfMonth = 1;
        
        // If a value is provided in the database, use it
        if (regleWithNth.nth_of_month !== null && regleWithNth.nth_of_month !== undefined) {
          // Convert to number if it's a string
          if (typeof regleWithNth.nth_of_month === 'string') {
            try {
              const parsedValue = Number(regleWithNth.nth_of_month);
              if (!isNaN(parsedValue)) {
                nthOfMonth = parsedValue;
              }
            } catch (error) {
              console.error(`Error converting nth_of_month to number for single event: ${error}, using default: 1`);
            }
          } else if (typeof regleWithNth.nth_of_month === 'number') {
            nthOfMonth = regleWithNth.nth_of_month;
          }
        }
        
        
        // Remplacer byweekday avec des objets Weekday qui incluent l'occurrence (n)
        ruleConfig.byweekday = joursSemaine.map(jour => {
          return new Weekday(jour.weekday, nthOfMonth);
        });
      }
      
      const rule = new RRule(ruleConfig);
      
      // Generate all occurrences
      const occurrences = rule.all();
      
      // Map occurrences to events
      const events = occurrences.map(date => {
        const [startHours, startMinutes] = regle.heure_debut.split(':').map(Number);
        const [endHours, endMinutes] = regle.heure_fin.split(':').map(Number);
        
        const date_debut = new Date(date);
        date_debut.setHours(startHours, startMinutes, 0, 0);
        
        const date_fin = new Date(date);
        date_fin.setHours(endHours, endMinutes, 0, 0);
        
        return {
          id: `${regle.id}-${date.toISOString()}`,
          titre: regle.titre,
          date_debut,
          date_fin,
          atelier: regle.atelier,
          porteurProjet: regle.porteurProjet,
          animateurs: regle.animateurs,
          isRecurrent: true,
          regleRecurrenceId: regle.id,
          // Add a more explicit flag for the frontend
          _isRecurrentEvent: true
        };
      });
      
      // Find the event with the matching ID
      const event = events.find(event => event.id === id);
      
      if (!event) {
        return NextResponse.json({ success: false, error: 'Événement récurrent non trouvé' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, data: event });
    }
    
    // If no ID is provided, fetch events by date range
    const start = new Date(searchParams.get('start')!);
    const end = new Date(searchParams.get('end')!);

    // 1. Récupérer les événements uniques
    const evenementsUniques = await prisma.evenement.findMany({
      where: {
        AND: [
          { date_debut: { lte: end } },   // Commence avant la fin de la période
          { date_fin: { gte: start } },   // Finit après le début de la période
        ],
      },
      include: { atelier: true, porteurProjet: true, animateurs: { include: { agent: true } } },
    });

    // 2. Récupérer les règles de récurrence
    const regles = await prisma.regleRecurrence.findMany({
      where: {
        date_debut_serie: { lte: end },
        date_fin_serie: { gte: start },
      },
      include: { atelier: true, porteurProjet: true, animateurs: { include: { agent: true } } },
    });
    
    
    // 3. "Expanser" les règles en événements virtuels pour le calendrier
    const evenementsRecurrents = regles.flatMap(regle => {
      const joursSemaineNums = parseJoursSemaine(regle.jours_semaine);
      
      // Convertir les numéros de jours (0-6) en constantes RRule.Weekday
      // 0 = dimanche, 1 = lundi, etc.
      const joursSemaine = joursSemaineNums.map(jour => {
        // Convertir de notre système (0=Dimanche, 1=Lundi, ...) aux constantes RRule
        switch(jour) {
          case 0: return RRule.SU;
          case 1: return RRule.MO;
          case 2: return RRule.TU;
          case 3: return RRule.WE;
          case 4: return RRule.TH;
          case 5: return RRule.FR;
          case 6: return RRule.SA;
          default: throw new Error(`Jour de semaine invalide: ${jour}`);
        }
      });
      
      
      // S'assurer que les dates sont valides et inclure l'heure de début pour dtstart
      const dtstart = new Date(regle.date_debut_serie);
      const [startHours, startMinutes] = regle.heure_debut.split(':').map(Number);
      dtstart.setHours(startHours, startMinutes, 0, 0);
      
      const until = new Date(regle.date_fin_serie);
      until.setHours(23, 59, 59, 999); // Fin de journée pour la date de fin
      
      
      // Configuration de base pour RRule
      const ruleConfig: any = {
        freq: frequenceToRRuleFreq[regle.frequence],
        byweekday: joursSemaine,
        dtstart: dtstart,
        until: until,
        wkst: RRule.SU,  // Définir le premier jour de la semaine comme dimanche
        interval: 1      // Répéter chaque semaine (pour WEEKLY)
      };
      
      // Pour les récurrences mensuelles avec nth_of_month défini
      // Type assertion pour inclure nth_of_month
      const regleWithNth = regle as unknown as (typeof regle & { nth_of_month?: number | null });
      
      if (regleWithNth.frequence === 'MENSUELLE') {
        // Always default to 1 (first occurrence)
        let nthOfMonth = 1;
        
        // If a value is provided in the database, use it
        if (regleWithNth.nth_of_month !== null && regleWithNth.nth_of_month !== undefined) {
          // Convert to number if it's a string
          if (typeof regleWithNth.nth_of_month === 'string') {
            try {
              const parsedValue = Number(regleWithNth.nth_of_month);
              if (!isNaN(parsedValue)) {
                nthOfMonth = parsedValue;
              }
            } catch (error) {
              console.error(`Error converting nth_of_month to number: ${error}, using default: 1`);
            }
          } else if (typeof regleWithNth.nth_of_month === 'number') {
            nthOfMonth = regleWithNth.nth_of_month;
          }
        }
        
        
        // Remplacer byweekday avec des objets Weekday qui incluent l'occurrence (n)
        ruleConfig.byweekday = joursSemaine.map(jour => {
          return new Weekday(jour.weekday, nthOfMonth);
        });
      }
      
      const rule = new RRule(ruleConfig);
      

      // Extend the end date by one day to ensure we capture events that start exactly on the end date
      const extendedEnd = new Date(end);
      extendedEnd.setDate(extendedEnd.getDate() + 1);
      
      const occurrences = rule.between(start, extendedEnd);
      
      return occurrences.map(date => {
        const [startHours, startMinutes] = regle.heure_debut.split(':').map(Number);
        const [endHours, endMinutes] = regle.heure_fin.split(':').map(Number);
        
        const date_debut = new Date(date);
        date_debut.setHours(startHours, startMinutes, 0, 0);

        const date_fin = new Date(date);
        date_fin.setHours(endHours, endMinutes, 0, 0);

        return {
          id: `${regle.id}-${date.toISOString()}`, // ID unique pour cette occurrence
          titre: regle.titre,
          date_debut,
          date_fin,
          atelier: regle.atelier,
          porteurProjet: regle.porteurProjet,
          animateurs: regle.animateurs,
          isRecurrent: true,
          regleRecurrenceId: regle.id,
          // Add a more explicit flag for the frontend
          _isRecurrentEvent: true
        };
      });
    });

    const allEvents = [...evenementsUniques, ...evenementsRecurrents];
    
    return NextResponse.json({ success: true, data: allEvents });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}