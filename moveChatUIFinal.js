const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const anchorMarker = "{/* IA Center Floating Button */}";
const chatUIIndex = content.indexOf(anchorMarker);

if (chatUIIndex !== -1) {
    const chatUI = content.substring(chatUIIndex, content.lastIndexOf("      </div>"));
    
    // Remove from the end
    content = content.substring(0, chatUIIndex) + content.substring(content.lastIndexOf("      </div>"));

    // Find the editor block end using a simpler regex
    const regex = /   return \(\s*<div className="min-h-screen bg-slate-50 dark:bg-\[#0B1121\] font-sans">/;
    const match = content.match(regex);
    
    if (match) {
        content = content.substring(0, match.index) + chatUI + "\n" + content.substring(match.index);
        fs.writeFileSync(file, content);
        console.log('Successfully moved Chat UI!');
    } else {
        console.log('Failed to find the insertion point!');
    }
} else {
    console.log('Could not find Chat UI at the end!');
}
