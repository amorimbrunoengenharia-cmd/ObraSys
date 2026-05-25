const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const anchorMarker = "      {/* IA Center Floating Button */}";
const chatUIIndex = content.indexOf(anchorMarker);

if (chatUIIndex !== -1) {
    const chatUI = content.substring(chatUIIndex, content.lastIndexOf("      </div>"));
    
    // Remove it from the end
    content = content.substring(0, chatUIIndex) + content.substring(content.lastIndexOf("      </div>"));

    // Find the end of the editor block
    // The editor block ends with:
    //         </div>
    //       );
    //     }
    //   
    //   return (
    //     <div className="min-h-screen ...
    
    const editorEndAnchor = "        </div>\r\n      );\r\n    }";
    let editorEndIndex = content.indexOf(editorEndAnchor);
    if (editorEndIndex === -1) {
        editorEndIndex = content.indexOf("        </div>\n      );\n    }");
    }

    if (editorEndIndex !== -1) {
        // Inject right before the closing div of the editor block
        content = content.substring(0, editorEndIndex) + "\n" + chatUI + "\n" + content.substring(editorEndIndex);
        fs.writeFileSync(file, content);
        console.log('Moved Chat UI successfully!');
    } else {
        console.log('Could not find editor end anchor!');
    }
} else {
    console.log('Could not find Chat UI at the end!');
}
