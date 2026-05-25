const fs = require('fs');
const file = 'components/modules/TI.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\\\$/g, '$');
content = content.replace(/\\`/g, '`');

fs.writeFileSync(file, content);
console.log('Fixed escaping in TI.tsx');
