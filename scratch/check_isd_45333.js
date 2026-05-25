const xlsx = require('xlsx');

function check45333() {
  const filePath = 'c:/Users/Usuario/Desktop/Projetos ObraSys/obrasys_v2/obrasys-v2/SINAPI/SINAPI_Referência_2026_04.xlsx';
  try {
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets['ISD'];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const row = data.find(r => String(r[1]) === '45333');
    if (row) {
      console.log('Row 45333 found:');
      console.log(JSON.stringify(row));
      
      // Find SP column
      for (let i = 0; i < 15; i++) {
        const hRow = data[i];
        if (!hRow) continue;
        const spIdx = hRow.findIndex(c => String(c || '').toUpperCase() === 'SP');
        if (spIdx !== -1) {
          console.log(`SP found at column ${spIdx}. Value: ${row[spIdx]}`);
          break;
        }
      }
    } else {
      console.log('Row 45333 not found in ISD');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check45333();
