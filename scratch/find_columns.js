const xlsx = require('xlsx');

function findSP() {
  const filePath = 'c:/Users/Usuario/Desktop/Projetos ObraSys/obrasys_v2/obrasys-v2/SINAPI/SINAPI_Referência_2026_04.xlsx';
  const wb = xlsx.readFile(filePath);
  
  ['CSD', 'ISD'].forEach(name => {
    const sheet = wb.Sheets[name];
    if (!sheet) return;
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }).slice(0, 15);
    
    console.log(`\n--- Analisando Aba: ${name} ---`);
    data.forEach((row, idx) => {
      const spIndex = row.findIndex(c => String(c || '').toUpperCase().includes('SP') || String(c || '').toUpperCase().includes('SAO PAULO'));
      if (spIndex !== -1) {
        console.log(`Linha ${idx}: Achei "SP" na Coluna ${spIndex} (${xlsx.utils.encode_col(spIndex)}) | Valor: ${row[spIndex]}`);
      }
    });
  });
}

findSP();
