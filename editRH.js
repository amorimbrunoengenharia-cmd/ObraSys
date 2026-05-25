const fs = require('fs');

const file = 'components/modules/RH.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the ALL option from the select and its logic
content = content.replace(
  `onChange={e => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    if (values.includes('ALL')) {
                      setNewEmpForm({...newEmpForm, projectIds: projects.map((p:any) => p.id.toString())});
                    } else {
                      setNewEmpForm({...newEmpForm, projectIds: values});
                    }
                  }}`,
  `onChange={e => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setNewEmpForm({...newEmpForm, projectIds: values});
                  }}`
);

content = content.replace(
  '<option value="ALL" className="font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 mb-1">🏢 ESCRITÓRIO (Acesso a Todas as Obras)</option>',
  ''
);

// 2. Add Editing state and logic
if (!content.includes('const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);')) {
  content = content.replace(
    'const [isAdmitting, setIsAdmitting] = useState(false);',
    'const [isAdmitting, setIsAdmitting] = useState(false);\n  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);'
  );
}

// Update the handleCreateEmployee to handle edit too
content = content.replace(
  'const handleCreateEmployee = async (e: React.FormEvent) => {',
  `const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdmitting(true);
    
    const data = {
      name: newEmpForm.name,
      cpf: newEmpForm.cpf,
      rg: newEmpForm.rg,
      matricula: newEmpForm.matricula,
      birthDate: newEmpForm.birthDate ? new Date(newEmpForm.birthDate + 'T12:00:00') : undefined,
      baseSalary: newEmpForm.baseSalary ? parseFloat(newEmpForm.baseSalary) : undefined,
      jobRoleId: newEmpForm.jobRoleId ? parseInt(newEmpForm.jobRoleId) : undefined,
      companyId: newEmpForm.companyId ? parseInt(newEmpForm.companyId) : undefined,
      projectIds: newEmpForm.projectIds.map(id => parseInt(id)),
      email: newEmpForm.email || undefined,
      password: newEmpForm.password || undefined
    };

    if (editingEmployeeId) {
      const res = await updateEmployee(editingEmployeeId, data);
      setIsAdmitting(false);
      if (res.success) {
        alert("Colaborador Atualizado!");
        setIsNewEmpModalOpen(false);
        setEditingEmployeeId(null);
        window.location.reload();
      } else {
        alert("Erro: " + res.error);
      }
      return;
    }
`
);

// Remove the old data definition inside handleCreateEmployee to avoid duplication
content = content.replace(
  `    const data = {
      name: newEmpForm.name,
      cpf: newEmpForm.cpf,
      rg: newEmpForm.rg,
      matricula: newEmpForm.matricula,
      birthDate: newEmpForm.birthDate ? new Date(newEmpForm.birthDate + 'T12:00:00') : undefined,
      baseSalary: newEmpForm.baseSalary ? parseFloat(newEmpForm.baseSalary) : undefined,
      jobRoleId: newEmpForm.jobRoleId ? parseInt(newEmpForm.jobRoleId) : undefined,
      companyId: newEmpForm.companyId ? parseInt(newEmpForm.companyId) : undefined,
      projectIds: newEmpForm.projectIds.map(id => parseInt(id)),
      email: newEmpForm.email || undefined,
      password: newEmpForm.password || undefined
    };

    const res = await createEmployee(data);`,
  `    const res = await createEmployee(data);`
);

// Update Modal Titles and Buttons
content = content.replace(
  '<h2 className="text-lg font-bold">Admitir Colaborador</h2>',
  '<h2 className="text-lg font-bold">{editingEmployeeId ? "Editar Colaborador" : "Admitir Colaborador"}</h2>'
);

content = content.replace(
  '<button form="newEmpForm" type="submit" className="w-full py-3 bg-rose-600 text-white rounded-xl font-black text-sm uppercase shadow-lg shadow-rose-500/30 active:scale-95 transition-transform">Admitir Colaborador</button>',
  '<button form="newEmpForm" type="submit" className="w-full py-3 bg-rose-600 text-white rounded-xl font-black text-sm uppercase shadow-lg shadow-rose-500/30 active:scale-95 transition-transform">{editingEmployeeId ? "Salvar Alterações" : "Admitir Colaborador"}</button>'
);

// Reset form when opening Admission
content = content.replace(
  '<button \n                onClick={() => setIsNewEmpModalOpen(true)}',
  `<button 
                onClick={() => {
                  setEditingEmployeeId(null);
                  setNewEmpForm({
                    name: '', cpf: '', rg: '', matricula: '', birthDate: '',
                    jobRoleId: '', companyId: '', projectIds: [], baseSalary: '',
                    email: '', password: ''
                  });
                  setIsNewEmpModalOpen(true);
                }}`
);

// Add Edit Button in the Table
const editButton = `
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setEditingEmployeeId(emp.id);
                          setNewEmpForm({
                            name: emp.name || '',
                            cpf: emp.cpf || '',
                            rg: emp.rg || '',
                            matricula: emp.matricula || '',
                            birthDate: emp.birthDate ? new Date(emp.birthDate).toISOString().split('T')[0] : '',
                            jobRoleId: emp.jobRoleId?.toString() || '',
                            companyId: emp.companyId?.toString() || '',
                            projectIds: emp.projects?.map((p:any) => p.id.toString()) || [],
                            baseSalary: emp.baseSalary?.toString() || '',
                            email: emp.user?.email || '',
                            password: '' // Keep password empty unless changing
                          });
                          setIsNewEmpModalOpen(true);
                        }} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar">
                          <Edit size={18}/>
                        </button>
`;

content = content.replace(
  '{canDelete && (',
  editButton + '\n                        {canDelete && ('
);

// Fix "Obra Alocada" display
content = content.replace(
  `<td className="px-6 py-4">
                        <span className="text-[10px] font-black px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-100">{emp.projects?.length > 0 ? emp.projects.map((p:any) => p.name).join(', ') : 'Sede'}</span>
                      </td>`,
  `<td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.projects?.length > 0 ? (
                            emp.projects.map((p:any) => (
                              <span key={p.id} className="text-[9px] font-black px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 max-w-[120px] truncate" title={p.name}>
                                {p.name.includes('SEDE') ? 'SEDE' : p.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200">Sem Obra</span>
                          )}
                        </div>
                      </td>`
);

fs.writeFileSync(file, content, 'utf8');
console.log("editRH.js applied");
