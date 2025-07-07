import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evenementRecurrentSchema, stringifyJoursSemaine } from '@/lib/validations';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log pour déboguer nth_of_month
    console.log('POST /api/recurrence - Body received:', {
      nth_of_month: body.nth_of_month,
      frequence: body.frequence,
      fullBody: JSON.stringify(body, null, 2)
    });
    
    // Convert string dates to Date objects
    const parsedBody = {
      ...body,
      date_debut_serie: body.date_debut_serie ? new Date(body.date_debut_serie) : undefined,
      date_fin_serie: body.date_fin_serie ? new Date(body.date_fin_serie) : undefined
    };
    
    // Prepare data for recurrence creation
    
    // Ensure porteurProjetIds is an array
    if (!parsedBody.porteurProjetIds || !Array.isArray(parsedBody.porteurProjetIds)) {
      if (parsedBody.porteurProjetId) {
        // If we have a porteurProjetId but no porteurProjetIds, create the array
        parsedBody.porteurProjetIds = [parsedBody.porteurProjetId];
      } else {
        parsedBody.porteurProjetIds = [];
      }
    }
    
    // Handle nth_of_month for MENSUELLE frequency
    if (parsedBody.frequence === 'MENSUELLE') {
      // Check if nth_of_month is provided in the body (even if it's 0 or 1)
      if (body.nth_of_month !== undefined && body.nth_of_month !== null) {
        // Convert to number if it's a string
        if (typeof body.nth_of_month === 'string' && !isNaN(Number(body.nth_of_month))) {
          parsedBody.nth_of_month = Number(body.nth_of_month);
        } else if (typeof body.nth_of_month === 'number') {
          parsedBody.nth_of_month = body.nth_of_month;
        }
        console.log('POST - nth_of_month after parsing:', parsedBody.nth_of_month);
      } else {
        // Only set default if it's truly missing
        parsedBody.nth_of_month = 1; // Default to first occurrence
        console.log('POST - nth_of_month was missing, using default:', parsedBody.nth_of_month);
      }
    }
    
    // Validate the request body
    try {
      const validatedData = evenementRecurrentSchema.parse(parsedBody);
    
    // Create the recurrence rule in a transaction
    const regleRecurrence = await prisma.$transaction(async (tx) => {
      // Ensure we have a valid porteurProjetId
      if (!validatedData.porteurProjetIds || !validatedData.porteurProjetIds.length) {
        throw new Error('Au moins un porteur de projet doit être sélectionné');
      }
      
      // Use the first porteurProjetId from the array or the explicitly provided porteurProjetId
      let porteurProjetId;
      if (body.porteurProjetId && typeof body.porteurProjetId === 'string') {
        porteurProjetId = body.porteurProjetId;
      } else {
        porteurProjetId = validatedData.porteurProjetIds[0];
      }
      
      // Verify the porteurProjetId exists
      try {
        const porteurExists = await tx.agent.findUnique({
          where: { id: porteurProjetId }
        });
        
        if (!porteurExists) {
          throw new Error(`Porteur de projet with ID ${porteurProjetId} not found`);
        }
      } catch (error) {
        throw error;
      }
      
      // Create the recurrence rule
      const newRegle = await tx.regleRecurrence.create({
        data: {
          titre: validatedData.titre,
          heure_debut: validatedData.heure_debut,
          heure_fin: validatedData.heure_fin,
          frequence: validatedData.frequence,
          jours_semaine: stringifyJoursSemaine(validatedData.jours_semaine),
          // Only include nth_of_month if frequency is MENSUELLE
          ...(validatedData.frequence === 'MENSUELLE'
              ? {
                  // Use the provided value or default to 1 if truly missing
                  nth_of_month: validatedData.nth_of_month !== undefined && validatedData.nth_of_month !== null
                    ? Number(validatedData.nth_of_month)
                    : 1
                }
              : {}),
          date_debut_serie: validatedData.date_debut_serie,
          date_fin_serie: validatedData.date_fin_serie,
          atelier: { connect: { id: validatedData.atelierId } },
          porteurProjet: { connect: { id: porteurProjetId } },
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
    } catch (validationError) {
      console.error('Validation error in recurrence creation:', validationError);
      
      if (validationError instanceof z.ZodError) {
        console.error('Zod validation error details:', JSON.stringify(validationError.errors, null, 2));
        return NextResponse.json(
          { success: false, error: 'Validation error', details: validationError.errors },
          { status: 400 }
        );
      }
      
      console.error('Non-Zod error in recurrence creation:', validationError);
      throw validationError; // Re-throw if it's not a validation error
    }
  } catch (error: any) {
    console.error('Error in POST /api/recurrence:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Erreur serveur', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    
    // Log pour déboguer nth_of_month
    console.log('PUT /api/recurrence - Body received:', {
      nth_of_month: body.nth_of_month,
      data_nth_of_month: data.nth_of_month,
      frequence: body.frequence,
      id: id,
      fullBody: JSON.stringify(body, null, 2)
    });
    
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
    
    // Prepare data for recurrence update
    
    // Ensure porteurProjetIds is an array
    if (!parsedData.porteurProjetIds || !Array.isArray(parsedData.porteurProjetIds)) {
      if (parsedData.porteurProjetId) {
        // If we have a porteurProjetId but no porteurProjetIds, create the array
        parsedData.porteurProjetIds = [parsedData.porteurProjetId];
      } else {
        parsedData.porteurProjetIds = [];
      }
    }
    
    // Handle nth_of_month for MENSUELLE frequency
    if (parsedData.frequence === 'MENSUELLE') {
      // Check if the form explicitly sent a value in the nth_of_month field
      if (body.nth_of_month !== undefined && body.nth_of_month !== null) {
        // Convert to number if it's a string
        if (typeof body.nth_of_month === 'string' && !isNaN(Number(body.nth_of_month))) {
          parsedData.nth_of_month = Number(body.nth_of_month);
        } else if (typeof body.nth_of_month === 'number') {
          parsedData.nth_of_month = body.nth_of_month;
        }
        console.log('PUT - nth_of_month from body:', parsedData.nth_of_month);
      }
      // If not in the body directly, check if it's in the data object
      else if (data.nth_of_month !== undefined && data.nth_of_month !== null) {
        if (typeof data.nth_of_month === 'string' && !isNaN(Number(data.nth_of_month))) {
          parsedData.nth_of_month = Number(data.nth_of_month);
        } else if (typeof data.nth_of_month === 'number') {
          parsedData.nth_of_month = data.nth_of_month;
        }
        console.log('PUT - nth_of_month from data:', parsedData.nth_of_month);
      }
      // If not in the body directly, check if it's in the form data under a different name
      else if (body.form && body.form.nth_of_month !== undefined && body.form.nth_of_month !== null) {
        if (typeof body.form.nth_of_month === 'string' && !isNaN(Number(body.form.nth_of_month))) {
          parsedData.nth_of_month = Number(body.form.nth_of_month);
        } else if (typeof body.form.nth_of_month === 'number') {
          parsedData.nth_of_month = body.form.nth_of_month;
        }
        console.log('PUT - nth_of_month from body.form:', parsedData.nth_of_month);
      }
      // If no value was provided, set a default value
      else {
        parsedData.nth_of_month = 1; // Default to first occurrence
        console.log('PUT - nth_of_month was missing, using default:', parsedData.nth_of_month);
      }
      
      // Ensure nth_of_month is a number
      if (typeof parsedData.nth_of_month === 'string') {
        parsedData.nth_of_month = Number(parsedData.nth_of_month);
      }
      
      console.log('PUT - Final nth_of_month value:', parsedData.nth_of_month);
    }
    
    // Validate the request body
    try {
      const validatedData = evenementRecurrentSchema.parse(parsedData);
    
    // Update the recurrence rule in a transaction
    const regleRecurrence = await prisma.$transaction(async (tx) => {
      // Ensure we have a valid porteurProjetId
      if (!validatedData.porteurProjetIds || !validatedData.porteurProjetIds.length) {
        throw new Error('Au moins un porteur de projet doit être sélectionné');
      }
      
      // Use the first porteurProjetId from the array or the explicitly provided porteurProjetId
      let porteurProjetId;
      if (body.porteurProjetId && typeof body.porteurProjetId === 'string') {
        porteurProjetId = body.porteurProjetId;
      } else {
        porteurProjetId = validatedData.porteurProjetIds[0];
      }
      
      // Verify the porteurProjetId exists
      try {
        const porteurExists = await tx.agent.findUnique({
          where: { id: porteurProjetId }
        });
        
        if (!porteurExists) {
          throw new Error(`Porteur de projet with ID ${porteurProjetId} not found`);
        }
      } catch (error) {
        throw error;
      }
      
      // Update the recurrence rule
      const updatedRegle = await tx.regleRecurrence.update({
        where: { id },
        data: {
          titre: validatedData.titre,
          heure_debut: validatedData.heure_debut,
          heure_fin: validatedData.heure_fin,
          frequence: validatedData.frequence,
          jours_semaine: stringifyJoursSemaine(validatedData.jours_semaine),
          // Always include nth_of_month for MENSUELLE frequency
          ...(validatedData.frequence === 'MENSUELLE'
              ? {
                  // Only use default if nth_of_month is undefined or null, not if it's 0
                  nth_of_month: validatedData.nth_of_month !== undefined && validatedData.nth_of_month !== null
                    ? Number(validatedData.nth_of_month)
                    : 1
                }
              : {}),
          date_debut_serie: validatedData.date_debut_serie,
          date_fin_serie: validatedData.date_fin_serie,
          atelier: { connect: { id: validatedData.atelierId } },
          porteurProjet: { connect: { id: porteurProjetId } },
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
    } catch (validationError) {
      console.error('Validation error in recurrence update:', validationError);
      
      if (validationError instanceof z.ZodError) {
        console.error('Zod validation error details:', JSON.stringify(validationError.errors, null, 2));
        return NextResponse.json(
          { success: false, error: 'Validation error', details: validationError.errors },
          { status: 400 }
        );
      }
      
      console.error('Non-Zod error in recurrence update:', validationError);
      throw validationError; // Re-throw if it's not a validation error
    }
  } catch (error: any) {
    console.error('Error in PUT /api/recurrence:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Erreur serveur', message: error?.message || 'Unknown error' },
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