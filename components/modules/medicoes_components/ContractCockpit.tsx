"use client";
import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Sparkles, FileText, PieChart as PieIcon, Download, Save, Calculator, ScrollText, Package, Unlock, Upload, CheckCircle2, FileSearch, Wand2, CloudUpload, Eye, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { Modal } from '../../Shared';

export default function ContractCockpit({ contract, onBack, onUpdate, onNewBM }: any) {
  const [tab, setTab] = useState('docs'); // Inicia na aba Docs para facilitar seu teste
  const [isItemModal, setIsItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ desc: '', unit: 'un', qtd: 0, unitario: 0 });
  
  // Estados da IA e Upload
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Dados locais para manipulação imediata
  const [localContract, setLocalContract] = useState(contract);

  // --- LÓGICA DE ITENS (MANUAL) ---
  const handleAddItem = () => {
      const total = newItem.qtd * newItem.unitario;
      const updatedItems = [...(localContract.itens || []), { ...newItem, id: Date.now(), total, medido: 0 }];
      const updated = { ...localContract, valorTotal: localContract.valorTotal + total, saldo: localContract.saldo + total, itens: updatedItems };
      setLocalContract(updated);
      onUpdate(updated);
      setIsItemModal(false);
  };

  const handleDeleteItem = (id: number) => {
      const item = localContract.itens.find((i:any)=>i.id===id);
      const updated = { ...localContract, valorTotal: localContract.valorTotal - item.total, saldo: localContract.saldo - item.total, itens: localContract.itens.filter((i:any)=>i.id!==id) };
      setLocalContract(updated);
      onUpdate(updated);
  };

  // --- LÓGICA DA IA (AUTOMÁTICA) ---
  const handleFileUpload = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setIsUploading(true);
      setTimeout(() => {
          setIsUploading(false);
          setIsAnalyzing(true);
          analyzeContract(file.name);
      }, 1500);
  };

  const analyzeContract = (fileName: string) => {
      setTimeout(() => {
          // Simulação do retorno da IA
          const itensDetectados = [
              { id: Date.now(), desc: "Serviço de Pintura (Extraído)", unit: "m²", qtd: 2500, unitario: 28, total: 70000, medido: 0 },
              { id: Date.now()+1, desc: "Preparação de Superfície (Extraído)", unit: "m²", qtd: 2500, unitario: 12, total: 30000, medido: 0 }
          ];
          setAiResult({
              fileName: fileName,
              resumo: "Contrato de prestação de serviços padrão. Cláusula de retenção de 5% identificada. Vigência de 12 meses.",
              risco: "Baixo",
              itens: itensDetectados,
              totalValue: 100000
          });
          setIsAnalyzing(false);
      }, 2000);
  };

  const confirmImport = () => {
      if (!aiResult) return;
      const updatedItems = [...(localContract.itens || []), ...aiResult.itens];
      const newTotal = localContract.valorTotal + aiResult.totalValue;
      const newSaldo = localContract.saldo + aiResult.totalValue;
      
      // Adiciona doc
      const newDoc = { id: Date.now(), nome: aiResult.fileName, date: new Date().toLocaleDateString(), type: "Contrato", status: "Processado" };
      const newDocs = [...(localContract.docs || []), newDoc];

      const updatedContract = { ...localContract, itens: updatedItems, valorTotal: newTotal, saldo: newSaldo, docs: newDocs };

      setLocalContract(updatedContract);
      onUpdate(updatedContract);
      setAiResult(null);
      setTab('itens'); // Redireciona para a aba de itens para ver o resultado
      alert("✅ Itens importados com sucesso!");
  };

  return (
    <div className="p-6 h-full overflow-y-auto animate-in slide-in-from-right bg-slate-50 dark:bg-[#0B1121]">
        
        {/* MODAL ADD MANUAL */}
        {isItemModal && (
            <Modal title="Adicionar Item Manual" onClose={()=>setIsItemModal(false)}>
                <div className="space-y-4">
                    <input placeholder="Descrição" className="w-full p-2 border rounded dark:bg-[#0B1121]" onChange={e=>setNewItem({...newItem, desc:e.target.value})}/>
                    <div className="grid grid-cols-3 gap-2">
                        <input placeholder="Unid" className="w-full p-2 border rounded dark:bg-[#0B1121]" onChange={e=>setNewItem({...newItem, unit:e.target.value})}/>
                        <input type="number" placeholder="Qtd" className="w-full p-2 border rounded dark:bg-[#0B1121]" onChange={e=>setNewItem({...newItem, qtd:Number(e.target.value)})}/>
                        <input type="number" placeholder="Unitário" className="w-full p-2 border rounded dark:bg-[#0B1121]" onChange={e=>setNewItem({...newItem, unitario:Number(e.target.value)})}/>
                    </div>
                    <button onClick={handleAddItem} className="w-full py-2 bg-emerald-600 text-white rounded font-bold">Salvar Item</button>
                </div>
            </Modal>
        )}

        <button onClick={onBack} className="mb-4 text-slate-500 font-bold text-sm flex gap-2 hover:text-slate-800"><ArrowLeft size={16}/> Voltar para Lista</button>
        
        <div className="flex justify-between items-start mb-6">
            <div><h2 className="text-3xl font-bold text-slate-800 dark:text-white">{localContract.empresa}</h2><p className="text-slate-500">{localContract.servico}</p></div>
            <div className="flex gap-2">
                <button className="px-4 py-2 border border-yellow-500 text-yellow-600 rounded-lg font-bold text-sm flex gap-2 hover:bg-yellow-50"><ScrollText size={16}/> Aditivo</button>
                <button onClick={onNewBM} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg flex gap-2 hover:bg-emerald-500"><Calculator size={16}/> Nova Medição</button>
            </div>
        </div>

        {/* MENU ABAS */}
        <div className="flex gap-6 border-b border-slate-200 dark:border-slate-700 mb-6 text-sm font-bold text-slate-500">
            <button onClick={() => setTab('dashboard')} className={`pb-3 transition-colors ${tab==='dashboard'?'border-b-2 border-emerald-500 text-emerald-500':'hover:text-slate-700'}`}>Dashboard</button>
            <button onClick={() => setTab('itens')} className={`pb-3 transition-colors ${tab==='itens'?'border-b-2 border-emerald-500 text-emerald-500':'hover:text-slate-700'}`}>Itens & Escopo</button>
            <button onClick={() => setTab('materiais')} className={`pb-3 transition-colors ${tab==='materiais'?'border-b-2 border-emerald-500 text-emerald-500':'hover:text-slate-700'}`}>Materiais</button>
            <button onClick={() => setTab('financeiro')} className={`pb-3 transition-colors ${tab==='financeiro'?'border-b-2 border-emerald-500 text-emerald-500':'hover:text-slate-700'}`}>Retenção</button>
            <button onClick={() => setTab('docs')} className={`pb-3 transition-colors ${tab==='docs'?'border-b-2 border-emerald-500 text-emerald-500':'hover:text-slate-700'}`}>Documentos & IA</button>
        </div>

        {/* 1. DASHBOARD */}
        {tab === 'dashboard' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold mb-4 text-slate-500 text-xs uppercase">Balanço</h3>
                    <div className="h-48 flex justify-center"><ResponsiveContainer><PieChart><Pie data={[{name:'Medido',value:localContract.medido},{name:'Saldo',value:localContract.saldo}]} dataKey="value" innerRadius={50} outerRadius={70}><Cell fill="#3b82f6"/><Cell fill="#e2e8f0"/></Pie><Tooltip/></PieChart></ResponsiveContainer></div>
                    <div className="text-center mt-[-20px]"><span className="text-2xl font-bold text-blue-600">{Math.round((localContract.medido/localContract.valorTotal)*100)}%</span><p className="text-xs text-slate-400">Executado</p></div>
                </div>
                 <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold mb-4 text-slate-500 text-xs uppercase">Valores</h3>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between border-b pb-2"><span>Valor Total</span><span className="font-bold">R$ {localContract.valorTotal.toLocaleString()}</span></div>
                        <div className="flex justify-between border-b pb-2"><span>Total Medido</span><span className="font-bold text-blue-600">R$ {localContract.medido.toLocaleString()}</span></div>
                        <div className="flex justify-between border-b pb-2"><span>Saldo Restante</span><span className="font-bold text-emerald-600">R$ {localContract.saldo.toLocaleString()}</span></div>
                        <div className="flex justify-between pt-2 text-amber-600"><span>Retenção ({localContract.retencao}%)</span><span className="font-bold">R$ {localContract.saldo_retido?.toLocaleString()}</span></div>
                    </div>
                </div>
             </div>
        )}

        {/* 2. ITENS */}
        {tab === 'itens' && (
            <div className="bg-white dark:bg-[#162032] rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-in fade-in">
                <div className="flex justify-between mb-4"><h3 className="font-bold text-sm">Itens Contratados</h3><button onClick={()=>setIsItemModal(true)} className="text-blue-500 text-xs font-bold flex gap-1 items-center">+ Adicionar Manualmente</button></div>
                <table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-[#111827] uppercase"><tr><th className="p-2">Item</th><th className="p-2">Qtd</th><th className="p-2">Total</th><th className="p-2">Avanço Finc.</th><th className="p-2 text-right">Ação</th></tr></thead>
                <tbody>{localContract.itens?.map((it:any)=>(
                    <tr key={it.id} className="border-b">
                        <td className="p-2">
                            <span className="font-bold block">{it.desc}</span>
                            {it.taskId && <span className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">🔗 Vinculado ao Cronograma</span>}
                        </td>
                        <td className="p-2">{it.qtd} {it.unit}</td>
                        <td className="p-2">R$ {it.total.toLocaleString()}</td>
                        <td className="p-2">
                            <div className="flex flex-col gap-1 w-32">
                                <div className="flex justify-between text-[9px] font-black uppercase">
                                    <span className="text-blue-600">R$ {it.medido.toLocaleString()}</span>
                                    <span className="text-slate-400">{Math.round((it.medido / it.total) * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full transition-all duration-500" style={{width: `${Math.min(100, (it.medido / it.total) * 100)}%`}}></div>
                                </div>
                            </div>
                        </td>
                        <td className="p-2 text-right"><button onClick={()=>handleDeleteItem(it.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                    </tr>
                ))}</tbody></table>
                {localContract.itens?.length === 0 && <div className="p-10 text-center text-slate-400 border-2 border-dashed rounded-xl mt-4">Planilha vazia. Use a aba <b>Documentos & IA</b> para importar.</div>}
            </div>
        )}

        {/* 3. DOCUMENTOS & IA */}
        {tab === 'docs' && (
            <div className="space-y-6 animate-in fade-in">
                <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${isUploading || isAnalyzing ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50 dark:border-slate-700'}`}>
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileUpload} disabled={isUploading || isAnalyzing || aiResult}/>
                    {isUploading ? <div className="text-indigo-600"><Upload className="animate-bounce mx-auto mb-2"/><p>Enviando...</p></div> : 
                     isAnalyzing ? <div className="text-purple-600"><Sparkles className="animate-spin mx-auto mb-2"/><p>Analisando PDF...</p></div> : 
                     aiResult ? (
                        <div className="text-left max-w-2xl mx-auto bg-white dark:bg-[#0B1121] p-6 rounded-xl shadow-lg border border-emerald-200 relative z-20">
                            <div className="flex items-center gap-2 text-emerald-600 mb-4"><CheckCircle2/><h3 className="font-bold text-lg">Sucesso!</h3></div>
                            <p className="text-sm mb-4"><strong>Resumo:</strong> {aiResult.resumo}</p>
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border mb-4"><p className="text-xs font-bold text-slate-500 uppercase mb-2">Itens Detectados:</p><ul className="space-y-1">{aiResult.itens.map((it:any, i:number) => (<li key={i} className="text-sm flex justify-between"><span>{it.desc}</span> <span className="font-mono font-bold">R$ {it.total.toLocaleString()}</span></li>))}</ul></div>
                            <div className="flex gap-2"><button onClick={() => setAiResult(null)} className="flex-1 py-2 border rounded">Cancelar</button><button onClick={confirmImport} className="flex-1 py-2 bg-emerald-600 text-white rounded font-bold flex items-center justify-center gap-2"><Wand2 size={16}/> Importar Itens</button></div>
                        </div>
                     ) : (
                        <div><FileSearch size={48} className="mx-auto text-indigo-400 mb-4"/><h3 className="text-lg font-bold">Upload Inteligente</h3><p className="text-sm text-slate-500">Arraste o contrato PDF aqui.</p><button className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm">Selecionar Arquivo</button></div>
                     )}
                </div>
                <div className="bg-white dark:bg-[#162032] rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="p-4 border-b dark:border-slate-800 font-bold text-sm uppercase text-slate-500">Arquivos</div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {localContract.docs && localContract.docs.length > 0 ? localContract.docs.map((d:any)=>(<div key={d.id} className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><FileText size={18}/><div><p className="font-bold text-sm">{d.nome}</p><p className="text-xs text-slate-400">{d.date}</p></div></div><div className="flex gap-2"><Eye size={18} className="text-slate-400"/><Download size={18} className="text-slate-400"/></div></div>)) : <p className="p-8 text-center text-slate-400 text-sm">Vazio.</p>}
                    </div>
                </div>
            </div>
        )}

        {/* OUTRAS ABAS (Mantidas) */}
        {tab === 'materiais' && <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border"><h3 className="font-bold text-sm uppercase text-slate-500 mb-4">Materiais Fornecidos</h3>{localContract.materiais_vinculados?.map((mat:any, i:number)=>(<div key={i} className="p-3 border rounded mb-2 flex justify-between"><span>{mat.nome}</span><span className={mat.status==='ok'?'text-green-500':'text-red-500'}>{mat.status.toUpperCase()}</span></div>))}</div>}
        {tab === 'financeiro' && <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl border border-amber-200"><h3 className="font-bold text-amber-800 mb-2">Retenção Técnica</h3><h2 className="text-3xl font-bold text-amber-900">R$ {localContract.saldo_retido.toLocaleString()}</h2><button className="mt-4 px-4 py-2 bg-amber-200 dark:bg-amber-800 text-amber-900 rounded font-bold text-sm flex items-center gap-2"><Unlock size={14}/> Liberar</button></div>}
    </div>
  );
}
