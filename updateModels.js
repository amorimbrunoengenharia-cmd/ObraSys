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
    content = content.replace(/v1\/models\/gemini-2\.5-flash/g, 'v1beta/models/gemini-3.1-pro-preview');
    content = content.replace(/v1beta\/models\/gemini-2\.5-flash/g, 'v1beta/models/gemini-3.1-pro-preview');
    
    // Replace text
    content = content.replace(/gemini-2\.5-flash/g, 'gemini-3.1-pro-preview');
    content = content.replace(/Gemini 2\.5 Flash/g, 'Gemini 3.1 Pro Preview');

    fs.writeFileSync(file, content);
}
console.log('Models updated!');
