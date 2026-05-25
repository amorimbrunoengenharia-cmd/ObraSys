"use server";
import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export async function getExcelDump() {
    const filePath = path.join(process.cwd(), 'Dashboard Executivo FP&A - WayService - 2026_V1.0 (4).xlsx');
    if (!fs.existsSync(filePath)) return { error: "File not found at " + filePath };
    
    const buffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(n => n.trim().toUpperCase() === 'BASE FINANCEIRA');
    if (!sheetName) return { error: "Sheet 'BASE FINANCEIRA' not found. Available: " + workbook.SheetNames.join(', ') };
    
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    const headers = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0];
    return JSON.parse(JSON.stringify({ headers, data: data.slice(0, 50) }));
}
