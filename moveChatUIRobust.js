const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const anchorMarker = "{/* IA Center Floating Button */}";
const chatUIIndex = content.indexOf(anchorMarker);

if (chatUIIndex !== -1) {
    const endStr = "      </div>\n  );\n}";
    const endIndex = content.lastIndexOf(endStr);
    
    // Extract the chat UI block
    let chatUI = content.substring(chatUIIndex, endIndex);
    
    // Sometimes there are extra spaces at the end, let's trim just in case, but keep spacing safe
    // Actually we can just remove the chatUI from the file and keep the original ending
    content = content.substring(0, chatUIIndex) + endStr;

    // Now let's inject it into the editor block
    const editorEndAnchor = "      );\r\n    }\r\n  \r\n   return (\r\n      <div className=\"min-h-screen bg-slate-50 dark:bg-[#0B1121] font-sans\">";
    let editorEndIndex = content.indexOf(editorEndAnchor);
    if (editorEndIndex === -1) {
        // Try with \n instead of \r\n
        const editorEndAnchorLF = "      );\n    }\n  \n   return (\n      <div className=\"min-h-screen bg-slate-50 dark:bg-[#0B1121] font-sans\">";
        editorEndIndex = content.indexOf(editorEndAnchorLF);
    }

    if (editorEndIndex !== -1) {
        // Inject right before the closing div of the editor block
        content = content.substring(0, editorEndIndex) + chatUI + "\n" + content.substring(editorEndIndex);
        fs.writeFileSync(file, content);
        console.log('Moved Chat UI successfully!');
    } else {
        console.log('Could not find editor end anchor!');
        // Let's use regex to find the `return (` block
        const regex = /      \);\s*\}\s*return \(\s*<div className="min-h-screen bg-slate-50 dark:bg-\[#0B1121\] font-sans">/;
        const match = content.match(regex);
        if (match) {
            content = content.substring(0, match.index) + chatUI + "\n" + content.substring(match.index);
            fs.writeFileSync(file, content);
            console.log('Moved Chat UI successfully using regex!');
        } else {
            console.log('Regex also failed!');
        }
    }
} else {
    console.log('Could not find Chat UI at the end!');
}
