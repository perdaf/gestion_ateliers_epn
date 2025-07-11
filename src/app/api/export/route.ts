import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RRule, Frequency } from 'rrule';
import { parseJoursSemaine } from '@/lib/validations';
import { FrequenceRecurrence } from '@prisma/client';
import { renderToStream } from '@react-pdf/renderer';
import { CalendarPDF } from '@/components/pdf/calendar-pdf';
import React from 'react';

// Map our enum to RRule frequency constants
const frequenceToRRuleFreq: Record<FrequenceRecurrence, Frequency> = {
  QUOTIDIENNE: RRule.DAILY,
  HEBDOMADAIRE: RRule.WEEKLY,
  MENSUELLE: RRule.MONTHLY
};

// Function to generate the content ICS
function generateICSContent(evenements: any[]): string {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gestion Ateliers EPN//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  evenements.forEach((evt) => {
    const dateStart = new Date(evt.date_debut);
    const dateEnd = new Date(evt.date_fin);
    
    // Format dates for ICS (YYYYMMDDTHHmmssZ)
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/g, '');
    };
    
    const startStr = formatDate(dateStart);
    const endStr = formatDate(dateEnd);
    
    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${evt.id}`,
      `SUMMARY:${evt.titre}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `DESCRIPTION:Ateliers: ${evt.ateliers.map((a: any) => a.atelier.titre).join(', ')}\\nPorteur de projet: ${evt.porteurProjet.prenom} ${evt.porteurProjet.nom}`,
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');
  return icsContent.join('\r\n');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const start = new Date(searchParams.get('start')!);
    const end = new Date(searchParams.get('end')!);

    // 1. Récupérer les événements uniques
    const evenementsUniques = await prisma.evenement.findMany({
      where: {
        date_debut: { gte: start },
        date_fin: { lte: end },
      },
      include: {
        ateliers: { include: { atelier: true } },
        porteurProjet: true,
        animateurs: { include: { agent: true } }
      },
    });

    // 2. Récupérer les règles de récurrence
    const regles = await prisma.regleRecurrence.findMany({
      where: {
        date_debut_serie: { lte: end },
        date_fin_serie: { gte: start },
      },
      include: {
        ateliers: { include: { atelier: true } },
        porteurProjet: true,
        animateurs: { include: { agent: true } }
      },
    });
    
    // 3. "Expanser" les règles en événements virtuels pour le calendrier
    const evenementsRecurrents = regles.flatMap(regle => {
      const joursSemaine = parseJoursSemaine(regle.jours_semaine);
      
      const rule = new RRule({
        freq: frequenceToRRuleFreq[regle.frequence],
        byweekday: joursSemaine,
        dtstart: regle.date_debut_serie,
        until: regle.date_fin_serie,
      });

      return rule.between(start, end).map(date => {
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
          ateliers: regle.ateliers,
          porteurProjet: regle.porteurProjet,
          animateurs: regle.animateurs,
          isRecurrent: true,
        };
      });
    });

    const allEvents = [...evenementsUniques, ...evenementsRecurrents];

    if (format === 'pdf') {
      try {
        // Sort events by date for better organization in the PDF
        const sortedEvents = allEvents.sort((a, b) =>
          new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
        );
        
        // Generate the PDF using the CalendarPDF component
        // Generate the PDF using the CalendarPDF component with React.createElement
        const pdfStream = await renderToStream(
          React.createElement(CalendarPDF, {
            evenements: sortedEvents,
            startDate: start,
            endDate: end
          })
        );
        
        // Format the filename based on the date range
        const startFormatted = start.toISOString().split('T')[0];
        const endFormatted = end.toISOString().split('T')[0];
        const filename = `planning-${startFormatted}-to-${endFormatted}.pdf`;
        
        // Return the PDF stream directly
        return new Response(pdfStream as unknown as ReadableStream<Uint8Array>, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`
          },
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
        return new Response('Erreur lors de la génération du PDF', { status: 500 });
      }
    }

    if (format === 'ics') {
      const icsContent = generateICSContent(allEvents);
      return new Response(icsContent, {
        headers: { 
          'Content-Type': 'text/calendar;charset=utf-8',
          'Content-Disposition': `attachment; filename="planning-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.ics"`
        },
      });
    }
    
    return new Response('Format non supporté', { status: 400 });
  } catch (error) {
    console.error(error);
    return new Response('Erreur serveur', { status: 500 });
  }
}