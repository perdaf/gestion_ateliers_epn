import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/ateliers/[id] - Get a specific atelier
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const atelier = await prisma.atelier.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!atelier) {
      return NextResponse.json(
        { error: 'Atelier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(atelier);
  } catch (error) {
    console.error('Error fetching atelier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch atelier' },
      { status: 500 }
    );
  }
}

// PUT /api/ateliers/[id] - Update a specific atelier
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const atelier = await prisma.atelier.update({
      where: {
        id: params.id,
      },
      data: body,
    });

    return NextResponse.json(atelier);
  } catch (error) {
    console.error('Error updating atelier:', error);
    return NextResponse.json(
      { error: 'Failed to update atelier' },
      { status: 500 }
    );
  }
}

// DELETE /api/ateliers/[id] - Delete a specific atelier
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.atelier.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting atelier:', error);
    return NextResponse.json(
      { error: 'Failed to delete atelier' },
      { status: 500 }
    );
  }
}