import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { generateSwotAnalysis } from '../../../../app/actions/ia-center';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  try {
    const swot = await prisma.swotAnalysis.findFirst({
      where: projectId ? { projectId: parseInt(projectId) } : {},
      orderBy: { createdAt: 'desc' }
    });

    if (!swot) {
      return NextResponse.json({ 
        riskLevel: 'Baixo',
        strengths: '["Equipe experiente", "Materiais em estoque"]',
        weaknesses: '["Dependência de fornecedor único", "Prazo apertado"]',
        opportunities: '["Novas tecnologias", "Expansão de escopo"]',
        threats: '["Instabilidade climática", "Aumento de preços"]',
        mitigationPlan: '["Diversificar fornecedores", "Antecipar compras críticas"]'
      });
    }

    return NextResponse.json(swot);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar análise SWOT' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body.projectId;

    if (!projectId) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 });
    }

    const result = await generateSwotAnalysis(projectId);
    
    if (result.success) {
      // Retorna o SWOT salvo (que está no result.data.swot mas precisamos formatar como o banco salva para consistência)
      const swot = await prisma.swotAnalysis.findFirst({
        where: { projectId: parseInt(projectId) },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(swot);
    } else {
      return NextResponse.json({ error: (result as any).error || 'Erro desconhecido' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar análise IA' }, { status: 500 });
  }
}
