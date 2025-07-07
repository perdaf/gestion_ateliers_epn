import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/ateliers - Get all ateliers
export async function GET(request: NextRequest) {
  try {
    const ateliers = await prisma.atelier.findMany({
      orderBy: {
        titre: 'asc',
      },
    });
    
    return NextResponse.json({
      success: true,
      data: ateliers
    });
  } catch (error) {
    console.error('Error fetching ateliers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ateliers' },
      { status: 500 }
    );
  }
}

// POST /api/ateliers - Create a new atelier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const atelier = await prisma.atelier.create({
      data: body,
    });
    
    return NextResponse.json(atelier, { status: 201 });
  } catch (error) {
    console.error('Error creating atelier:', error);
    return NextResponse.json(
      { error: 'Failed to create atelier' },
      { status: 500 }
    );
  }
}