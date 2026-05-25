import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // No futuro, usar session

    // Busca estatísticas globais do investidor
    const [projectsCount, pendingApprovals, totalPhysicalProgress] = await Promise.all([
      prisma.project.count(),
      prisma.clientApproval.count({ where: { status: 'Pendente' } }),
      prisma.project.aggregate({
        _avg: { physicalProgress: true }
      })
    ]);

    const profileData = {
      stats: {
        projects: projectsCount,
        pending: pendingApprovals,
        score: Math.round(totalPhysicalProgress._avg.physicalProgress || 0)
      },
      support: {
        whatsapp: '5511999999999',
        email: 'suporte@obrasys.com'
      }
    };

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Erro no Profile API:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do perfil' }, { status: 500 });
  }
}
