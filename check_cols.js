const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

async function checkColumns() {
    const filePath = 'C:\\Users\\Usuario\\Desktop\\Projetos ObraSys\\obrasys_v2\\obrasys-v2\\Dashboard Executivo FP&A - WayService - 2026_V1.0 (4).xlsx';
    if (!fs.existsSync(filePath)) {
        console.error("File not found");
        return;
    }
    const buffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(n => n.trim().toUpperCase() === 'BASE FINANCEIRA');
    if (!sheetName) {
        console.error("Sheet not found. Available:", workbook.SheetNames);
        return;
    }
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log("COLUNAS ENCONTRADAS:", data[0]);
}

checkColumns();
