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
    const body = await request.json();
    
    // Convert string dates to Date objects
    const parsedBody = {
      ...body,
      date_debut: body.date_debut ? new Date(body.date_debut) : undefined,
      date_fin: body.date_fin ? new Date(body.date_fin) : undefined,
    };
    
    // Validate the request body
    const validatedData = evenementUniqueSchema.parse(parsedBody);
    
    // Create the event in a transaction
    const evenement = await prisma.$transaction(async (tx) => {
      // Create the event
      const newEvenement = await tx.evenement.create({
        data: {
          titre: validatedData.titre,
          date_debut: validatedData.date_debut,
          date_fin: validatedData.date_fin,
          atelier: { connect: { id: validatedData.atelierId } },
          porteurProjet: { connect: { id: validatedData.porteurProjetId } },
        },
      });
      
      // Create the animateur relationships
      for (const animateurId of validatedData.animateursIds) {
        await tx.evenementAnimateur.create({
          data: {
            evenement: { connect: { id: newEvenement.id } },
            agent: { connect: { id: animateurId } },
          },
        });
      }
      
      // Return the created event with its relationships
      return tx.evenement.findUnique({
        where: { id: newEvenement.id },
        include: {
          atelier: true,
          porteurProjet: true,
          animateurs: { include: { agent: true } },
        },
      });
    });
    
    return NextResponse.json({ success: true, data: evenement }, { status: 201 });
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
    
    // Validate the request body
    const validatedData = evenementUniqueSchema.parse(parsedData);
    
    // Update the event in a transaction
    const evenement = await prisma.$transaction(async (tx) => {
      // Update the event
      const updatedEvenement = await tx.evenement.update({
        where: { id },
        data: {
          titre: validatedData.titre,
          date_debut: validatedData.date_debut,
          date_fin: validatedData.date_fin,
          atelier: { connect: { id: validatedData.atelierId } },
          porteurProjet: { connect: { id: validatedData.porteurProjetId } },
        },
      });
      
      // Delete existing animateur relationships
      await tx.evenementAnimateur.deleteMany({
        where: { evenementId: id },
      });
      
      // Create new animateur relationships
      for (const animateurId of validatedData.animateursIds) {
        await tx.evenementAnimateur.create({
          data: {
            evenement: { connect: { id: updatedEvenement.id } },
            agent: { connect: { id: animateurId } },
          },
        });
      }
      
      // Return the updated event with its relationships
      return tx.evenement.findUnique({
        where: { id: updatedEvenement.id },
        include: {
          atelier: true,
          porteurProjet: true,
          animateurs: { include: { agent: true } },
        },
      });
    });
    
    return NextResponse.json({ success: true, data: evenement });
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "L'ID de l'événement est requis" },
        { status: 400 }
      );
    }
    
    // Delete the event
    await prisma.evenement.delete({
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