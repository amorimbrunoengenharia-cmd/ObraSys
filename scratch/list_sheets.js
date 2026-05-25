const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'SINAPI', 'SINAPI_Referência_2026_04.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    console.log('--- ABAS ENCONTRADAS ---');
    console.log(workbook.SheetNames.join('\n'));
} catch (e) {
    console.error('Erro ao ler abas:', e.message);
}
