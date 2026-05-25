import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // Busca a obra específica ou a primeira disponível se não informar ID
    const project = await prisma.project.findFirst({
      where: projectId ? { id: Number(projectId) } : {},
      include: {
        tasks: {
          orderBy: { id: 'asc' }
        },
        rdos: {
          include: { 
            activities: { include: { photos: true } } 
          },
          orderBy: { date: 'desc' },
          take: 10
        },
        approvals: {
          where: { status: 'Pendente' },
          orderBy: { requestedAt: 'desc' }
        },
        documentFolders: {
          where: { visibleToClient: true }
        },
        documents: {
          where: { visibleToClient: true }
        },
        milestones: {
          orderBy: { targetDate: 'asc' }
        },
        financials: {
          where: {
            tipo: 'ENTRADA',
            classificacaoDRE: { contains: 'Receita Operacional' }
          },
          orderBy: { dataCompetencia: 'desc' }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Nenhum projeto encontrado' }, { status: 404 });
    }

    // Processa fotos para a galeria unificada
    const galeriaFotos = project.rdos.flatMap(rdo => 
      rdo.activities.flatMap(act => 
        act.photos.map(p => ({
          id: p.id,
          url: p.url,
          titulo: p.caption || 'Foto de Campo',
          date: rdo.date
        }))
      )
    );

    // --- MOTOR DE ANÁLISE PROFISSIONAL (PENTE FINO) ---
    const smartAlerts = [];
    const now = new Date();
    
    // 1. ANÁLISE DE CRONOGRAMA GLOBAL (Atraso Real)
    // Calcula a "saúde temporal" do projeto
    const start = project.tasks.length > 0 ? new Date(Math.min(...project.tasks.map(t => new Date(t.startDate || Date.now()).getTime()))) : new Date();
    const end = project.tasks.length > 0 ? new Date(Math.max(...project.tasks.map(t => new Date(t.endDate || Date.now()).getTime()))) : new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const expectedProgress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
    const progressGap = expectedProgress - project.physicalProgress;

    if (progressGap > 15) {
      smartAlerts.push({
        id: 'c_global', type: 'alert', title: 'Desvio de Cronograma',
        msg: `O projeto apresenta um desvio de ${Math.round(progressGap)}% entre o planejado e o executado.`,
        time: 'Crítico', read: false
      });
    }

    // 2. ANÁLISE FINANCEIRA (Divergência Físico-Financeira)
    const financialProgress = project.budget > 0 ? (project.spent / project.budget) * 100 : 0;
    const finGap = financialProgress - project.physicalProgress;

    if (finGap > 20) {
      smartAlerts.push({
        id: 'f_gap', type: 'ia', title: 'Saúde Financeira',
        msg: `O consumo de verba (${Math.round(financialProgress)}%) está muito acima do progresso físico (${Math.round(project.physicalProgress)}%). Risco de desequilíbrio.`,
        time: 'Alerta IA', read: false
      });
    }

    // 3. ANÁLISE DE CONTINUIDADE (RDOs)
    const lastRdo = project.rdos[0];
    if (lastRdo) {
      const lastRdoDate = new Date(lastRdo.date);
      const daysSinceLastRdo = (now.getTime() - lastRdoDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastRdo > 2 && project.status === 'Em Execução') {
        smartAlerts.push({
          id: 'o_rdo', type: 'alert', title: 'Continuidade de Campo',
          msg: `Não registramos Diários de Obra nos últimos ${Math.round(daysSinceLastRdo)} dias. Verifique a operação.`,
          time: 'Operacional', read: false
        });
      }
    }

    // 4. ANÁLISE DE MARCOS ATRASADOS
    const overdueMilestones = project.milestones.filter(m => 
      m.targetDate && new Date(m.targetDate) < now && (m.completionPercentage || 0) < 100
    );

    if (overdueMilestones.length > 0) {
      smartAlerts.push({
        id: 'm_overdue', type: 'alert', title: 'Marcos em Atraso',
        msg: `Existem ${overdueMilestones.length} marcos contratuais com data de entrega vencida.`,
        time: 'Urgente', read: false
      });
    }

    // 5. ANÁLISE DE CLIMA (Impacto)
    if (lastRdo?.weather?.includes('Chuva')) {
      smartAlerts.push({
        id: 'w_weather', type: 'ia', title: 'Impacto Climático',
        msg: 'As chuvas registradas no último período podem gerar reprogramação em atividades de terraplanagem/externas.',
        time: 'Informativo', read: true
      });
    }

    const portalData = {
      id: project.id,
      obraNome: project.name,
      status: project.status,
      location: project.location || 'Local não definido',
      budget: project.budget || 0,
      spent: project.spent || 0,
      physicalProgress: project.physicalProgress,
      progressoFisico: {
        percentual: project.physicalProgress,
        status: project.physicalProgress > 50 ? 'Adiantado' : 'No Prazo'
      },
      galeriaFotos: galeriaFotos.length > 0 ? galeriaFotos : [
        { id: 0, url: 'https://images.unsplash.com/photo-1541888086425-d81bb19240f5?w=500&q=80', titulo: 'Obra em Início', date: '2026-01-01' }
      ],
      tasks: project.tasks,
      milestones: project.milestones,
      rdos: project.rdos,
      approvals: project.approvals,
      contractMeasurements: (project.financials || []).map((f: any) => ({
        id: f.id,
        numeroMedicao: f.descricao ? parseInt(f.descricao.replace(/\\D/g, '') || '0') : 0,
        dataMedicao: f.dataCompetencia || f.createdAt,
        valorBruto: f.valorBruto,
        valorRetencao: f.caucaoRetida || 0,
        valorLiquido: f.valorLiquido,
        status: f.status
      })),
      documentFolders: project.documentFolders,
      documents: project.documents,
      smartAlerts: smartAlerts
    };

    return NextResponse.json(portalData);
  } catch (error) {
    console.error('Erro no Portal API:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do portal' }, { status: 500 });
  }
}
