const xlsx = require('xlsx');

function findCodeInCSD() {
  const filePath = 'c:/Users/Usuario/Desktop/Projetos ObraSys/obrasys_v2/obrasys-v2/SINAPI/SINAPI_Referência_2026_04.xlsx';
  try {
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets['CSD'];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log('Buscando 104658 nas primeiras 50 linhas de CSD:');
    for (let i = 0; i < 50; i++) {
      const row = data[i];
      if (!row) continue;
      const idx = row.findIndex(c => String(c) === '104658');
      if (idx !== -1) {
        console.log(`Linha ${i}, Coluna ${idx}: 104658 encontrado!`);
        console.log(`Conteúdo da linha: ${JSON.stringify(row)}`);
        return;
      }
    }
    console.log('104658 não encontrado nas primeiras 50 linhas de CSD.');
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

findCodeInCSD();
