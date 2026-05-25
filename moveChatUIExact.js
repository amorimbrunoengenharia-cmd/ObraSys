const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const anchorMarker = "      {/* IA Center Floating Button */}";
const chatUIIndex = content.indexOf(anchorMarker);

if (chatUIIndex !== -1) {
    const chatUI = content.substring(chatUIIndex, content.lastIndexOf("      </div>"));
    
    // Remove from the end
    content = content.substring(0, chatUIIndex) + content.substring(content.lastIndexOf("      </div>"));

    // Find the editor block end using the exact string seen in output
    const exactAnchor = "      </div>\r\n    );\r\n  }\r\n\r\n  return (";
    let editorEndIndex = content.indexOf(exactAnchor);
    if (editorEndIndex === -1) {
        const exactAnchorLF = "      </div>\n    );\n  }\n\n  return (";
        editorEndIndex = content.indexOf(exactAnchorLF);
    }

    if (editorEndIndex !== -1) {
        content = content.substring(0, editorEndIndex) + chatUI + "\n" + content.substring(editorEndIndex);
        fs.writeFileSync(file, content);
        console.log('Successfully moved Chat UI!');
    } else {
        console.log('Failed to find exact anchor!');
    }
} else {
    console.log('Could not find Chat UI at the end!');
}
