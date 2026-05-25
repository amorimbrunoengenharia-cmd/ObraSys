const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'Dashboard Executivo FP&A - WayService - 2026_V1.0 (4).xlsx');
const workbook = xlsx.readFile(filePath);

const fs = require('fs');
let output = '--- Planilhas Disponíveis ---\n' + workbook.SheetNames.join(', ') + '\n';

workbook.SheetNames.forEach(sheetName => {
    output += `\n--- Estrutura da Planilha: ${sheetName} ---\n`;
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let count = 0;
    for (let i = 0; i < data.length && count < 10; i++) {
        if (data[i] && data[i].length > 0) {
            output += `Linha ${i + 1}: ${JSON.stringify(data[i])}\n`;
            count++;
        }
    }
});

fs.writeFileSync('excel_structure.txt', output);
console.log('Estrutura salva em excel_structure.txt');
