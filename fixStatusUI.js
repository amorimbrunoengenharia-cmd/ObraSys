const fs = require('fs');
const file = 'components/modules/RH.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<label className="text-xs font-bold text-slate-500 uppercase">Data de Nascimento</label>
                      <input type="date" value={newEmpForm.birthDate} onChange={e => setNewEmpForm({...newEmpForm, birthDate: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                    </div>
  
                  </div>`;

const newStr = `<label className="text-xs font-bold text-slate-500 uppercase">Data de Nascimento</label>
                      <input type="date" value={newEmpForm.birthDate} onChange={e => setNewEmpForm({...newEmpForm, birthDate: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                    </div>
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
                  </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Status select injected successfully!");
} else {
  console.log("Could not find the target string!");
}
