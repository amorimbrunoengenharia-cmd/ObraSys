const fs = require('fs');

const file = 'components/modules/RH.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix duplicate regime and encargos in newEmpForm initial state
const duplicatedPattern = /regime: 'CLT', encargos: '68\.0', regime: 'CLT', encargos: '68\.0',/g;
content = content.replace(duplicatedPattern, "regime: 'CLT', encargos: '68.0',");

// Fix missing regime and encargos in the Admitir reset state
const missingResetPattern = /jobRoleId: '', companyId: '', projectIds: \[\], baseSalary: '', status: 'Ativo',\s*email: '', password: ''/g;
content = content.replace(missingResetPattern, "jobRoleId: '', companyId: '', projectIds: [], baseSalary: '', status: 'Ativo', regime: 'CLT', encargos: '68.0', email: '', password: ''");

fs.writeFileSync(file, content, 'utf8');
console.log("fixTsRH.js applied!");
