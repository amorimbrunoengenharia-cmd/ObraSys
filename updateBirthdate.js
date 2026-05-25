const fs = require('fs');

const file = 'components/modules/RH.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add birthDate to form state
content = content.replace(
  "name: string, cpf: string, rg: string, matricula: string,",
  "name: string, cpf: string, rg: string, matricula: string, birthDate: string,"
);

content = content.replace(
  "name: '', cpf: '', rg: '', matricula: '',",
  "name: '', cpf: '', rg: '', matricula: '', birthDate: '',"
);

// 2. Add birthDate to handleCreateEmployee
content = content.replace(
  "matricula: newEmpForm.matricula,",
  "matricula: newEmpForm.matricula,\n      birthDate: newEmpForm.birthDate ? new Date(newEmpForm.birthDate + 'T12:00:00') : undefined,"
);

// 3. Add input field to the form
const birthDateInput = `
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Data de Nascimento</label>
                    <input type="date" value={newEmpForm.birthDate} onChange={e => setNewEmpForm({...newEmpForm, birthDate: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                  </div>
`;

content = content.replace(
  `<div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Matrícula</label>
                    <input value={newEmpForm.matricula} onChange={e => setNewEmpForm({...newEmpForm, matricula: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                  </div>`,
  `<div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Matrícula</label>
                    <input value={newEmpForm.matricula} onChange={e => setNewEmpForm({...newEmpForm, matricula: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                  </div>` + birthDateInput
);

// 4. Update the birthdays logic
const currentMonth = new Date().getMonth();
const birthdaysLogic = `
                   {employees.filter(emp => emp.birthDate && new Date(emp.birthDate).getUTCMonth() === new Date().getMonth()).sort((a,b) => new Date(a.birthDate).getUTCDate() - new Date(b.birthDate).getUTCDate()).length > 0 ? employees.filter(emp => emp.birthDate && new Date(emp.birthDate).getUTCMonth() === new Date().getMonth()).sort((a,b) => new Date(a.birthDate).getUTCDate() - new Date(b.birthDate).getUTCDate()).slice(0, 5).map(emp => (
                     <div key={emp.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-white font-bold">{emp.name.charAt(0)}</div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{emp.name}</p>
                          <p className="text-[10px] font-black text-rose-500 uppercase">Parabéns! (Dia {new Date(emp.birthDate).getUTCDate()})</p>
                        </div>
                     </div>
                   )) : (
                     <p className="text-slate-500 text-sm">Nenhum aniversariante neste mês.</p>
                   )}
`;

content = content.replace(
  `{employees.length > 0 ? employees.slice(0, 3).map(emp => (
                     <div key={emp.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-white font-bold">{emp.name.charAt(0)}</div>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{emp.name}</p>
                          <p className="text-[10px] font-black text-rose-500 uppercase">Parabéns!</p>
                        </div>
                     </div>
                   )) : (
                     <p className="text-slate-500 text-sm">Nenhum aniversariante neste mês.</p>
                   )}`,
  birthdaysLogic
);

fs.writeFileSync(file, content, 'utf8');
console.log("updateBirthdate executed");
