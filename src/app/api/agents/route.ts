import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/agents - Get all agents
export async function GET(request: NextRequest) {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: {
        nom: 'asc',
      },
    });
    
    return NextResponse.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const agent = await prisma.agent.create({
      data: body,
    });
    
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}