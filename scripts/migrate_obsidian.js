const fs = require('fs');
const path = require('path');

const SOURCE = 'C:\\Users\\Usuario\\Documents\\Obsidian Vault';
const DEST = 'C:\\Users\\Usuario\\Desktop\\Projetos ObraSys\\ObraSys';

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(function(childItemName) {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        // Para arquivos, copiamos apenas se não existirem ou se quisermos mesclar (mantendo os mais novos)
        fs.copyFileSync(src, dest);
    }
}

console.log(`🚀 Iniciando migração de: ${SOURCE}`);
console.log(`📂 Para: ${DEST}`);

try {
    if (fs.existsSync(SOURCE)) {
        copyRecursiveSync(SOURCE, DEST);
        console.log('✅ Migração concluída com sucesso!');
    } else {
        console.error('❌ Pasta de origem não encontrada!');
    }
} catch (err) {
    console.error('❌ Erro durante a migração:', err.message);
}
