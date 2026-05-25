const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'SINAPI', 'SINAPI_Referência_2026_04.xlsx');
const outputPath = path.join(__dirname, 'output.txt');

if (!fs.existsSync(filePath)) {
    fs.writeFileSync(outputPath, 'Arquivo não encontrado: ' + filePath);
    process.exit(1);
}

const workbook = XLSX.readFile(filePath);
let output = `Arquivo: ${filePath}\n`;
output += `Abas encontradas: ${workbook.SheetNames.join(', ')}\n\n`;

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    output += `--- ABA: ${sheetName} ---\n`;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        output += `Linha ${i + 1}: ${JSON.stringify(rows[i])}\n`;
    }
    output += '\n';
});

fs.writeFileSync(outputPath, output);
console.log('Análise multi-aba salva em:', outputPath);
