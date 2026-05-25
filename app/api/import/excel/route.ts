import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { importReferenceBatch } from '../../../../app/actions/estimate';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const targetState = formData.get('state') as string || 'SP';
    const referenceDate = formData.get('date') as string || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'Arquivo não enviado' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer', cellFormula: false, cellHTML: false, cellText: false });
    
    let totalImported = 0;
    
    // 1. Detectar SINAPI
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const metaRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, range: 'A1:D10' });
    const isSinapi = JSON.stringify(metaRows).toLowerCase().includes('sistema nacional de pesquisa de custos');
    
    let finalDate = referenceDate;
    if (isSinapi && metaRows[2] && metaRows[2][1]) {
      finalDate = String(metaRows[2][1]);
    }

    for (const sheetName of wb.SheetNames) {
      if (sheetName.toLowerCase().includes('menu') || sheetName.toLowerCase().includes('busca')) continue;

      const ws = wb.Sheets[sheetName];
      if (!ws['!ref']) continue;
      
      const range = XLSX.utils.decode_range(ws['!ref']);
      const totalRows = range.e.r;
      
      const previewRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 });
      let headerIndex = -1;
      for (let i = 0; i < Math.min(previewRows.length, 30); i++) {
        const row = (previewRows[i] || []).map(c => String(c || '').toLowerCase());
        if (row.some(c => c.includes('código')) && row.some(c => c.includes('descrição'))) {
          headerIndex = i;
          break;
        }
      }

      if (headerIndex === -1) continue;

      const headerRow = previewRows[headerIndex];
      const findColIndex = (keys: string[], exact = false) => {
        return headerRow.findIndex(c => {
          const val = String(c || '').toLowerCase();
          if (exact) return keys.some(k => val === k.toLowerCase());
          return keys.some(k => val.includes(k.toLowerCase()));
        });
      };

      const colMap = {
        code: findColIndex(['código', 'cod', 'ref', 'id']),
        description: findColIndex(['descrição', 'desc', 'item', 'nome']),
        unit: findColIndex(['unidade', 'unid', 'un']),
        price: isSinapi ? findColIndex([targetState], true) : findColIndex(['preco', 'valor', 'custo', 'unitario', 'mediano'])
      };

      const chunkSize = 500;
      for (let startRow = headerIndex + 1; startRow <= totalRows; startRow += chunkSize) {
        const endRow = Math.min(startRow + chunkSize - 1, totalRows);
        const chunkRows: any[][] = XLSX.utils.sheet_to_json(ws, { 
          header: 1, range: { s: {r: startRow, c: 0}, e: {r: endRow, c: range.e.c} } 
        });

        const formatted = chunkRows.map((row: any) => {
          const code = colMap.code !== -1 ? String(row[colMap.code] || '') : '';
          const description = colMap.description !== -1 ? String(row[colMap.description] || '') : '';
          const unit = colMap.unit !== -1 ? String(row[colMap.unit] || 'un') : 'un';
          
          let price = 0;
          if (colMap.price !== -1) {
            const raw = String(row[colMap.price] || '0').trim();
            if (/^\d+\.\d+$/.test(raw)) {
              price = parseFloat(raw);
            } else {
              price = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
            }
            if (isNaN(price)) price = 0;
          }

          return { 
            code, description, unit, unitPrice: price, 
            state: targetState, referenceDate: finalDate 
          };
        }).filter(item => item.code && item.code.length > 2 && item.description);

        if (formatted.length > 0) {
          const baseType = isSinapi ? 'SINAPI' : 'CUSTOM';
          await importReferenceBatch(baseType, formatted);
          totalImported += formatted.length;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: totalImported, 
      date: finalDate, 
      isSinapi 
    });
  } catch (error: any) {
    console.error('Erro na API de Import:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
