const fs = require('fs');

const file = 'components/modules/RH.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
if (!content.includes('import { PieChart')) {
  content = content.replace(
    "import React, { useState } from 'react';",
    "import React, { useState } from 'react';\nimport { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';"
  );
}

if (!content.includes('createCandidate')) {
  content = content.replace(
    "deleteEmployee",
    "deleteEmployee, createCandidate, updateCandidateStatus"
  );
}

// 2. RHClient props
content = content.replace(
  "export default function RHClient({ initialEmployees, stats, projects, jobRoles, companies, userRole, turnoverGoal }: any) {",
  "export default function RHClient({ initialEmployees, stats, projects, jobRoles, companies, userRole, turnoverGoal, candidates: initialCandidates }: any) {"
);

// 3. States
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'dashboard' | 'efetivo' | 'ponto'>('dashboard');",
  "const [activeTab, setActiveTab] = useState<'dashboard' | 'efetivo' | 'ponto' | 'recrutamento'>('dashboard');\n  const [candidates, setCandidates] = useState<any[]>(initialCandidates || []);"
);

// 4. Header buttons
content = content.replace(
  "<button onClick={() => setActiveTab('ponto')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'ponto' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Ponto & Faltas</button>",
  "<button onClick={() => setActiveTab('ponto')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'ponto' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Ponto & Faltas</button>\n            <button onClick={() => setActiveTab('recrutamento')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'recrutamento' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Recrutamento</button>"
);

// 5. Export buttons in Ponto
const exportButtons = `
              <div className="flex gap-2">
                <button onClick={() => {
                  const header = "Data,Colaborador,Obra,Status,Horas,HE,Obs\\n";
                  const csv = allAttendances.map((a:any) => \`\${new Date(a.date).toLocaleDateString('pt-BR')},\${a.empName},\${a.empProject},\${a.status},\${a.hoursWorked},\${a.overtimeHours},\${a.observations||''}\`).join('\\n');
                  const blob = new Blob([header + csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = 'folha_pagamento.csv';
                  link.click();
                }} className="text-xs font-bold px-3 py-1 bg-emerald-600 text-white rounded-lg flex items-center gap-1 hover:bg-emerald-700 transition-colors">
                  <FileText size={14}/> CSV (Contabilidade)
                </button>
                <button onClick={() => window.print()} className="text-xs font-bold px-3 py-1 bg-slate-600 text-white rounded-lg flex items-center gap-1 hover:bg-slate-700 transition-colors">
                  <Upload size={14}/> Imprimir (PDF)
                </button>
              </div>
`;

content = content.replace(
  '<span className="text-xs font-bold text-slate-400">{allAttendances.length} registro(s)</span>',
  '<span className="text-xs font-bold text-slate-400 mr-4">{allAttendances.length} registro(s)</span>\n' + exportButtons
);

// 6. Recrutamento Tab Content
const recrutamentoTab = `
        {activeTab === 'recrutamento' && (
          <div className="space-y-6 fade-in h-full flex flex-col">
            <div className="flex justify-between items-center bg-white dark:bg-[#162032] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h2 className="font-bold text-lg">Quadro de Recrutamento</h2>
              <button onClick={() => {
                const name = prompt("Nome do Candidato:");
                const position = prompt("Vaga (Ex: Engenheiro):");
                if (name && position) {
                  createCandidate({ name, position }).then(res => {
                     if(res.success) window.location.reload();
                  });
                }
              }} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/30 transition-all">
                <Plus size={16}/> Novo Candidato
              </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
               {['Triagem', 'Entrevista', 'Proposta', 'Contratado'].map(col => (
                 <div key={col} className="w-80 flex-shrink-0 bg-slate-100 dark:bg-[#1A2333] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3 min-h-[400px]">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-600 dark:text-slate-400 uppercase text-xs tracking-widest">{col}</h3>
                      <span className="text-[10px] font-black bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">{candidates.filter(c => c.status === col).length}</span>
                    </div>
                    {candidates.filter(c => c.status === col).map(c => (
                      <div key={c.id} className="bg-white dark:bg-[#0B1121] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group">
                         <div className="flex justify-between items-start mb-2">
                           <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{c.name}</p>
                           <button onClick={async () => {
                              const newStatus = prompt("Mover para (Triagem, Entrevista, Proposta, Contratado, Reprovado):", c.status);
                              if (newStatus && newStatus !== c.status) {
                                const res = await updateCandidateStatus(c.id, newStatus);
                                if(res.success) window.location.reload();
                              }
                           }} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical size={16}/></button>
                         </div>
                         <p className="text-xs text-slate-500 font-medium mb-3">{c.position}</p>
                         {col === 'Contratado' && (
                           <button onClick={() => {
                             setNewEmpForm(prev => ({...prev, name: c.name}));
                             setIsNewEmpModalOpen(true);
                           }} className="w-full py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg hover:bg-emerald-200 transition-colors">
                             Admitir
                           </button>
                         )}
                      </div>
                    ))}
                 </div>
               ))}
            </div>
          </div>
        )}
`;

content = content.replace(
  "</main>",
  recrutamentoTab + "\n      </main>"
);

// 7. Dashboard Recharts
const colors = ['#f43f5e', '#f97316', '#3b82f6', '#10b981', '#8b5cf6'];
const rechartsMarkup = `
            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm h-80 flex flex-col">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Distribuição por Cargo</h3>
                 <div className="flex-1">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={Object.entries(employees.reduce((acc, emp) => {
                           const role = emp.jobRole?.name || 'Sem Cargo';
                           acc[role] = (acc[role] || 0) + 1;
                           return acc;
                         }, {} as any)).map(([name, value]) => ({name, value}))}
                         cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                       >
                         {Object.entries(employees.reduce((acc, emp) => {
                           const role = emp.jobRole?.name || 'Sem Cargo';
                           acc[role] = (acc[role] || 0) + 1;
                           return acc;
                         }, {} as any)).map((entry, index) => (
                           <Cell key={\`cell-\${index}\`} fill={['#f43f5e', '#f97316', '#3b82f6', '#10b981', '#8b5cf6'][index % 5]} />
                         ))}
                       </Pie>
                       <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm h-80 flex flex-col">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Aniversariantes do Mês</h3>
                 <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                   {employees.length > 0 ? employees.slice(0, 3).map(emp => (
                     <div key={emp.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-white font-bold">{emp.name.charAt(0)}</div>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{emp.name}</p>
                          <p className="text-[10px] font-black text-rose-500 uppercase">Parabéns!</p>
                        </div>
                     </div>
                   )) : (
                     <p className="text-slate-500 text-sm">Nenhum aniversariante neste mês.</p>
                   )}
                 </div>
              </div>
            </div>
`;

content = content.replace(
  "</div>\n        )}",
  "</div>\n" + rechartsMarkup + "\n        )}"
);

// 8. Desempenho tab in Dossier
content = content.replace(
  "const [tab, setTab] = useState<'cadastro'|'sst'|'epi'|'ponto'|'ocorrencias'>('cadastro');",
  "const [tab, setTab] = useState<'cadastro'|'sst'|'epi'|'ponto'|'ocorrencias'|'desempenho'>('cadastro');"
);

content = content.replace(
  "<button onClick={() => setTab('ocorrencias')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === 'ocorrencias' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Ocorrências</button>",
  "<button onClick={() => setTab('ocorrencias')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === 'ocorrencias' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Ocorrências</button>\n          <button onClick={() => setTab('desempenho')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === 'desempenho' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Desempenho</button>"
);

const desempenhoContent = `
        {tab === 'desempenho' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center">
               <h3 className="font-bold text-lg flex items-center gap-2"><TrendingUp className="text-rose-500"/> Avaliações & Feedback</h3>
               <button onClick={() => {
                 const desc = prompt("Descreva o Feedback / Reunião 1:1:");
                 if (desc) {
                   setSaving(true);
                   addEmployeeOccurrence({
                     employeeId: emp.id,
                     type: 'Feedback',
                     date: new Date(),
                     description: desc
                   }).then(() => {
                     setSaving(false);
                     window.location.reload();
                   });
                 }
               }} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-black uppercase rounded-lg hover:bg-rose-100 transition-colors">
                 <Plus size={14}/> Novo Feedback
               </button>
             </div>
             
             <div className="bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <div className="space-y-4">
                  {(emp.occurrences || []).filter((o:any) => o.type === 'Feedback' || o.type === 'Avaliação').length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">Nenhum feedback registrado ainda. Inicie a cultura de 1:1s!</p>
                  ) : (
                    (emp.occurrences || []).filter((o:any) => o.type === 'Feedback' || o.type === 'Avaliação').map((fb:any) => (
                      <div key={fb.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl relative">
                        <div className="absolute top-4 right-4 text-[10px] font-black text-slate-400">{new Date(fb.date).toLocaleDateString('pt-BR')}</div>
                        <p className="text-xs font-bold text-rose-600 uppercase mb-2">{fb.type}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{fb.description}</p>
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>
        )}
`;

content = content.replace(
  "</div>\n      </div>\n    </div>\n  );\n}",
  desempenhoContent + "\n        </div>\n      </div>\n    </div>\n  );\n}"
);

fs.writeFileSync(file, content, 'utf8');
console.log("RH.tsx updated successfully!");
