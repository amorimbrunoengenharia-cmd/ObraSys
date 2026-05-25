const fs = require('fs');

const file = 'components/modules/RH.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update newEmpForm interface and default values
content = content.replace(
  "jobRoleId: string, companyId: string, projectIds: string[], baseSalary: string, status: string,",
  "jobRoleId: string, companyId: string, projectIds: string[], baseSalary: string, status: string, regime: string, encargos: string,"
);

content = content.replace(
  "jobRoleId: '', companyId: '', projectIds: [], baseSalary: '', status: 'Ativo',",
  "jobRoleId: '', companyId: '', projectIds: [], baseSalary: '', status: 'Ativo', regime: 'CLT', encargos: '68.0',"
);

// 2. Format Currency helper
const currencyHelper = `
  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\\D/g, '');
    if (value === '') {
      setNewEmpForm({ ...newEmpForm, baseSalary: '' });
      return;
    }
    const numValue = (parseInt(value, 10) / 100).toFixed(2);
    setNewEmpForm({ ...newEmpForm, baseSalary: numValue });
  };

  const formatBRL = (value: string) => {
    if (!value) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(value));
  };
`;
content = content.replace(
  "const [isSavingRole, setIsSavingRole] = useState(false);",
  "const [isSavingRole, setIsSavingRole] = useState(false);\n" + currencyHelper
);

// 3. Update handleCreateEmployee parsing
content = content.replace(
  "const parsedBaseSalary = parseFloat(newEmpForm.baseSalary);",
  "const parsedBaseSalary = parseFloat(newEmpForm.baseSalary);\n    const parsedEncargos = parseFloat(newEmpForm.encargos);"
);

content = content.replace(
  "baseSalary: !isNaN(parsedBaseSalary) ? parsedBaseSalary : undefined,\n        status: newEmpForm.status,",
  "baseSalary: !isNaN(parsedBaseSalary) ? parsedBaseSalary : undefined,\n        status: newEmpForm.status,\n        regime: newEmpForm.regime,\n        encargos: !isNaN(parsedEncargos) ? parsedEncargos : undefined,"
);

// 4. Update Modal population when Editing
content = content.replace(
  "baseSalary: emp.baseSalary?.toString() || '',\n                            status: emp.status || 'Ativo',",
  "baseSalary: emp.baseSalary?.toString() || '',\n                            status: emp.status || 'Ativo',\n                            regime: emp.regime || 'CLT',\n                            encargos: emp.encargos?.toString() || '68.0',"
);

// For the Admitir reset (done again in case there are multiple)
content = content.replace(
  "jobRoleId: '', companyId: '', projectIds: [], baseSalary: '', status: 'Ativo',",
  "jobRoleId: '', companyId: '', projectIds: [], baseSalary: '', status: 'Ativo', regime: 'CLT', encargos: '68.0',"
);

// 5. Update Total Payroll calculation
const newTotalPayroll = `
  const totalPayroll = employees
    .filter(emp => emp.status === 'Ativo' || emp.status === 'Férias' || emp.status === 'Aviso Prévio')
    .reduce((acc, emp) => {
      const salary = emp.baseSalary || 0;
      if (emp.regime === 'PJ') return acc + salary;
      const encargos = emp.encargos || 68;
      return acc + (salary * (1 + encargos / 100));
    }, 0);
`;
content = content.replace(
  /const totalPayroll = employees[\s\S]*?\.reduce\(\(acc, emp\) => acc \+ \(emp\.baseSalary \|\| 0\), 0\);/,
  newTotalPayroll.trim()
);

// 6. Update UI for Base Salary
const oldSalaryHTML = `                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Salário Base (R$)</label>
                  <input type="number" step="0.01" value={newEmpForm.baseSalary} onChange={e => setNewEmpForm({...newEmpForm, baseSalary: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                </div>`;

const newSalaryAndRegimeHTML = `                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Salário Base (R$)</label>
                  <input type="text" placeholder="R$ 0,00" value={formatBRL(newEmpForm.baseSalary)} onChange={handleSalaryChange} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Regime</label>
                    <select value={newEmpForm.regime} onChange={e => setNewEmpForm({...newEmpForm, regime: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 font-semibold appearance-none">
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                    </select>
                  </div>
                  {newEmpForm.regime === 'CLT' && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Encargos (%)</label>
                      <input type="number" step="0.1" value={newEmpForm.encargos} onChange={e => setNewEmpForm({...newEmpForm, encargos: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                    </div>
                  )}
                </div>`;

content = content.replace(oldSalaryHTML, newSalaryAndRegimeHTML);

fs.writeFileSync(file, content, 'utf8');
console.log("applySalaryRegime.js completed!");
