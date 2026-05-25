const fs = require('fs');

const file = 'components/modules/RH.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add status to newEmpForm
content = content.replace(
  "jobRoleId: string, companyId: string, projectIds: string[], baseSalary: string,",
  "jobRoleId: string, companyId: string, projectIds: string[], baseSalary: string, status: string,"
);

content = content.replace(
  "jobRoleId: '', companyId: '', projectIds: [], baseSalary: '',",
  "jobRoleId: '', companyId: '', projectIds: [], baseSalary: '', status: 'Ativo',"
);

// Add status to handleCreateEmployee
content = content.replace(
  "baseSalary: !isNaN(parsedBaseSalary) ? parsedBaseSalary : undefined,",
  "baseSalary: !isNaN(parsedBaseSalary) ? parsedBaseSalary : undefined,\n        status: newEmpForm.status,"
);

// Add status to edit population
content = content.replace(
  "baseSalary: emp.baseSalary?.toString() || '',",
  "baseSalary: emp.baseSalary?.toString() || '',\n                            status: emp.status || 'Ativo',"
);

// Add status select to Modal
const statusSelect = `
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Status do Colaborador</label>
                    <select value={newEmpForm.status} onChange={e => setNewEmpForm({...newEmpForm, status: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 appearance-none font-semibold">
                      <option value="Ativo">🟢 Ativo</option>
                      <option value="Férias">🟡 Férias</option>
                      <option value="Aviso Prévio">🟠 Aviso Prévio</option>
                      <option value="Afastado INSS">🟣 Afastado INSS</option>
                      <option value="Licença Maternidade">🟣 Licença Maternidade</option>
                      <option value="Demitido">🔴 Demitido</option>
                    </select>
                  </div>
`;

content = content.replace(
  `<div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Data de Nascimento</label>
                      <input type="date" value={newEmpForm.birthDate} onChange={e => setNewEmpForm({...newEmpForm, birthDate: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                    </div>`,
  `<div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Data de Nascimento</label>
                      <input type="date" value={newEmpForm.birthDate} onChange={e => setNewEmpForm({...newEmpForm, birthDate: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    ` + statusSelect
);

// 2. Add Payroll Cost Card to Dashboard
const getPayrollCost = `
  const totalPayroll = employees
    .filter(emp => emp.status === 'Ativo' || emp.status === 'Férias' || emp.status === 'Aviso Prévio')
    .reduce((acc, emp) => acc + (emp.baseSalary || 0), 0);
`;

content = content.replace(
  "export default function RHClient({ initialEmployees, stats, projects, jobRoles, companies, userRole, turnoverGoal, candidates: initialCandidates }: any) {",
  "export default function RHClient({ initialEmployees, stats, projects, jobRoles, companies, userRole, turnoverGoal, candidates: initialCandidates }: any) {\n" + getPayrollCost
);

const costCard = `
              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 shadow-sm flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <div><p className="text-xs font-bold text-emerald-600 uppercase">Custo Folha (Ativos)</p><h3 className="text-2xl font-black text-emerald-600">R$ {totalPayroll.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
              </div>
`;

content = content.replace(
  '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">',
  '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">\n' + costCard
);

// 3. Update Table Status Display Colors
content = content.replace(
  `<td className="px-6 py-4">
                        <span className="text-[10px] font-black px-2 py-1 bg-emerald-100 text-emerald-700 rounded">{emp.status.toUpperCase()}</span>
                      </td>`,
  `<td className="px-6 py-4">
                        <span className={\`text-[10px] font-black px-2 py-1 rounded \${emp.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : emp.status === 'Demitido' ? 'bg-rose-100 text-rose-700' : emp.status === 'Férias' ? 'bg-yellow-100 text-yellow-700' : emp.status === 'Aviso Prévio' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}\`}>{emp.status.toUpperCase()}</span>
                      </td>`
);

fs.writeFileSync(file, content, 'utf8');
console.log("addCostsAndStatus.js applied");
