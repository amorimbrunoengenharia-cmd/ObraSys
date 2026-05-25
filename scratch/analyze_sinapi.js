const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\Usuario\\Desktop\\Projetos ObraSys\\obrasys_v2\\obrasys-v2\\SINAPI';
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.endsWith('.xlsx')) {
        const fullPath = path.join(dir, file);
        const workbook = XLSX.readFile(fullPath);
        console.log(`\n--- FILE: ${file} ---`);
        console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);
    }
});
