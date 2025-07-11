import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evenementUniqueSchema } from '@/lib/validations';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "L'ID de l'événement est requis" },
        { status: 400 }
      );
    }
    
    // Fetch the event with its relationships
    const evenement = await prisma.evenement.findUnique({
      where: { id },
      include: {
        atelier: true,
        porteurProjet: true,
        animateurs: {
          include: {
            agent: true
          }
        },
        ateliers: { include: { atelier: true } }
      },
    });
    
    if (!evenement) {
      return NextResponse.json(
        { success: false, error: "Événement non trouvé" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: evenement });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/evenements-uniques - Starting event creation');
    const body = await request.json();
    
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // Convert string dates to Date objects
    const parsedBody = {
      ...body,
      date_debut: body.date_debut ? new Date(body.date_debut) : undefined,
      date_fin: body.date_fin ? new Date(body.date_fin) : undefined,
    };
    
    console.log('Parsed body with date objects:', JSON.stringify({
      ...parsedBody,
      date_debut: parsedBody.date_debut?.toISOString(),
      date_fin: parsedBody.date_fin?.toISOString(),
    }, null, 2));
    
    try {
      // Log the raw body for debugging
      console.log('Raw body before validation:', JSON.stringify(parsedBody, null, 2));
      
      // Ensure porteurProjetIds is an array
      if (!parsedBody.porteurProjetIds || !Array.isArray(parsedBody.porteurProjetIds)) {
        console.error('porteurProjetIds is not an array:', parsedBody.porteurProjetIds);
        if (parsedBody.porteurProjetId) {
          // If we have a porteurProjetId but no porteurProjetIds, create the array
          parsedBody.porteurProjetIds = [parsedBody.porteurProjetId];
          console.log('Created porteurProjetIds array from porteurProjetId:', parsedBody.porteurProjetIds);
        } else {
          parsedBody.porteurProjetIds = [];
          console.log('Initialized empty porteurProjetIds array');
        }
      }
      
      // Validate the request body
      console.log('Attempting to validate with schema');
      const validatedData = evenementUniqueSchema.parse(parsedBody);
      console.log('Validation successful');
      console.log('Validated data for event creation:', JSON.stringify({
        ...validatedData,
        date_debut: validatedData.date_debut?.toISOString(),
        date_fin: validatedData.date_fin?.toISOString(),
      }, null, 2));
        
      // Create the event in a transaction
      const evenement = await prisma.$transaction(async (tx) => {
        // Create the event
        // Ensure we have a valid porteurProjetId
        if (!validatedData.porteurProjetIds || !validatedData.porteurProjetIds.length) {
          console.error('No porteur de projet selected');
          throw new Error('Au moins un porteur de projet doit être sélectionné');
        }
        
        // Use the first porteurProjetId from the array or the explicitly provided porteurProjetId
        let porteurProjetId;
        if (body.porteurProjetId && typeof body.porteurProjetId === 'string') {
          porteurProjetId = body.porteurProjetId;
          console.log('Using explicitly provided porteurProjetId from body:', porteurProjetId);
        } else {
          porteurProjetId = validatedData.porteurProjetIds[0];
          console.log('Using first porteurProjetId from array:', porteurProjetId);
        }
        
        // Verify the porteurProjetId exists
        try {
          const porteurExists = await tx.agent.findUnique({
            where: { id: porteurProjetId }
          });
          
          if (!porteurExists) {
            console.error(`Porteur de projet with ID ${porteurProjetId} not found`);
            throw new Error(`Porteur de projet with ID ${porteurProjetId} not found`);
          }
          
          console.log('Creating event with data:', {
            titre: validatedData.titre,
            date_debut: validatedData.date_debut?.toISOString(),
            date_fin: validatedData.date_fin?.toISOString(),
            atelierId: validatedData.atelierId,
            porteurProjetId: porteurProjetId,
          });
          
          // Handle multiple ateliers or single atelier for backward compatibility
          let atelierIds: string[] = [];
          if (validatedData.atelierIds && validatedData.atelierIds.length > 0) {
            atelierIds = validatedData.atelierIds;
          } else if (validatedData.atelierId) {
            atelierIds = [validatedData.atelierId];
          }
          
          if (atelierIds.length === 0) {
            throw new Error('Au moins un atelier doit être sélectionné');
          }
          
          // Create event with first atelier for backward compatibility
          const newEvenement = await tx.evenement.create({
            data: {
              titre: validatedData.titre,
              date_debut: validatedData.date_debut,
              date_fin: validatedData.date_fin,
              atelier: { connect: { id: atelierIds[0] } },
              porteurProjet: { connect: { id: porteurProjetId } },
            },
          });
          
          console.log('Event created successfully with ID:', newEvenement.id);
          
          // Create atelier relationships for multiple ateliers
          for (const atelierId of atelierIds) {
            await tx.evenementAtelier.create({
              data: {
                evenementId: newEvenement.id,
                atelierId: atelierId,
              },
            });
          }
          
          // Create the animateur relationships
          console.log('Creating animateur relationships for animateurs:', validatedData.animateursIds);
          
          for (const animateurId of validatedData.animateursIds) {
            console.log('Creating animateur relationship for:', animateurId);
            await tx.evenementAnimateur.create({
              data: {
                evenement: { connect: { id: newEvenement.id } },
                agent: { connect: { id: animateurId } },
              },
            });
          }
          
          console.log('All animateur relationships created successfully');
          
          // Return the created event with its relationships
          return tx.evenement.findUnique({
            where: { id: newEvenement.id },
            include: {
              atelier: true,
              porteurProjet: true,
              animateurs: { include: { agent: true } },
              ateliers: { include: { atelier: true } }
            },
          });
        } catch (txError) {
          console.error('Error in transaction:', txError);
          throw txError;
        }
      });
      
      console.log('Event creation completed successfully');
      return NextResponse.json({ success: true, data: evenement }, { status: 201 });
    } catch (validationError) {
      console.error('Validation error:', validationError);
      
      if (validationError instanceof z.ZodError) {
        console.error('Zod validation error details:', JSON.stringify(validationError.errors, null, 2));
        return NextResponse.json(
          { success: false, error: 'Validation error', details: validationError.errors },
          { status: 400 }
        );
      }
      
      console.error('Non-Zod error:', validationError);
      throw validationError; // Re-throw if it's not a validation error
    }
  } catch (error: any) {
    console.error('Error in POST /api/evenements-uniques:', error);
    
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
    console.log('PUT /api/evenements-uniques - Starting event update');
    const body = await request.json();
    const { id, ...data } = body;
    
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    if (!id) {
      console.error('Missing event ID in request');
      return NextResponse.json(
        { success: false, error: "L'ID de l'événement est requis" },
        { status: 400 }
      );
    }
    
    // Convert string dates to Date objects
    const parsedData = {
      ...data,
      date_debut: data.date_debut ? new Date(data.date_debut) : undefined,
      date_fin: data.date_fin ? new Date(data.date_fin) : undefined,
    };
    
    console.log('Parsed data with date objects:', JSON.stringify({
      ...parsedData,
      date_debut: parsedData.date_debut?.toISOString(),
      date_fin: parsedData.date_fin?.toISOString(),
    }, null, 2));
    
    try {
      // Validate the request body
      const validatedData = evenementUniqueSchema.parse(parsedData);
      console.log('Validation successful');
      console.log('Validated data for event update:', JSON.stringify({
        ...validatedData,
        date_debut: validatedData.date_debut?.toISOString(),
        date_fin: validatedData.date_fin?.toISOString(),
      }, null, 2));
      
      // Update the event in a transaction
      const evenement = await prisma.$transaction(async (tx) => {
        // Ensure we have a valid porteurProjetId
        if (!validatedData.porteurProjetIds || !validatedData.porteurProjetIds.length) {
          console.error('No porteur de projet selected');
          throw new Error('Au moins un porteur de projet doit être sélectionné');
        }
        
        // Use the first porteurProjetId from the array or the explicitly provided porteurProjetId
        let porteurProjetId;
        if (body.porteurProjetId && typeof body.porteurProjetId === 'string') {
          porteurProjetId = body.porteurProjetId;
          console.log('Using explicitly provided porteurProjetId from body:', porteurProjetId);
        } else {
          porteurProjetId = validatedData.porteurProjetIds[0];
          console.log('Using first porteurProjetId from array:', porteurProjetId);
        }
        
        // Verify the porteurProjetId exists
        try {
          const porteurExists = await tx.agent.findUnique({
            where: { id: porteurProjetId }
          });
          
          if (!porteurExists) {
            console.error(`Porteur de projet with ID ${porteurProjetId} not found`);
            throw new Error(`Porteur de projet with ID ${porteurProjetId} not found`);
          }
          
          console.log('Updating event with data:', {
            id,
            titre: validatedData.titre,
            date_debut: validatedData.date_debut?.toISOString(),
            date_fin: validatedData.date_fin?.toISOString(),
            atelierId: validatedData.atelierId,
            porteurProjetId: porteurProjetId,
          });
          
          // Handle multiple ateliers or single atelier for backward compatibility
          let atelierIds: string[] = [];
          if (validatedData.atelierIds && validatedData.atelierIds.length > 0) {
            atelierIds = validatedData.atelierIds;
          } else if (validatedData.atelierId) {
            atelierIds = [validatedData.atelierId];
          }
          
          if (atelierIds.length === 0) {
            throw new Error('Au moins un atelier doit être sélectionné');
          }
          
          // Update the event with first atelier for backward compatibility
          const updatedEvenement = await tx.evenement.update({
            where: { id },
            data: {
              titre: validatedData.titre,
              date_debut: validatedData.date_debut,
              date_fin: validatedData.date_fin,
              atelier: { connect: { id: atelierIds[0] } },
              porteurProjet: { connect: { id: porteurProjetId } },
            },
          });
          
          console.log('Event updated successfully with ID:', updatedEvenement.id);
          
          // Delete existing atelier relationships
          console.log('Deleting existing atelier relationships for event:', id);
          await tx.evenementAtelier.deleteMany({
            where: { evenementId: id },
          });
          
          // Create new atelier relationships for multiple ateliers
          for (const atelierId of atelierIds) {
            await tx.evenementAtelier.create({
              data: {
                evenementId: updatedEvenement.id,
                atelierId: atelierId,
              },
            });
          }
          
          // Delete existing animateur relationships
          console.log('Deleting existing animateur relationships for event:', id);
          await tx.evenementAnimateur.deleteMany({
            where: { evenementId: id },
          });
          
          // Create new animateur relationships
          console.log('Creating new animateur relationships for animateurs:', validatedData.animateursIds);
          
          for (const animateurId of validatedData.animateursIds) {
            console.log('Creating animateur relationship for:', animateurId);
            await tx.evenementAnimateur.create({
              data: {
                evenement: { connect: { id: updatedEvenement.id } },
                agent: { connect: { id: animateurId } },
              },
            });
          }
          
          console.log('All animateur relationships created successfully');
          
          // Return the updated event with its relationships
          return tx.evenement.findUnique({
            where: { id: updatedEvenement.id },
            include: {
              atelier: true,
              porteurProjet: true,
              animateurs: { include: { agent: true } },
              ateliers: { include: { atelier: true } }
            },
          });
        } catch (txError) {
          console.error('Error in transaction:', txError);
          throw txError;
        }
      });
      
      console.log('Event update completed successfully');
      return NextResponse.json({ success: true, data: evenement });
    } catch (validationError) {
      console.error('Validation error:', validationError);
      
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Validation error', details: validationError.errors },
          { status: 400 }
        );
      }
      
      throw validationError; // Re-throw if it's not a validation error
    }
  } catch (error: any) {
    console.error('Error in PUT /api/evenements-uniques:', error);
    
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

export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/evenements-uniques - Starting event deletion');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log('Request to delete event with ID:', id);
    
    if (!id) {
      console.error('Missing event ID in request');
      return NextResponse.json(
        { success: false, error: "L'ID de l'événement est requis" },
        { status: 400 }
      );
    }
    
    try {
      // First check if the event exists
      const eventExists = await prisma.evenement.findUnique({
        where: { id },
      });
      
      if (!eventExists) {
        console.error('Event not found for deletion:', id);
        return NextResponse.json(
          { success: false, error: "Événement non trouvé" },
          { status: 404 }
        );
      }
      
      console.log('Event found, proceeding with deletion');
      
      // Delete the event (this will cascade delete the animateur relationships due to onDelete: Cascade)
      await prisma.evenement.delete({
        where: { id },
      });
      
      console.log('Event deleted successfully:', id);
      return NextResponse.json({ success: true });
    } catch (deleteError) {
      console.error('Error deleting event:', deleteError);
      throw deleteError;
    }
  } catch (error: any) {
    console.error('Error in DELETE /api/evenements-uniques:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}