const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<button 
                        onClick={() => handleRestoreRevision(rev.id)}
                        disabled={isLoadingRevisions}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                      >
                        RESTAURAR
                      </button>`;

const replacement = `<div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleRestoreRevision(rev.id)}
                          disabled={isLoadingRevisions}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                        >
                          RESTAURAR
                        </button>
                        <button 
                          onClick={() => handleDeleteRevision(rev.id)}
                          disabled={isLoadingRevisions}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir versão"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Added delete button');
