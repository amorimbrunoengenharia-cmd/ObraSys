const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const chatUI = `      {/* IA Center Floating Button */}
      {view === 'editor' && (
        <button 
          onClick={() => setIsAiCenterOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-95 transition-all z-40 group"
        >
          <Sparkles size={24} className="group-hover:animate-pulse" />
        </button>
      )}

      {/* IA Center Chat Modal */}
      {isAiCenterOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 z-50">
          <div className="bg-white dark:bg-[#0B1121] w-full sm:w-[450px] h-[80vh] sm:rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 transform transition-all">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 sm:rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">IA Center</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Assistente de Custos</p>
                </div>
              </div>
              <button onClick={() => setIsAiCenterOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiChatHistory.map((msg, idx) => (
                <div key={idx} className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
                  <div className={\`max-w-[85%] rounded-2xl p-3 text-sm \${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-sm'}\`}>
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    
                    {/* Render Item Cards if AI returned any */}
                    {msg.items && msg.items.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.items.map((item, i) => (
                          <div key={i} className="bg-white dark:bg-slate-700 p-2 rounded-xl border border-slate-200 dark:border-slate-600">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">{item.database} {item.code}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase">{item.unit}</span>
                            </div>
                            <p className="text-[10px] font-bold line-clamp-2 leading-tight mb-2 text-slate-800 dark:text-slate-200">{item.description}</p>
                            <button 
                              onClick={() => { setIsRefModalOpen(true); setSearchQuery(item.code); setIsAiCenterOpen(false); }}
                              className="w-full py-1.5 bg-slate-100 dark:bg-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase transition-colors"
                            >
                              Adicionar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1121] sm:rounded-b-3xl">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 pr-2">
                <input 
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAICenter()}
                  placeholder="Pergunte sobre um serviço..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 text-slate-800 dark:text-white placeholder:text-slate-400"
                />
                <button 
                  onClick={handleAskAICenter}
                  disabled={!aiPrompt.trim() || isAiLoading}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all active:scale-95"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
  );
}`;

content = content.replace(/      <\/div>\r?\n  \);\r?\n\}/, chatUI);

fs.writeFileSync(file, content);
console.log('Appended UI at the end!');
