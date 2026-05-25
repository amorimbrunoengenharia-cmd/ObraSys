import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/medicoes/contratos: Lista contratos ativos da obra
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const contratos = await prisma.contract.findMany({
      where: projectId ? { projectId: parseInt(projectId) } : {},
      include: {
        items: true,
      }
    });

    return NextResponse.json(contratos);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 });
  }
}

// POST /api/medicoes/sincronizar: Recebe os logs de medição do celular
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logs } = body; // Array de medições realizadas offline

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json({ error: 'Formato de logs inválido' }, { status: 400 });
    }

    const results = [];
    for (const log of logs) {
      // Aqui o Prisma criaria um registro de ContractMeasurement ou atualizaria o medido do item
      // Por enquanto, vamos simular a atualização do item da planilha
      const updatedItem = await prisma.contractItem.update({
        where: { id: parseInt(log.item_id) },
        data: {
          medido: { increment: log.quantidade_medida }
        }
      });
      results.push(updatedItem);
    }

    return NextResponse.json({ success: true, processed: results.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao sincronizar medições' }, { status: 500 });
  }
}
