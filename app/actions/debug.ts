"use server";
import fs from 'fs';
import path from 'path';

export async function debugFileAccess() {
    const cwd = process.cwd();
    const targetFile = 'Dashboard Executivo FP&A - WayService - 2026_V1.0 (4).xlsx';
    const fullPath = path.join(cwd, targetFile);
    
    const results = {
        cwd,
        fullPath,
        exists: fs.existsSync(fullPath),
        dirContents: fs.readdirSync(cwd).filter(f => f.endsWith('.xlsx')),
        error: null as any
    };

    try {
        fs.accessSync(fullPath, fs.constants.R_OK);
        results.exists = true;
    } catch (e: any) {
        results.error = e.message;
    }

    return results;
}
