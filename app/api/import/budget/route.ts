import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '../../../../lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const estimateId = formData.get('estimateId') as string;

    if (!file || !estimateId) {
      return NextResponse.json({ success: false, error: 'Arquivo ou Orçamento não enviado' }, { status: 400 });
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { stages: true }
    });

    if (!estimate) {
      return NextResponse.json({ success: false, error: 'Orçamento não encontrado' }, { status: 404 });
    }

    let nextOrder = estimate.stages.length > 0 ? Math.max(...estimate.stages.map(s => s.order)) + 1 : 0;

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Planilha vazia' }, { status: 400 });
    }

    // Identificar colunas a partir do cabeçalho
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const rowStr = JSON.stringify(data[i]).toLowerCase();
      if (rowStr.includes('descri') || rowStr.includes('servi')) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return NextResponse.json({ success: false, error: 'Não foi possível encontrar a linha de cabeçalho na planilha.' }, { status: 400 });
    }

    const headers: string[] = data[headerRowIdx].map((h: any) => h ? String(h).toLowerCase() : '');
    const descIdx = headers.findIndex(h => h.includes('descri') || h.includes('servi'));
    const unitIdx = headers.findIndex(h => h.includes('unid'));
    const qtyIdx = headers.findIndex(h => h.includes('quant') || h.includes('qtd'));
    const priceIdx = headers.findIndex(h => h.includes('unit') && (h.includes('pre') || h.includes('val') || h.includes('cust')));
    const codeIdx = headers.findIndex(h => h.includes('cod') || h.includes('item'));

    if (descIdx === -1) {
      return NextResponse.json({ success: false, error: 'Coluna de Descrição não encontrada.' }, { status: 400 });
    }

    let currentStageId = null;
    let itemsAdded = 0;
    let stagesAdded = 0;

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[descIdx]) continue;

      const description = String(row[descIdx]).trim();
      const unit = unitIdx !== -1 && row[unitIdx] ? String(row[unitIdx]).trim() : '';
      const qty = qtyIdx !== -1 ? parseFloat(row[qtyIdx]) : NaN;
      const price = priceIdx !== -1 ? parseFloat(row[priceIdx]) : NaN;
      const code = codeIdx !== -1 && row[codeIdx] ? String(row[codeIdx]).trim() : null;

      // Regra de Inferência: Se não tem unidade nem quantidade, é etapa. 
      // Ou se estiver em negrito/caixa alta, mas não conseguimos ler estilo.
      const isItem = unit && !isNaN(qty) && !isNaN(price);

      if (!isItem) {
        // Criar etapa
        const stage = await prisma.estimateStage.create({
          data: {
            name: (code ? `${code} - ` : '') + description,
            order: nextOrder++,
            estimateId: estimateId
          }
        });
        currentStageId = stage.id;
        stagesAdded++;
      } else {
        // É item, precisa de uma etapa atual
        if (!currentStageId) {
          const stage = await prisma.estimateStage.create({
            data: {
              name: 'Itens Importados (Sem Etapa)',
              order: nextOrder++,
              estimateId: estimateId
            }
          });
          currentStageId = stage.id;
          stagesAdded++;
        }

        const unitPrice = isNaN(price) ? 0 : price;
        const quantity = isNaN(qty) ? 0 : qty;
        
        await prisma.estimateItem.create({
          data: {
            code,
            description,
            unit,
            quantity,
            unitPrice,
            totalPrice: quantity * unitPrice,
            stageId: currentStageId
          }
        });
        itemsAdded++;
      }
    }

    // Recalcular total do orçamento
    const allStages = await prisma.estimateStage.findMany({
      where: { estimateId },
      include: { items: true }
    });
    
    let totalAmount = 0;
    allStages.forEach(s => s.items.forEach(it => totalAmount += it.totalPrice));

    await prisma.estimate.update({
      where: { id: estimateId },
      data: { totalAmount }
    });

    return NextResponse.json({ success: true, itemsAdded, stagesAdded });
  } catch (error: any) {
    console.error('Erro na importacao:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
