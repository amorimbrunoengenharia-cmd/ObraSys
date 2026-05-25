const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

try {
    const filePath = path.join(__dirname, 'Dashboard Executivo FP&A - WayService - 2026_V1.0 (4).xlsx');
    const workbook = xlsx.readFile(filePath);
    
    // Tenta encontrar a aba que contém os dados financeiros
    const sheetName = workbook.SheetNames.find(n => n.includes('Financeiro') || n.includes('LANÇAMENTOS'));
    if (!sheetName) {
        console.error('Sheet not found. Available:', workbook.SheetNames);
        process.exit(1);
    }
    
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // Pega os primeiros 50 registros
    const sample = data.slice(0, 50);
    
    fs.writeFileSync('excel_data_dump.json', JSON.stringify(sample, null, 2));
    console.log(`Dados exportados (${sample.length} linhas)`);
} catch (e) {
    console.error(e);
}
