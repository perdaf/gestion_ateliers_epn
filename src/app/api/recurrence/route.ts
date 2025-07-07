import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evenementRecurrentSchema, stringifyJoursSemaine } from '@/lib/validations';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Convert string dates to Date objects
    const parsedBody = {
      ...body,
      date_debut_serie: body.date_debut_serie ? new Date(body.date_debut_serie) : undefined,
      date_fin_serie: body.date_fin_serie ? new Date(body.date_fin_serie) : undefined
    };
    
    // Debug log to see what's being received
    console.log('Received data for recurrence creation:', {
      frequence: parsedBody.frequence,
      nth_of_month: parsedBody.nth_of_month,
      jours_semaine: parsedBody.jours_semaine
    });
    
    // Ensure nth_of_month is set for MENSUELLE frequency
    if (parsedBody.frequence === 'MENSUELLE' &&
        (parsedBody.nth_of_month === undefined || parsedBody.nth_of_month === null)) {
      console.log('Setting default nth_of_month for MENSUELLE frequency in API route');
      parsedBody.nth_of_month = 2; // Default to second occurrence
    }
    
    // Validate the request body
    const validatedData = evenementRecurrentSchema.parse(parsedBody);
    
    // Create the recurrence rule in a transaction
    const regleRecurrence = await prisma.$transaction(async (tx) => {
      // Create the recurrence rule
      const newRegle = await tx.regleRecurrence.create({
        data: {
          titre: validatedData.titre,
          heure_debut: validatedData.heure_debut,
          heure_fin: validatedData.heure_fin,
          frequence: validatedData.frequence,
          jours_semaine: stringifyJoursSemaine(validatedData.jours_semaine),
          // Only include nth_of_month if it's defined and frequency is MENSUELLE
          ...(validatedData.frequence === 'MENSUELLE' && validatedData.nth_of_month !== undefined
              ? { nth_of_month: validatedData.nth_of_month }
              : {}),
          date_debut_serie: validatedData.date_debut_serie,
          date_fin_serie: validatedData.date_fin_serie,
          atelier: { connect: { id: validatedData.atelierId } },
          porteurProjet: { connect: { id: validatedData.porteurProjetId } },
        },
      });
      
      // Create the animateur relationships
      for (const animateurId of validatedData.animateursIds) {
        await tx.regleAnimateur.create({
          data: {
            regle: { connect: { id: newRegle.id } },
            agent: { connect: { id: animateurId } },
          },
        });
      }
      
      // Return the created recurrence rule with its relationships
      return tx.regleRecurrence.findUnique({
        where: { id: newRegle.id },
        include: {
          atelier: true,
          porteurProjet: true,
          animateurs: { include: { agent: true } },
        },
      });
    });
    
    return NextResponse.json({ success: true, data: regleRecurrence }, { status: 201 });
  } catch (error) {
    console.error(error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "L'ID de la règle de récurrence est requis" },
        { status: 400 }
      );
    }
    
    // Convert string dates to Date objects
    const parsedData = {
      ...data,
      date_debut_serie: data.date_debut_serie ? new Date(data.date_debut_serie) : undefined,
      date_fin_serie: data.date_fin_serie ? new Date(data.date_fin_serie) : undefined
    };
    
    // Ensure nth_of_month is set for MENSUELLE frequency
    if (parsedData.frequence === 'MENSUELLE' &&
        (parsedData.nth_of_month === undefined || parsedData.nth_of_month === null)) {
      console.log('Setting default nth_of_month for MENSUELLE frequency in PUT route');
      parsedData.nth_of_month = 2; // Default to second occurrence
    }
    
    // Validate the request body
    const validatedData = evenementRecurrentSchema.parse(parsedData);
    
    // Update the recurrence rule in a transaction
    const regleRecurrence = await prisma.$transaction(async (tx) => {
      // Update the recurrence rule
      const updatedRegle = await tx.regleRecurrence.update({
        where: { id },
        data: {
          titre: validatedData.titre,
          heure_debut: validatedData.heure_debut,
          heure_fin: validatedData.heure_fin,
          frequence: validatedData.frequence,
          jours_semaine: stringifyJoursSemaine(validatedData.jours_semaine),
          // Only include nth_of_month if it's defined and frequency is MENSUELLE
          ...(validatedData.frequence === 'MENSUELLE' && validatedData.nth_of_month !== undefined
              ? { nth_of_month: validatedData.nth_of_month }
              : {}),
          date_debut_serie: validatedData.date_debut_serie,
          date_fin_serie: validatedData.date_fin_serie,
          atelier: { connect: { id: validatedData.atelierId } },
          porteurProjet: { connect: { id: validatedData.porteurProjetId } },
        },
      });
      
      // Delete existing animateur relationships
      await tx.regleAnimateur.deleteMany({
        where: { regleId: id },
      });
      
      // Create new animateur relationships
      for (const animateurId of validatedData.animateursIds) {
        await tx.regleAnimateur.create({
          data: {
            regle: { connect: { id: updatedRegle.id } },
            agent: { connect: { id: animateurId } },
          },
        });
      }
      
      // Return the updated recurrence rule with its relationships
      return tx.regleRecurrence.findUnique({
        where: { id: updatedRegle.id },
        include: {
          atelier: true,
          porteurProjet: true,
          animateurs: { include: { agent: true } },
        },
      });
    });
    
    return NextResponse.json({ success: true, data: regleRecurrence });
  } catch (error) {
    console.error(error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "L'ID de la règle de récurrence est requis" },
        { status: 400 }
      );
    }
    
    // Fetch the recurrence rule with its relationships
    const regleRecurrence = await prisma.regleRecurrence.findUnique({
      where: { id },
      include: {
        atelier: true,
        porteurProjet: true,
        animateurs: { include: { agent: true } },
      },
    });
    
    if (!regleRecurrence) {
      return NextResponse.json(
        { success: false, error: 'Règle de récurrence non trouvée' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: regleRecurrence });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "L'ID de la règle de récurrence est requis" },
        { status: 400 }
      );
    }
    
    // Delete the recurrence rule
    await prisma.regleRecurrence.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}