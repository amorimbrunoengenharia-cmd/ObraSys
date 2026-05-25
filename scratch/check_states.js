const xlsx = require('xlsx');

function checkStates() {
  const filePath = 'c:/Users/Usuario/Desktop/Projetos ObraSys/obrasys_v2/obrasys-v2/SINAPI/SINAPI_Referência_2026_04.xlsx';
  try {
    const wb = xlsx.readFile(filePath);
    ['ISD', 'CSD'].forEach(name => {
      const sheet = wb.Sheets[name];
      if (!sheet) {
        console.log(`\n!!! Aba ${name} não encontrada !!!`);
        return;
      }
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }).slice(0, 15);
      
      console.log(`\n=== COLUNAS DE ESTADO: ${name} ===`);
      for (let i = 0; i < 15; i++) {
        const row = data[i];
        if (!row) continue;
        row.forEach((cell, idx) => {
          if (cell && typeof cell === 'string' && (cell.length === 2 || cell.includes('-'))) {
            console.log(`Linha ${i}, Coluna ${idx}: "${cell}"`);
          }
        });
      }
    });
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

checkStates();
