const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const injection = `
                  {(!selectedEstimate.project?.tasks?.length) && (
                    <div className="text-center py-10 text-slate-400">
                      <Layers size={32} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-bold">Nenhuma tarefa encontrada no cronograma deste projeto.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

      {/* Histórico de Versões Modal */}
      {isRevisionsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B1121] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="text-indigo-500" />
                  Histórico de Versões (Snapshots)
                </h3>
                <p className="text-sm text-slate-500 mt-1">Salve versões deste orçamento para poder restaurar depois.</p>
              </div>
              <button onClick={() => setIsRevisionsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex gap-4 mb-6">
                <input 
                  type="text" 
                  value={newRevisionName}
                  onChange={e => setNewRevisionName(e.target.value)}
                  placeholder="Nome da nova versão (ex: Original v1.0)"
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button 
                  onClick={handleCreateRevision}
                  disabled={isLoadingRevisions || !newRevisionName}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black text-xs uppercase transition-colors"
                >
                  SALVAR VERSÃO
                </button>
              </div>

              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Versões Salvas</h4>
              
              {isLoadingRevisions && revisions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
              ) : revisions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Nenhuma versão salva para este orçamento.</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {revisions.map((rev) => (
                    <div key={rev.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex justify-between items-center hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                      <div>
                        <h5 className="font-bold text-slate-800 dark:text-slate-200">{rev.name}</h5>
                        <p className="text-xs text-slate-500">{new Date(rev.createdAt).toLocaleString('pt-BR')}</p>
                      </div>
                      <button 
                        onClick={() => handleRestoreRevision(rev.id)}
                        disabled={isLoadingRevisions}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                      >
                        RESTAURAR
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Próprio Modal */}
      {isCustomItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B1121] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="text-blue-500" />
                  Novo Item Próprio
                </h3>
              </div>
              <button onClick={() => setIsCustomItemModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Descrição do Item</label>
                <input 
                  type="text" 
                  value={customItemData.description}
                  onChange={e => setCustomItemData({...customItemData, description: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none"
                  placeholder="Ex: Instalação de Ar Condicionado"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Unidade</label>
                  <input 
                    type="text" 
                    value={customItemData.unit}
                    onChange={e => setCustomItemData({...customItemData, unit: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none"
                    placeholder="Ex: un"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Quantidade</label>
                  <input 
                    type="number" 
                    value={customItemData.quantity}
                    onChange={e => setCustomItemData({...customItemData, quantity: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Preço Unit. (R$)</label>
                  <input 
                    type="number" 
                    value={customItemData.unitPrice}
                    onChange={e => setCustomItemData({...customItemData, unitPrice: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleAddCustomItem}
                  disabled={!customItemData.description}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black text-xs uppercase transition-colors"
                >
                  ADICIONAR ITEM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] font-sans">
      <header className="h-20 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-50 no-print">
        <div className="flex items-center gap-6">`;

const startRegex = /<h4 className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-500">\{task\.name\}<\/h4>\r?\n\s*<\/button>\r?\n\s*\)\)}/;
const startMatch = content.match(startRegex);

const endStr = '<Link href="/" className="p-2 hover:bg-slate-100';
const endIdx = content.indexOf(endStr);

if (startMatch && endIdx !== -1) {
    const textBefore = content.substring(0, startMatch.index + startMatch[0].length);
    const textAfter = content.substring(endIdx);
    fs.writeFileSync(file, textBefore + injection + '\n          ' + textAfter);
    console.log('Fixed');
} else {
    console.log('Not found');
    console.log('startMatch', !!startMatch);
    console.log('endIdx', endIdx);
}
