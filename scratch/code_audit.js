const fs = require('fs');
const path = require('path');

const targetDirs = [
    'app',
    'components/modules'
];

function walkSync(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(filepath, filelist);
        } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
            filelist.push(filepath);
        }
    }
    return filelist;
}

let allFiles = [];
for (const dir of targetDirs) {
    allFiles = allFiles.concat(walkSync(dir));
}

const report = [];

for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const isMocked = content.includes('mock') || content.includes('Mock') || content.includes('fakeData') || content.includes('dummy');
    const isPrisma = content.includes('prisma.');
    const isFetch = content.includes('fetch(');
    const hasClient = content.includes('"use client"');
    
    // Check if it's a major module component or page
    if (file.includes('page.tsx') || file.includes('components\\modules')) {
        let name = file;
        if (file.includes('page.tsx')) {
            const parts = file.split(path.sep);
            name = parts.length > 1 ? parts[parts.length - 2] + ' Page' : 'Root Page';
        } else {
            name = path.basename(file, '.tsx');
        }
        
        report.push({
            name,
            file,
            isMocked,
            isPrisma,
            isFetch,
            hasClient,
            lines: content.split('\n').length
        });
    }
}

console.log(JSON.stringify(report.filter(r => r.lines > 50), null, 2));
