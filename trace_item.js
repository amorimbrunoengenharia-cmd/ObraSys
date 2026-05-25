const xlsx = require('xlsx');

function trace() {
  const filePath = 'c:/Users/Usuario/Desktop/Projetos ObraSys/obrasys_v2/obrasys-v2/SINAPI/SINAPI_Referência_2026_04.xlsx';
  const wb = xlsx.readFile(filePath);
  const isd = wb.Sheets['ISD'];
  const data = xlsx.utils.sheet_to_json(isd, { header: 1 });
  
  const targetCode = '45333';
  const row = data.find(r => String(r[1] || '').trim() === targetCode);
  
  if (row) {
    console.log(`\n=== RASTREIO ITEM ${targetCode} ===`);
    row.forEach((val, col) => {
      if (val !== null && val !== undefined) {
        console.log(`Coluna ${col}: ${val}`);
      }
    });
    
    // Verificar cabeçalho para SP
    for (let i = 0; i < 15; i++) {
        const spCol = data[i].findIndex(c => String(c||'').toUpperCase() === 'SP');
        if (spCol !== -1) {
            console.log(`\n>>> ACHEI "SP" NA LINHA ${i}, COLUNA ${spCol}`);
            console.log(`>>> PREÇO NESSA COLUNA: R$ ${row[spCol]}`);
        }
    }
  } else {
    console.log('Item não encontrado na aba ISD');
  }
}

trace();
