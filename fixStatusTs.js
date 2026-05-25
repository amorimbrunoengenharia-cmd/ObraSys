const fs = require('fs');

const file = 'components/modules/RH.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix missing status in form reset
content = content.replace(
  `setNewEmpForm({
                      name: '', cpf: '', rg: '', matricula: '', birthDate: '',
                      jobRoleId: '', companyId: '', projectIds: [], baseSalary: '',
                      email: '', password: ''
                    });`,
  `setNewEmpForm({
                      name: '', cpf: '', rg: '', matricula: '', birthDate: '',
                      jobRoleId: '', companyId: '', projectIds: [], baseSalary: '', status: 'Ativo',
                      email: '', password: ''
                    });`
);

// 2. Fix employees used before declaration
// Remove totalPayroll from the top
const payrollCode = `
  const totalPayroll = employees
    .filter(emp => emp.status === 'Ativo' || emp.status === 'Férias' || emp.status === 'Aviso Prévio')
    .reduce((acc, emp) => acc + (emp.baseSalary || 0), 0);
`;

content = content.replace(
  "export default function RHClient({ initialEmployees, stats, projects, jobRoles, companies, userRole, turnoverGoal, candidates: initialCandidates }: any) {\n" + payrollCode,
  "export default function RHClient({ initialEmployees, stats, projects, jobRoles, companies, userRole, turnoverGoal, candidates: initialCandidates }: any) {\n"
);

// Place it after employees declaration
content = content.replace(
  "const [candidates, setCandidates] = useState<any[]>(initialCandidates || []);",
  "const [candidates, setCandidates] = useState<any[]>(initialCandidates || []);\n" + payrollCode
);

fs.writeFileSync(file, content, 'utf8');
console.log("fixStatusTs.js applied");
