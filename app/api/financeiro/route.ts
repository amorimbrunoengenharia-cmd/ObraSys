import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // 'A Vencer', 'Pendente'

    const where: any = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;

    const records = await prisma.financialRecord.findMany({
      where,
      orderBy: { dataVencimento: 'asc' },
      include: { project: true }
    });

    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar financeiro' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, recordId, status } = body;

    if (action === 'APROVAR') {
      const updated = await prisma.financialRecord.update({
        where: { id: recordId },
        data: { status: status || 'A Vencer' }
      });
      return NextResponse.json(updated);
    }

    if (action === 'LANÇAR') {
      const { descricao, valor, projectId, tipo, categoria } = body;
      const newRecord = await prisma.financialRecord.create({
        data: {
          descricao,
          valorBruto: parseFloat(valor),
          valorLiquido: parseFloat(valor),
          impostosRetidos: 0,
          tipo: tipo || 'SAÍDA',
          status: 'A Vencer',
          projectId: parseInt(projectId),
          classificacaoDRE: categoria || '5. Despesa Administrativa',
          dataCompetencia: new Date(),
          dataVencimento: new Date()
        }
      });
      return NextResponse.json(newRecord);
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro no processamento financeiro' }, { status: 500 });
  }
}
