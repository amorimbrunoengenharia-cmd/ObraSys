"use client";
import React, { useState, useEffect } from 'react';
import { Save, Sun, Cloud, CloudRain, Users, Sparkles, Plus, ChevronLeft, ChevronRight, Search, Settings, Tractor, Hammer, Briefcase, Printer, BookOpen, Check, AlertTriangle, CheckCircle2, HardHat, Construction, Trash, Trash2, PlusCircle, Camera, X, Image, Download } from 'lucide-react';
import { Modal } from '../Shared';
import RDOForm from './RDOForm';
import { saveRDO, deleteRdo, getProjectAttendanceForDate } from '../../app/actions/rdo';
import { exportRDOsToObsidian } from '../../app/actions/obsidian';
import { 
    getJobRoles, saveJobRole, 
    getCompanies, saveCompany, 
    getEquipmentTypes, saveEquipmentType 
} from '../../app/actions/registrations';
import CreatableCombobox from '../Shared/CreatableCombobox';

let GLOBAL_BIBLIOTECA = {
    indireta: ["Engenheiro Civil", "Mestre de Obras", "Encarregado", "Téc. Segurança", "Almoxarife"],
    direta: ["Pedreiro", "Servente", "Carpinteiro", "Armador", "Eletricista", "Encanador", "Pintor"],
    equipamentos: ["Betoneira 400L", "Andaime Fachadeiro", "Serra Circular", "Furadeira", "Martelete"],
    veiculos: ["Caminhão Basculante", "Retroescavadeira", "Rolo Compactador", "Caminhão Munck"]
};

export default function RDO({ proj, feed, config }: any) { // Recebe config
  const [viewMode, setViewMode] = useState<'lista' | 'editor'>('lista');
  const [rdos, setRdos] = useState<any[]>(proj?.rdos || []);
  const [selectedRdo, setSelectedRdo] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCadastroOpen, setIsCadastroOpen] = useState(false);
  const [novoRecurso, setNovoRecurso] = useState({ nome: '', tipo: 'direta' });
  const [syncStatus, setSyncStatus] = useState<'idle'|'syncing'|'done'>('idle');
  
  // Registros de Base
  const [baseRoles, setBaseRoles] = useState<any[]>([]);
  const [baseCompanies, setBaseCompanies] = useState<any[]>([]);
  const [baseEquips, setBaseEquips] = useState<any[]>([]);

  useEffect(() => {
    loadBaseData();
  }, []);

  async function loadBaseData() {
    const [r, c, e] = await Promise.all([
        getJobRoles(),
        getCompanies(),
        getEquipmentTypes()
    ]);
    setBaseRoles(r);
    setBaseCompanies(c);
    setBaseEquips(e);
  }

  const QtdControl = ({ val, onInc, onDec }: any) => (
      <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#0B1121] rounded-lg border border-slate-200 dark:border-slate-700 px-1">
          <button onClick={onDec} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><ChevronLeft size={14}/></button>
          <span className="w-6 text-center font-bold text-sm">{val || 0}</span>
          <button onClick={onInc} className="p-1 text-slate-400 hover:text-green-500 transition-colors"><ChevronRight size={14}/></button>
      </div>
  );
  const ClimaIcon = ({c}:any) => {
    switch(c) {
        case 'sol': return <Sun size={20} className="text-amber-500"/>;
        case 'chuva': return <CloudRain size={20} className="text-blue-500"/>;
        case 'nublado': return <Cloud size={20} className="text-slate-400"/>;
        default: return <Sun size={20}/>;
    }
  };

  const handleCadastrarRecurso = () => {
      if (!novoRecurso.nome) return alert("Digite o nome.");
      // @ts-ignore
      GLOBAL_BIBLIOTECA[novoRecurso.tipo].push(novoRecurso.nome);
      alert(`✅ ${novoRecurso.nome} cadastrado!`);
      setNovoRecurso({ ...novoRecurso, nome: '' });
  };

  const handleNewRDO = () => {
    const newId = 9999 + Math.floor(Math.random() * 1000);
    const today = new Date().toISOString().split('T')[0];
    const novo = { 
        id: newId, 
        data: today, 
        status: "Rascunho", 
        fase: "Geral", 
        clima: { manha: "sol", tarde: "sol", noite: "nublado" },
        condicaoCanteiro: 'operavel',
        justificativa: '',
        workforce: [
            { id: Date.now() + 1, role: 'Engenheiro Civil', qty: 1, company: 'WayService' },
            { id: Date.now() + 2, role: 'Mestre de Obras', qty: 1, company: 'WayService' }
        ],
        equipment_list: [],
        activities: [
            { id: Date.now() + 3, taskId: '', progress: 0, observations: '' }
        ],
        obs: "", 
        photos: [] 
    };
    setSelectedRdo(novo); setPhotos([]); setViewMode('editor');
  };

  const handleOpenRDO = (rdo: any) => {
      // Migração de dados legados para o novo formato dinâmico
      const legacyWorkforce = [
          ...(rdo.mo_indireta || []).map((m: any) => ({ ...m, role: m.cargo, company: 'Própria' })),
          ...(rdo.mo_direta || []).map((m: any) => ({ ...m, role: m.cargo, company: 'Terceirizada' }))
      ].filter(m => m.qty > 0 || m.qtd > 0).map((m, i) => ({
          id: i,
          role: m.role || m.cargo,
          qty: m.qty || m.qtd || 0,
          company: m.company || 'Própria'
      }));

      const legacyEquip = [
          ...(rdo.equipamentos || []).map((e: any) => ({ ...e, status: 'operando' })),
          ...(rdo.veiculos || []).map((v: any) => ({ ...v, status: 'operando' }))
      ].filter(e => e.qty > 0 || e.qtd > 0).map((e, i) => ({
          id: i,
          name: e.name || e.nome,
          qty: e.qty || e.qtd || 0,
          status: e.status || 'operando'
      }));

      const dados = { 
          ...rdo, 
          clima: rdo.clima || { manha: "sol", tarde: "sol", noite: "nublado" }, 
          condicaoCanteiro: rdo.condicaoCanteiro || 'operavel',
          justificativa: rdo.justificativa || '',
          workforce: rdo.workforce?.length > 0 ? rdo.workforce : (legacyWorkforce.length > 0 ? legacyWorkforce : [{ id: 1, role: 'Encarregado', qty: 0, company: 'WayService' }]),
          equipment_list: rdo.equipment_list?.length > 0 ? rdo.equipment_list : legacyEquip,
          activities: rdo.activities || [],
          fase: rdo.fase || "Geral" 
      };
      setSelectedRdo(dados); setPhotos(rdo.fotos || []); setViewMode('editor');
  };

  const handleSave = async () => { 
    // Mapear de volta para campos legados para não quebrar o PDF/Banco atual se necessário
    const isNew = selectedRdo.id > 1000 || !rdos.find((r:any) => r.id === selectedRdo.id);
    const toSave = { 
        ...selectedRdo, 
        // Compatibilidade com saveRDO.ts que espera mo_indireta/mo_direta
        mo_indireta: (selectedRdo?.workforce || []).filter((w:any) => w.company === 'WayService' || w.company === 'Própria').map((w:any) => ({ cargo: w.role, qtd: w.qty })),
        mo_direta: (selectedRdo?.workforce || []).filter((w:any) => w.company !== 'WayService' && w.company !== 'Própria').map((w:any) => ({ cargo: w.role, qtd: w.qty })),
        equipamentos: (selectedRdo?.equipment_list || []).map((e:any) => ({ nome: e.name, qtd: e.qty })),
        veiculos: [], // Veículos agora estão unificados em equipment_list
        fotos: photos, 
        status: "Finalizado", 
        isNew 
    }; 
    
    // Optimistic UI
    const exists = rdos.find((r:any) => r.id === selectedRdo.id); 
    const newList = exists ? rdos.map((r:any) => r.id === selectedRdo.id ? toSave : r) : [toSave, ...rdos]; 
    newList.sort((a:any, b:any) => b.id - a.id); 
    setRdos(newList); 
    setViewMode('lista'); 

    // Server
    await saveRDO(toSave, proj.id);

    // Auto-sync to Obsidian
    setSyncStatus('syncing');
    try {
      await exportRDOsToObsidian(proj.id);
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch {
      setSyncStatus('idle');
    }
  };
  const updateQtd = (type: string, idx: number, delta: number) => { 
    if (!selectedRdo) return;
    const field = type === 'indireta' ? 'mo_indireta' : type === 'direta' ? 'mo_direta' : type === 'equip' ? 'equipamentos' : 'veiculos'; 
    const list = [...(selectedRdo[field] || [])]; 
    if(list[idx]) { 
        list[idx].qtd = Math.max(0, (list[idx].qtd||0) + delta); 
        setSelectedRdo({...selectedRdo, [field]: list}); 
    } 
  };
  const generateText = () => { 
    if (!selectedRdo) return;
    setIsGenerating(true); 
    setTimeout(() => { 
        const total = (selectedRdo?.mo_direta||[]).reduce((a:any,b:any)=>a+(b.qtd||0),0); 
        setSelectedRdo({ ...selectedRdo, obs: `RESUMO IA:\nEfetivo: ${total}. Clima: ${selectedRdo.clima?.manha}.` }); 
        setIsGenerating(false); 
    }, 1000); 
  };
  const handlePrint = () => window.print();
  const addPhoto = () => setPhotos([...photos, {id:Date.now(), desc:"Foto", timestamp:"10:00"}]);

  const handleDeleteRdo = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Evita abrir o editor ao clicar no excluir
    if (!confirm("Tem certeza que deseja excluir este RDO permanentemente?")) return;
    
    // Optimistic UI
    const newList = rdos.filter(r => r.id !== id);
    setRdos(newList);
    
    const res = await deleteRdo(id, proj.id);
    if (!res.success) {
        alert("Erro ao excluir RDO: " + res.error);
        // Reverter se der erro
        setRdos(proj.rdos || []);
    }
  };

  const handleImportRH = async () => {
      if (!selectedRdo?.data) {
          alert("Selecione a data do relatório primeiro.");
          return;
      }
      
      setIsGenerating(true);
      try {
          const dadosPonto = await getProjectAttendanceForDate(proj.id, selectedRdo.data);
          
          if (!dadosPonto || dadosPonto.length === 0) {
              alert("Nenhum registro de ponto encontrado para a data e projeto informados.");
              setIsGenerating(false);
              return;
          }
          
          // Agrupar por cargo
          const efetivoAgrupado: Record<string, number> = {};
          dadosPonto.forEach((p: any) => {
              if (p.employee && p.employee.cargo) {
                  const cargo = p.employee.cargo;
                  efetivoAgrupado[cargo] = (efetivoAgrupado[cargo] || 0) + 1;
              }
          });
          
          const novosRecursos = Object.keys(efetivoAgrupado).map((cargo, index) => ({
              id: Date.now() + index,
              role: cargo,
              qty: efetivoAgrupado[cargo],
              company: 'WayService'
          }));
          
          setSelectedRdo({
              ...selectedRdo,
              workforce: [...selectedRdo.workforce, ...novosRecursos]
          });
          
          alert("Efetivo importado com sucesso do RH!");
      } catch (err) {
          console.error(err);
          alert("Erro ao importar do RH.");
      } finally {
          setIsGenerating(false);
      }
  };

  if (viewMode === 'lista') {
      return (
          <div className="p-6 md:p-10 h-full overflow-y-auto bg-slate-50 dark:bg-[#0B1121] animate-in fade-in duration-500">
              {/* Obsidian sync banner */}
              {syncStatus !== 'idle' && (
                  <div className={`mb-6 flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold shadow-sm animate-in slide-in-from-top ${
                      syncStatus === 'done' ? 'bg-violet-50 text-violet-700 border border-violet-100' : 'bg-white text-slate-500 border border-slate-200'
                  }`}>
                      {syncStatus === 'syncing' ? <><BookOpen size={16} className="animate-pulse text-violet-500"/> Sincronizando com Obsidian...</> : <><Check size={16} className="text-violet-600"/> RDO exportado com sucesso!</>}
                  </div>
              )}
              
              {isCadastroOpen && (
                  <Modal title="Gerenciar Cadastros Rápidos" onClose={()=>setIsCadastroOpen(false)}>
                      <div className="space-y-5 p-2">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Categoria do Recurso</label>
                              <select 
                                  className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
                                  value={novoRecurso.tipo} 
                                  onChange={e=>setNovoRecurso({...novoRecurso, tipo: e.target.value})}
                              >
                                  <option value="direta">Mão de Obra Direta</option>
                                  <option value="indireta">Mão de Obra Indireta</option>
                                  <option value="equipamentos">Equipamentos</option>
                                  <option value="veiculos">Veículos</option>
                              </select>
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nome do Item</label>
                              <input 
                                  placeholder="Ex: Pedreiro, Betoneira..."
                                  className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
                                  value={novoRecurso.nome} 
                                  onChange={e=>setNovoRecurso({...novoRecurso, nome:e.target.value})}
                              />
                          </div>
                          <button 
                              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4" 
                              onClick={handleCadastrarRecurso}
                          >
                              <Save size={18}/> Salvar Cadastro
                          </button>
                      </div>
                  </Modal>
              )}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                  <div>
                      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Diário de Obras</h2>
                      <p className="text-slate-500 text-sm mt-1 font-medium">Gerencie os registros diários e o avanço físico do projeto.</p>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                      <button onClick={()=>setIsCadastroOpen(true)} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                          <Settings size={18}/> Cadastros
                      </button>
                      <button onClick={handleNewRDO} className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 active:scale-95">
                          <Plus size={22}/> Novo RDO
                      </button>
                  </div>
              </div>

              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                  <div className="relative">
                      <Search className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                      <input 
                        type="text" 
                        placeholder="Buscar por data (AAAA-MM-DD)..." 
                        className="w-full pl-12 p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#0B1121] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium" 
                        onChange={e=>setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>

              <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-[#111827] border-b border-slate-100 dark:border-slate-800">
                          <tr>
                              <th className="p-5 text-slate-500 font-bold uppercase tracking-wider text-[11px]">Data do Relatório</th>
                              <th className="p-5 text-slate-500 font-bold uppercase tracking-wider text-[11px]">Status</th>
                              <th className="p-5 text-right text-slate-500 font-bold uppercase tracking-wider text-[11px]">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {(rdos || []).filter((r:any)=>r?.data?.includes(searchTerm)).map((r:any)=>(
                              <tr key={r.id} onClick={()=>handleOpenRDO(r)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                                  <td className="p-5">
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 font-bold">
                                              {r.data.split('-')[2]}
                                          </div>
                                          <div>
                                              <p className="font-bold text-slate-800 dark:text-slate-200">{r.data}</p>
                                              <p className="text-[11px] text-slate-400 font-medium">Ref. #{r.id}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-5">
                                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${
                                          r.status === 'Finalizado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                      }`}>
                                          {r.status}
                                      </span>
                                  </td>
                                  <td className="p-5 text-right">
                                      <div className="flex items-center justify-end gap-4">
                                          <button 
                                              onClick={(e) => handleDeleteRdo(e, r.id)}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all border border-red-100"
                                              title="Excluir RDO permanentemente"
                                          >
                                              <Trash size={14}/>
                                              <span className="text-[10px] font-black uppercase">Excluir</span>
                                          </button>
                                          <button className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1 group">
                                              Visualizar <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {(!rdos || rdos.length === 0) && (
                      <div className="p-20 text-center text-slate-400">
                          <BookOpen size={48} className="mx-auto mb-4 opacity-10"/>
                          <p className="font-medium">Nenhum RDO encontrado.</p>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  if (!selectedRdo) return null;

  return (
      <div className="h-full flex flex-col animate-in slide-in-from-right relative">
          
          {/* PDF USANDO DADOS DA CONFIGURAÇÃO */}
          <div id="printable-area" className="hidden text-black text-xs font-sans">
                <div className="border-2 border-black mb-2 p-2 flex justify-between items-center">
                    <div className="w-24 h-16 border border-black flex items-center justify-center font-bold bg-gray-100 overflow-hidden">
                        {/* LOGO DINÂMICA */}
                        {config?.logo ? <img src={config.logo} alt="Logo" className="w-full h-full object-contain"/> : "LOGO"}
                    </div>
                    <div className="text-center flex-1 px-4">
                        <h1 className="text-lg font-bold uppercase">RELATÓRIO DIÁRIO DE OBRA</h1>
                        <p className="text-sm uppercase">{config?.obraNome || proj.nome}</p>
                    </div>
                    <div className="text-right text-[10px]">
                        <div className="border border-black p-1 px-2 mb-1">RDO Nº: <strong>{selectedRdo.id}</strong></div>
                        <div className="border border-black p-1 px-2">Data: <strong>{selectedRdo.data}</strong></div>
                    </div>
                </div>
                <div className="border-2 border-black mb-2 p-1 flex text-center"><div className="flex-1 border-r border-black">MANHÃ: <strong>{selectedRdo.clima.manha.toUpperCase()}</strong></div><div className="flex-1 border-r border-black">TARDE: <strong>{selectedRdo.clima.tarde.toUpperCase()}</strong></div><div className="flex-1">NOITE: <strong>{selectedRdo.clima.noite.toUpperCase()}</strong></div></div>
                <div className="flex gap-2 mb-2">
                    <div className="flex-1 border-2 border-black"><div className="bg-gray-200 border-b border-black p-1 font-bold text-center">MO INDIRETA</div>{(selectedRdo?.mo_indireta || []).filter((m:any)=>m.qtd>0).map((m:any,i:number)=>(<div key={i} className="flex justify-between p-1 border-b border-black last:border-0"><span>{m.cargo}</span><strong>{m.qtd}</strong></div>))}</div>
                    <div className="flex-1 border-2 border-black"><div className="bg-gray-200 border-b border-black p-1 font-bold text-center">MO DIRETA</div>{(selectedRdo?.mo_direta || []).filter((m:any)=>m.qtd>0).map((m:any,i:number)=>(<div key={i} className="flex justify-between p-1 border-b border-black last:border-0"><span>{m.cargo}</span><strong>{m.qtd}</strong></div>))}</div>
                </div>
                <div className="border-2 border-black mb-2"><div className="bg-gray-200 border-b border-black p-1 font-bold text-center">EQUIPAMENTOS / VEÍCULOS</div><div className="grid grid-cols-2">{(selectedRdo?.equipamentos || []).filter((e:any)=>e.qtd>0).map((e:any,i:number)=>(<div key={i} className="flex justify-between p-1 border-b border-r border-black even:border-r-0"><span>{e.nome}</span><strong>{e.qtd}</strong></div>))}{(selectedRdo?.veiculos || []).filter((e:any)=>e.qtd>0).map((e:any,i:number)=>(<div key={i} className="flex justify-between p-1 border-b border-r border-black even:border-r-0"><span>{e.nome}</span><strong>{e.qtd}</strong></div>))}</div></div>
                <div className="border-2 border-black mb-2 min-h-[100px]"><div className="bg-gray-200 border-b border-black p-1 font-bold text-center">OCORRÊNCIAS</div><div className="p-2 whitespace-pre-wrap">{selectedRdo.obs}</div></div>
                <div className="flex gap-4 mt-8 pt-8"><div className="flex-1 border-t border-black text-center">{config?.engResponsavel || "Engenheiro"} <br/> CREA: {config?.crea}</div><div className="flex-1 border-t border-black text-center">Fiscalização</div></div>
          </div>

          <div className="bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-800 p-4 md:px-8 flex justify-between items-center shadow-sm z-20 no-print sticky top-0">
              <div className="flex items-center gap-5">
                  <button onClick={()=>setViewMode('lista')} className="p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90">
                      <ChevronLeft size={24}/>
                  </button>
                  <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800 hidden md:block"></div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        RDO <span className="text-blue-600 font-black">#{selectedRdo.id}</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{proj.nome}</p>
                  </div>
              </div>
              <div className="flex gap-3">
                  <button onClick={handlePrint} className="p-3 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 rounded-xl transition-all active:scale-95">
                      <Printer size={20}/>
                  </button>
                  <button onClick={handleSave} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 flex gap-2 items-center transition-all active:scale-95 group">
                    {syncStatus === 'syncing' ? <BookOpen size={18} className="animate-pulse"/> : <Save size={18} className="group-hover:scale-110 transition-transform"/>} 
                    <span className="hidden md:inline">Salvar Relatório</span>
                  </button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-[#0B1121] no-print">
              <div className="max-w-3xl mx-auto space-y-6">
                  
                  {/* SEÇÃO 1: INFORMAÇÕES GERAIS */}
                  <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <BookOpen size={20} className="text-blue-600 dark:text-blue-400"/>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">📅 Informações do Relatório</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-500 ml-1">Data do Relatório</label>
                              <input 
                                type="date" 
                                value={selectedRdo.data} 
                                onChange={e => setSelectedRdo({...selectedRdo, data: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-lg font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-500 ml-1">Número do RDO</label>
                              <div className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-blue-600">
                                  #{selectedRdo.id}
                              </div>
                          </div>
                      </div>

                      {/* PAINEL CLIMÁTICO */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Sun size={16} className="text-amber-500" />
                            <label className="text-xs font-medium text-slate-500 block">⛅ Condições Climáticas</label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['manha','tarde','noite'].map(periodo => (
                                <div key={periodo} className="p-4 bg-slate-50 dark:bg-[#0B1121] rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{periodo}</span>
                                    <div className="flex justify-between gap-1">
                                        {['sol','nublado','chuva'].map(cond => (
                                            <button 
                                                key={cond} 
                                                onClick={() => setSelectedRdo({...selectedRdo, clima: {...selectedRdo.clima, [periodo]: cond}})}
                                                className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-all ${selectedRdo.clima[periodo] === cond ? 'bg-white dark:bg-slate-800 shadow-sm border border-blue-500 text-blue-600 scale-105' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
                                            >
                                                <ClimaIcon c={cond}/>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                      </div>

                      {/* CONDIÇÃO DO CANTEIRO */}
                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-xs font-medium text-slate-500 block">Condição do Canteiro</label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                {id: 'operavel', label: 'Operável', color: 'emerald'},
                                {id: 'parcial', label: 'Parcial', color: 'amber'},
                                {id: 'inoperavel', label: 'Inoperável', color: 'red'}
                            ].map(cond => (
                                <button 
                                    key={cond.id}
                                    onClick={() => setSelectedRdo({...selectedRdo, condicaoCanteiro: cond.id})}
                                    className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${selectedRdo.condicaoCanteiro === cond.id ? `bg-${cond.color}-50 dark:bg-${cond.color}-900/10 border-${cond.color}-500 text-${cond.color}-600` : 'border-slate-100 dark:border-slate-800 text-slate-400 opacity-60'}`}
                                >
                                    {cond.label}
                                </button>
                            ))}
                        </div>

                        {/* JUSTIFICATIVA CONDICIONAL */}
                        {(selectedRdo.condicaoCanteiro === 'parcial' || selectedRdo.condicaoCanteiro === 'inoperavel') && (
                            <div className="animate-in slide-in-from-top duration-300 space-y-2">
                                <label className="text-xs font-bold text-red-500 flex items-center gap-2">
                                    <AlertTriangle size={14}/> Justificativa da Paralisação
                                </label>
                                <textarea 
                                    required
                                    value={selectedRdo.justificativa}
                                    onChange={e => setSelectedRdo({...selectedRdo, justificativa: e.target.value})}
                                    placeholder="Descreva o motivo da inoperabilidade..."
                                    className="w-full h-24 p-3 bg-red-50 dark:bg-red-900/5 border border-red-200 dark:border-red-900/20 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                />
                            </div>
                        )}
                      </div>
                  </div>

                  {/* SEÇÃO 2: EQUIPE E EFETIVO */}
                  <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                <HardHat size={20} className="text-emerald-600 dark:text-emerald-400"/>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">👷 Efetivo do Dia</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleImportRH}
                                disabled={isGenerating}
                                className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-emerald-100 disabled:opacity-50"
                                title="Importar do ponto/catraca do RH"
                            >
                                <Download size={16}/> Importar RH
                            </button>
                            <button 
                                onClick={() => setSelectedRdo({...selectedRdo, workforce: [...selectedRdo.workforce, { id: Date.now(), role: '', qty: 0, company: '' }]})}
                                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                            >
                                <Plus size={16}/> Adicionar Função
                            </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                          {selectedRdo.workforce.map((w: any, idx: number) => (
                              <div key={w.id} className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 dark:bg-[#0B1121]/50 rounded-xl border border-slate-100 dark:border-slate-800 group animate-in fade-in slide-in-from-left duration-300">
                                  <div className="flex-1">
                                      <CreatableCombobox 
                                         label="Função / Cargo"
                                         placeholder="Selecione..."
                                         options={baseRoles}
                                         value={w.role}
                                         onChange={val => {
                                             const newList = [...selectedRdo.workforce];
                                             newList[idx].role = val;
                                             setSelectedRdo({...selectedRdo, workforce: newList});
                                         }}
                                         onCreate={async name => {
                                             await saveJobRole(name);
                                             loadBaseData();
                                         }}
                                      />
                                  </div>
                                  <div className="w-full md:w-24">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">Qtd</label>
                                      <input 
                                        type="number" 
                                        value={w.qty} 
                                        onChange={e => {
                                            const newList = [...selectedRdo.workforce];
                                            newList[idx].qty = Number(e.target.value);
                                            setSelectedRdo({...selectedRdo, workforce: newList});
                                        }}
                                        className="w-full p-2 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-blue-500/20"
                                      />
                                  </div>
                                  <div className="flex-1">
                                      <CreatableCombobox 
                                         label="Empresa / Fornecedor"
                                         placeholder="Selecione..."
                                         options={baseCompanies}
                                         value={w.company}
                                         onChange={val => {
                                             const newList = [...selectedRdo.workforce];
                                             newList[idx].company = val;
                                             setSelectedRdo({...selectedRdo, workforce: newList});
                                         }}
                                         onCreate={async name => {
                                             await saveCompany(name);
                                             loadBaseData();
                                         }}
                                      />
                                  </div>
                                  <div className="flex items-center justify-end">
                                      <button 
                                        onClick={() => setSelectedRdo({...selectedRdo, workforce: selectedRdo.workforce.filter((_:any, i:number) => i !== idx)})}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                      >
                                          <Trash2 size={18}/>
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="flex justify-end pt-2">
                          <div className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-xl flex items-center gap-3">
                              <Users size={16} className="text-emerald-400"/>
                              <span className="text-[10px] font-bold uppercase tracking-wider">Total de Efetivo:</span>
                              <span className="text-lg font-black text-emerald-400">{(selectedRdo?.workforce || []).reduce((acc: number, curr: any) => acc + (Number(curr.qty) || 0), 0)}</span>
                          </div>
                      </div>
                  </div>

                  {/* SEÇÃO 3: MÁQUINAS E EQUIPAMENTOS */}
                  <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <Construction size={20} className="text-amber-600 dark:text-amber-400"/>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">🚜 Equipamentos</h3>
                        </div>
                        <button 
                            onClick={() => setSelectedRdo({...selectedRdo, equipment_list: [...selectedRdo.equipment_list, { id: Date.now(), name: '', qty: 0, status: 'operando' }]})}
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                            <Plus size={16}/> Adicionar Equipamento
                        </button>
                      </div>

                      <div className="space-y-3">
                          {selectedRdo.equipment_list.map((e: any, idx: number) => (
                              <div key={e.id} className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 dark:bg-[#0B1121]/50 rounded-xl border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-right duration-300">
                                  <div className="flex-1">
                                      <CreatableCombobox 
                                         label="Nome do Equipamento"
                                         placeholder="Selecione..."
                                         options={baseEquips}
                                         value={e.name}
                                         onChange={val => {
                                             const newList = [...selectedRdo.equipment_list];
                                             newList[idx].name = val;
                                             setSelectedRdo({...selectedRdo, equipment_list: newList});
                                         }}
                                         onCreate={async name => {
                                             await saveEquipmentType(name);
                                             loadBaseData();
                                         }}
                                      />
                                  </div>
                                  <div className="w-full md:w-24">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">Qtd</label>
                                      <input 
                                        type="number" 
                                        value={e.qty} 
                                        onChange={val => {
                                            const newList = [...selectedRdo.equipment_list];
                                            newList[idx].qty = Number(val.target.value);
                                            setSelectedRdo({...selectedRdo, equipment_list: newList});
                                        }}
                                        className="w-full p-2 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-blue-500/20"
                                      />
                                  </div>
                                  <div className="flex-1">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">Status</label>
                                      <div className="flex gap-1 p-1 bg-white dark:bg-[#162032] rounded-lg border border-slate-200 dark:border-slate-800">
                                          {[
                                              { id: 'operando', color: 'emerald', label: 'OP' },
                                              { id: 'parado', color: 'amber', label: 'ST' },
                                              { id: 'quebrado', color: 'red', label: 'QK' }
                                          ].map(st => (
                                              <button 
                                                key={st.id}
                                                onClick={() => {
                                                    const newList = [...selectedRdo.equipment_list];
                                                    newList[idx].status = st.id;
                                                    setSelectedRdo({...selectedRdo, equipment_list: newList});
                                                }}
                                                className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${e.status === st.id ? `bg-${st.color}-500 text-white shadow-sm` : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                title={st.id}
                                              >
                                                  {st.label}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="flex items-center justify-end">
                                      <button 
                                        onClick={() => setSelectedRdo({...selectedRdo, equipment_list: selectedRdo.equipment_list.filter((_:any, i:number) => i !== idx)})}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                      >
                                          <Trash2 size={18}/>
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* SEÇÃO 4: ATIVIDADES EXECUTADAS (CRONOGRAMA) */}
                  <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <Briefcase size={20} className="text-blue-600 dark:text-blue-400"/>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">📋 Atividades Executadas</h3>
                        </div>
                        <button 
                            onClick={() => setSelectedRdo({...selectedRdo, activities: [...(selectedRdo.activities || []), { id: Date.now(), taskId: '', progress: 0, observations: '', photos: [] }]})}
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                            <Plus size={16}/> Adicionar Atividade
                        </button>
                      </div>

                      <div className="space-y-8">
                          {(selectedRdo.activities || []).map((act: any, idx: number) => {
                              const selectedTask = (proj.tasks || []).find((t: any) => String(t.id) === String(act.taskId));
                              
                              const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                  const files = e.target.files;
                                  if (!files) return;
                                  
                                  Array.from(files).forEach(async file => {
                                      const formData = new FormData();
                                      formData.append('file', file);
                                      
                                      try {
                                          const res = await fetch('/api/upload', {
                                              method: 'POST',
                                              body: formData
                                          });
                                          const data = await res.json();
                                          
                                          if (data.url) {
                                              const newList = [...selectedRdo.activities];
                                              if (!newList[idx].photos) newList[idx].photos = [];
                                              newList[idx].photos.push({
                                                  id: Date.now() + Math.random(),
                                                  url: data.url,
                                                  caption: ''
                                              });
                                              setSelectedRdo({...selectedRdo, activities: newList});
                                          }
                                      } catch (err) {
                                          console.error("Erro no upload:", err);
                                          alert("Falha ao subir imagem.");
                                      }
                                  });
                              };

                              return (
                                <div key={act.id} className="p-6 bg-slate-50 dark:bg-[#0B1121]/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-6 relative animate-in fade-in slide-in-from-bottom duration-300 group">
                                    <button 
                                        onClick={() => setSelectedRdo({...selectedRdo, activities: selectedRdo.activities.filter((_:any, i:number) => i !== idx)})}
                                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                    >
                                        <Trash2 size={18}/>
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                        <div className="md:col-span-8 space-y-2">
                                            <label className="text-xs font-medium text-slate-500 ml-1">Tarefa do Cronograma (WBS)</label>
                                            <select 
                                                value={act.taskId}
                                                onChange={e => {
                                                    const newList = [...selectedRdo.activities];
                                                    newList[idx].taskId = e.target.value;
                                                    const task = (proj.tasks || []).find((t:any) => String(t.id) === e.target.value);
                                                    if(task) newList[idx].progress = task.progress || 0;
                                                    setSelectedRdo({...selectedRdo, activities: newList});
                                                }}
                                                className="w-full p-3 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            >
                                                <option value="">Selecione uma tarefa...</option>
                                                {(proj.tasks || []).map((t: any) => (
                                                    <option key={t.id} value={t.id}>{t.wbs ? `${t.wbs} - ` : ''}{t.name || t.title}</option>
                                                ))}
                                            </select>
                                            {selectedTask && (
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 ml-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                    Progresso atual: <span className="font-bold text-blue-500">{selectedTask.progress}%</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="md:col-span-4 space-y-2">
                                            <label className="text-xs font-medium text-slate-500 ml-1">Avanço do Dia (%)</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="100"
                                                    value={act.progress}
                                                    onChange={e => {
                                                        const newList = [...selectedRdo.activities];
                                                        newList[idx].progress = Math.min(100, Math.max(0, Number(e.target.value)));
                                                        setSelectedRdo({...selectedRdo, activities: newList});
                                                    }}
                                                    className="w-full p-3 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none text-right font-bold pr-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                />
                                                <span className="absolute right-4 top-3 text-slate-400 font-bold">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500 ml-1">Observações / Detalhamento</label>
                                        <textarea 
                                            value={act.observations}
                                            onChange={e => {
                                                const newList = [...selectedRdo.activities];
                                                newList[idx].observations = e.target.value;
                                                setSelectedRdo({...selectedRdo, activities: newList});
                                            }}
                                            placeholder="Descreva o que foi realizado..."
                                            className="w-full h-24 p-3 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>

                                    {/* MÓDULO FOTOGRÁFICO INTEGRADO */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                                <Camera size={16} className="text-slate-400"/>
                                                Evidências Fotográficas
                                            </label>
                                            <label className="cursor-pointer flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-blue-100">
                                                <Plus size={14}/>
                                                ADICIONAR FOTO
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={handleFileChange}
                                                />
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {(act.photos || []).map((photo: any, pIdx: number) => (
                                                <div key={photo.id} className="group relative space-y-2 animate-in zoom-in duration-300">
                                                    <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white shadow-sm">
                                                        <img src={photo.url} className="w-full h-full object-cover" />
                                                        <button 
                                                            onClick={() => {
                                                                const newList = [...selectedRdo.activities];
                                                                newList[idx].photos = newList[idx].photos.filter((_:any, i:number) => i !== pIdx);
                                                                setSelectedRdo({...selectedRdo, activities: newList});
                                                            }}
                                                            className="absolute top-1.5 right-1.5 p-1.5 bg-red-500/90 backdrop-blur-sm text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                        >
                                                            <X size={12}/>
                                                        </button>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={photo.caption}
                                                        onChange={e => {
                                                            const newList = [...selectedRdo.activities];
                                                            newList[idx].photos[pIdx].caption = e.target.value;
                                                            setSelectedRdo({...selectedRdo, activities: newList});
                                                        }}
                                                        placeholder="Legenda..."
                                                        className="w-full p-2 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            ))}
                                            {(!act.photos || act.photos.length === 0) && (
                                                <div className="col-span-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50 bg-white dark:bg-transparent">
                                                    <Image size={32} className="opacity-20"/>
                                                    <span className="text-xs font-medium italic">Nenhuma foto anexada</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* FINALIZAÇÃO */}
                  <div className="pt-8 pb-12 flex flex-col items-center gap-6">
                      <button 
                        onClick={handleSave}
                        className="w-full px-12 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] group"
                      >
                          <CheckCircle2 className="group-hover:scale-110 transition-transform" size={24}/>
                          Salvar Relatório Diário de Obra
                      </button>
                      <div className="flex items-center gap-2 text-slate-400">
                          <Sparkles size={14} className="text-amber-500 animate-pulse" />
                          <p className="text-[11px] font-medium uppercase tracking-widest text-center">
                              Os avanços serão sincronizados automaticamente com o Cronograma Master.
                          </p>
                      </div>
                  </div>

              </div>
          </div>
      </div>
  );
}
