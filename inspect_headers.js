const xlsx = require('xlsx');

function inspect() {
  const filePath = 'c:/Users/Usuario/Desktop/Projetos ObraSys/obrasys_v2/obrasys-v2/SINAPI/SINAPI_Referência_2026_04.xlsx';
  try {
    const wb = xlsx.readFile(filePath);
    ['Analítico', 'ISD', 'CSD'].forEach(name => {
      const sheet = wb.Sheets[name] || wb.Sheets['Analitico'];
      if (!sheet) {
        console.log(`\n!!! Aba ${name} não encontrada !!!`);
        return;
      }
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }).slice(0, 15);
      
      console.log(`\n=== INSPEÇÃO: ${name} ===`);
      data.forEach((row, idx) => {
        console.log(`Linha ${idx}: ${JSON.stringify(row.slice(0, 12))}`);
      });
    });
  } catch (err) {
    console.error('Erro ao ler arquivo:', err.message);
  }
}

inspect();
