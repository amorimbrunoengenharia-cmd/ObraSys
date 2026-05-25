const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/GEMINI_API_KEY=(.*)/);
if (!match) {
    console.log('No key in .env.local');
    process.exit(1);
}
let key = match[1].trim();
if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
}

fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key)
    .then(r => r.json())
    .then(j => {
        if (j.error) {
            console.log('API Error:', j.error);
            return;
        }
        const gemini3 = j.models.filter(x => x.name.includes('gemini-3')).map(x => x.name);
        console.log('Gemini 3 models:', gemini3.length ? gemini3 : 'None');
        
        const allGemini = j.models.filter(x => x.name.includes('gemini')).map(x => x.name);
        console.log('Some available models:', allGemini.slice(0, 10));
    })
    .catch(console.error);
