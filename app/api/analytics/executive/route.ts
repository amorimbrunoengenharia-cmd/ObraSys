import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    // Filtros base
    const baseFilter: any = {};
    if (projectId && projectId !== 'all') baseFilter.projectId = Number(projectId);

    // 1. Dados Mensais para o Gráfico (Últimos 6 meses)
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const chartData = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59);

      const monthEntries = await prisma.financialRecord.aggregate({
        where: { ...baseFilter, tipo: 'ENTRADA', dataVencimento: { gte: start, lte: end } },
        _sum: { valorLiquido: true }
      });

      const monthExits = await prisma.financialRecord.aggregate({
        where: { ...baseFilter, tipo: 'SAÍDA', dataVencimento: { gte: start, lte: end } },
        _sum: { valorLiquido: true }
      });

      chartData.push({
        label: monthLabels[m],
        receitas: monthEntries._sum.valorLiquido || 0,
        despesas: monthExits._sum.valorLiquido || 0
      });
    }

    // 2. KPIs Globais
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const entries = await prisma.financialRecord.aggregate({
      where: { ...baseFilter, tipo: 'ENTRADA', dataVencimento: { gte: currentMonthStart, lte: currentMonthEnd } },
      _sum: { valorLiquido: true }
    });

    const exits = await prisma.financialRecord.aggregate({
      where: { ...baseFilter, tipo: 'SAÍDA', dataVencimento: { gte: currentMonthStart, lte: currentMonthEnd } },
      _sum: { valorLiquido: true }
    });

    let idc = 1.05;
    let faturamento = 'R$ 15.0M';
    if (projectId && projectId !== 'all') {
      const p = await prisma.project.findUnique({ where: { id: Number(projectId) } });
      if (p) {
        idc = p.idc || 1.0;
        faturamento = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(p.budget || 0);
      }
    }

    const pendingRequests = await prisma.purchaseRequest.count({ where: { status: 'PENDENTE', ...baseFilter } });

    return NextResponse.json({
      chartData,
      financeiro: {
        entradas: entries._sum.valorLiquido || 0,
        saidas: exits._sum.valorLiquido || 0,
        saldo: (entries._sum.valorLiquido || 0) - (exits._sum.valorLiquido || 0)
      },
      idc: { valor: idc, percentualBarra: Math.min(idc * 70, 100) },
      suprimentos: { pendentes: pendingRequests },
      faturamento: { formatado: faturamento },
      margem: { formatado: '19.5%' },
      obrasAtivas: 5
    });

  } catch (error) {
    console.error('Erro na API Chart:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
