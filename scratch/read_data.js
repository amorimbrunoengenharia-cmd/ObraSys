const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'SINAPI', 'SINAPI_Referência_2026_04.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    
    ['ISD', 'CSD'].forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log(`\n--- ABA: ${sheetName} ---`);
            for (let i = 0; i < Math.min(rows.length, 15); i++) {
                console.log(`Linha ${i + 1}:`, JSON.stringify(rows[i]));
            }
        }
    });
} catch (e) {
    console.error('Erro ao ler dados:', e.message);
}
