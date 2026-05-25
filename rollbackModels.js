const fs = require('fs');

const files = [
    'app/actions/ai.ts',
    'app/actions/ia-center.ts',
    'app/api/portal/chat/route.ts',
    'app/actions/obsidian.ts'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace URL
    content = content.replace(/v1beta\/models\/gemini-3\.1-pro-preview/g, 'v1/models/gemini-2.5-flash');
    
    // Replace text
    content = content.replace(/gemini-3\.1-pro-preview/g, 'gemini-2.5-flash');
    content = content.replace(/Gemini 3\.1 Pro Preview/g, 'Gemini 2.5 Flash');

    fs.writeFileSync(file, content);
}
console.log('Rolled back to 2.5 Flash!');
