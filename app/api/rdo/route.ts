import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const id = searchParams.get('id');

    if (id) {
      const rdo = await prisma.rDO.findUnique({
        where: { id: Number(id) },
        include: {
          activities: {
            include: { photos: true }
          },
          author: true
        }
      });
      return NextResponse.json(rdo);
    }

    const rdos = await prisma.rDO.findMany({
      where: projectId ? { projectId: Number(projectId) } : {},
      include: {
        activities: {
          include: { photos: true }
        },
        author: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(rdos);
  } catch (error) {
    console.error('Erro ao buscar RDOs:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
