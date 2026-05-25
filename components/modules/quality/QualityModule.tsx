"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, CheckCircle, AlertTriangle, FileText, Users, Plus, Calendar, User, Info, Check, X, Clock, Map, GraduationCap, MapPin, Search } from 'lucide-react';
import { getQualityData, createFVS, createDDS, updateFVSStatus, createEpiRecord, createNrRecord, getRiskDocuments, createRiskPin, deleteRiskPin } from '../../../app/actions/quality';
import { Modal } from '../../../components/Shared';
import RNCList from './RNCList';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function QualityModule({ proj }: any) {
  const [activeTab, setActiveTab] = useState<'fvs' | 'dds' | 'rnc' | 'epi' | 'nrs' | 'mapa'>('fvs');
  const [fvss, setFvss] = useState<any[]>([]);
  const [ddss, setDdss] = useState<any[]>([]);
  const [rncs, setRncs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [isFvsModalOpen, setIsFvsModalOpen] = useState(false);
  const [isDdsModalOpen, setIsDdsModalOpen] = useState(false);
  const [isEpiModalOpen, setIsEpiModalOpen] = useState(false);
  const [isNrModalOpen, setIsNrModalOpen] = useState(false);
  const [selectedFvs, setSelectedFvs] = useState<any>(null);

  // Real Data States
  const [epis, setEpis] = useState<any[]>([]);
  const [nrs, setNrs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Risk Map States
  const [riskDocuments, setRiskDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinForm, setPinForm] = useState({ x: 0, y: 0, title: '', desc: '', type: 'risco_fisico' });

  // Form FVS
  const [fvsForm, setFvsForm] = useState({
    title: '',
    inspector: '',
    observations: '',
    items: [
        { description: 'Conformidade com Projeto Executivo', isConform: null },
        { description: 'Limpeza e Preparação da Área', isConform: null },
        { description: 'Qualidade dos Materiais Utilizados', isConform: null },
        { description: 'Verificação de Cotas e Níveis', isConform: null }
    ]
  });

  // Form DDS
  const [ddsForm, setDdsForm] = useState({
    topic: '',
    supervisor: '',
    participantsCount: 0
  });

  // Form EPI
  const [epiForm, setEpiForm] = useState({
    employeeId: '',
    equipmentName: '',
    caNumber: ''
  });

  // Form NR
  const [nrForm, setNrForm] = useState({
    employeeId: '',
    type: 'NR-35',
    issueDate: '',
    expirationDate: ''
  });
  const [nrFile, setNrFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const res = await getQualityData(proj.id);
    if (res.success) {
        setFvss(res.fvss || []);
        setDdss(res.ddss || []);
        setRncs(res.rncs || []);
        setEpis(res.epis || []);
        setNrs(res.nrs || []);
        setEmployees(res.employees || []);
    }
    const docsRes = await getRiskDocuments(proj.id);
    if (docsRes.success && docsRes.documents) {
        setRiskDocuments(docsRes.documents);
        if (docsRes.documents.length > 0 && !selectedDocId) {
            setSelectedDocId(docsRes.documents[0].id);
        }
    }
    setIsLoading(false);
  }, [proj.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateFVS = async () => {
    if (!fvsForm.title || !fvsForm.inspector) return alert("Preencha o título e o inspetor");
    const res = await createFVS(proj.id, fvsForm);
    if (res.success) {
        setIsFvsModalOpen(false);
        setFvsForm({ title: '', inspector: '', observations: '', items: fvsForm.items.map(i => ({...i, isConform: null})) });
        loadData();
    }
  };

  const handleCreateDDS = async () => {
    if (!ddsForm.topic || !ddsForm.supervisor) return alert("Preencha o tema e o supervisor");
    const res = await createDDS(proj.id, ddsForm);
    if (res.success) {
        setIsDdsModalOpen(false);
        setDdsForm({ topic: '', supervisor: '', participantsCount: 0 });
        loadData();
    }
  };

  const handleCreateEpi = async () => {
    if (!epiForm.employeeId || !epiForm.equipmentName) return alert("Preencha colaborador e nome do EPI.");
    const res = await createEpiRecord(proj.id, epiForm);
    if (res.success) {
        setIsEpiModalOpen(false);
        setEpiForm({ employeeId: '', equipmentName: '', caNumber: '' });
        alert("EPI Registrado! Solicitação de assinatura enviada.");
        loadData();
    } else {
        alert("Erro: " + res.error);
    }
  };

  const handleCreateNr = async () => {
    if (!nrForm.employeeId || !nrForm.issueDate || !nrForm.expirationDate || !nrFile) return alert("Preencha todos os campos do treinamento e anexe o certificado.");
    
    setIsUploading(true);
    let uploadedUrl = '';
    
    try {
        const formData = new FormData();
        formData.append("file", nrFile);
        const uploadRes = await fetch('/api/upload/ged', {
            method: 'POST',
            body: formData
        });
        const uploadData = await uploadRes.json();
        if(uploadData.url) {
            uploadedUrl = uploadData.url;
        } else {
            setIsUploading(false);
            return alert("Erro ao fazer upload do documento.");
        }
    } catch (e) {
        setIsUploading(false);
        return alert("Erro de rede ao fazer upload.");
    }

    const res = await createNrRecord(proj.id, {
        employeeId: nrForm.employeeId,
        type: nrForm.type,
        issueDate: new Date(nrForm.issueDate),
        expirationDate: new Date(nrForm.expirationDate),
        fileUrl: uploadedUrl
    });
    
    setIsUploading(false);

    if (res.success) {
        setIsNrModalOpen(false);
        setNrForm({ employeeId: '', type: 'NR-35', issueDate: '', expirationDate: '' });
        setNrFile(null);
        loadData();
    } else {
        alert("Erro: " + res.error);
    }
  };

  const handleImageClick = (e: any) => {
      if(!selectedDocId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPinForm({ ...pinForm, x, y });
      setIsPinModalOpen(true);
  };

  const handleSavePin = async () => {
      if(!pinForm.title) return alert("Preencha a descrição do risco.");
      const res = await createRiskPin(proj.id, {
          documentId: selectedDocId!,
          x: pinForm.x,
          y: pinForm.y,
          title: pinForm.title,
          desc: pinForm.desc,
          type: pinForm.type,
          authorId: 1 // Default ou pegar do useAuth
      });
      if(res.success) {
          setIsPinModalOpen(false);
          setPinForm({ x: 0, y: 0, title: '', desc: '', type: 'risco_fisico' });
          loadData();
      } else {
          alert("Erro ao salvar risco: " + res.error);
      }
  };

  const handleDeletePin = async (pinId: number) => {
      if(confirm("Tem certeza que deseja remover este risco?")) {
          await deleteRiskPin(proj.id, pinId);
          loadData();
      }
  };

  const handleToggleConformity = (idx: number, val: boolean) => {
    const items = [...fvsForm.items];
    items[idx].isConform = val as any;
    setFvsForm({ ...fvsForm, items });
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in bg-slate-50 dark:bg-[#0B1121] overflow-hidden">
        {/* HEADER DO MÓDULO */}
        <div className="p-6 pb-0 flex justify-between items-end mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="text-blue-500"/> Qualidade e Segurança
                </h2>
                <p className="text-sm text-slate-500 mt-1">Gestão de FVS, DDS e Não Conformidades</p>
            </div>
            
            <div className="flex bg-white dark:bg-[#162032] p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <button 
                    onClick={() => setActiveTab('fvs')} 
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${activeTab==='fvs'?'bg-blue-500 text-white shadow-md shadow-blue-500/20':'text-slate-400 hover:text-slate-600'}`}
                >
                    <CheckCircle size={14}/> FVS
                </button>
                <button 
                    onClick={() => setActiveTab('dds')} 
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${activeTab==='dds'?'bg-emerald-500 text-white shadow-md shadow-emerald-500/20':'text-slate-400 hover:text-slate-600'}`}
                >
                    <Users size={14}/> DDS
                </button>
                <button 
                    onClick={() => setActiveTab('rnc')} 
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${activeTab==='rnc'?'bg-amber-500 text-white shadow-md shadow-amber-500/20':'text-slate-400 hover:text-slate-600'}`}
                >
                    <AlertTriangle size={14}/> RNC
                </button>
                <button 
                    onClick={() => setActiveTab('epi')} 
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${activeTab==='epi'?'bg-indigo-500 text-white shadow-md shadow-indigo-500/20':'text-slate-400 hover:text-slate-600'}`}
                >
                    <ShieldCheck size={14}/> EPIs
                </button>
                <button 
                    onClick={() => setActiveTab('nrs')} 
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${activeTab==='nrs'?'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20':'text-slate-400 hover:text-slate-600'}`}
                >
                    <GraduationCap size={14}/> NRs / ASOs
                </button>
                <button 
                    onClick={() => setActiveTab('mapa')} 
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${activeTab==='mapa'?'bg-violet-500 text-white shadow-md shadow-violet-500/20':'text-slate-400 hover:text-slate-600'}`}
                >
                    <Map size={14}/> Mapa de Riscos
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">
            {activeTab === 'fvs' && (
                <>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspeções Recentes</span>
                        <button onClick={() => setIsFvsModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
                            <Plus size={14}/> Nova FVS
                        </button>
                    </div>

                    {fvss.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50">
                            <CheckCircle size={32} className="text-slate-300 mb-2"/>
                            <p className="text-sm text-slate-500">Nenhuma inspeção realizada.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {fvss.map((fvs: any) => (
                                <div key={fvs.id} className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-xl ${fvs.status==='Aprovado'?'bg-emerald-50 text-emerald-600':fvs.status==='Reprovado'?'bg-red-50 text-red-600':'bg-amber-50 text-amber-600'}`}>
                                            <CheckCircle size={20}/>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${fvs.status==='Aprovado'?'bg-emerald-100 text-emerald-700':fvs.status==='Reprovado'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>
                                            {fvs.status}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-white mb-1 truncate">{fvs.title}</h4>
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                            <Calendar size={12}/> {new Date(fvs.date).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                            <User size={12}/> Inspetor: {fvs.inspector}
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400">{fvs.items.length} itens verificados</span>
                                        <button 
                                            onClick={() => setSelectedFvs(fvs)}
                                            className="text-[10px] font-bold text-blue-500 hover:underline"
                                        >
                                            Ver Detalhes
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'dds' && (
                <>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de DDS</span>
                        <button onClick={() => setIsDdsModalOpen(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                            <Plus size={14}/> Registrar DDS
                        </button>
                    </div>

                    {ddss.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50">
                            <Users size={32} className="text-slate-300 mb-2"/>
                            <p className="text-sm text-slate-500">Nenhum registro de DDS.</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Tema Discutido</th>
                                        <th className="px-6 py-4">Responsável</th>
                                        <th className="px-6 py-4">Participantes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {ddss.map((dds: any) => (
                                        <tr key={dds.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-xs font-medium">{new Date(dds.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{dds.topic}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{dds.supervisor}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full font-bold text-[10px]">
                                                    {dds.participantsCount} pessoas
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'rnc' && (
                <RNCList proj={proj} rncs={rncs} onRefresh={loadData} />
            )}

            {activeTab === 'epi' && (
                <>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de Entrega de EPIs</span>
                        <button onClick={() => setIsEpiModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all">
                            <Plus size={14}/> Nova Entrega
                        </button>
                    </div>

                    <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Colaborador</th>
                                    <th className="px-6 py-4">EPI</th>
                                    <th className="px-6 py-4">Nº CA</th>
                                    <th className="px-6 py-4">Data Entrega</th>
                                    <th className="px-6 py-4">Assinatura Digital</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {epis.map((epi: any) => (
                                    <tr key={epi.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-700 dark:text-slate-200">{epi.employee}</p>
                                            <p className="text-[10px] text-slate-400">{epi.role}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{epi.epi}</td>
                                        <td className="px-6 py-4 text-xs text-slate-500">{epi.ca}</td>
                                        <td className="px-6 py-4 text-xs font-medium">{new Date(epi.deliveryDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            {epi.signature ? (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full w-max">
                                                    <Check size={12}/> ASSINADO
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full w-max">
                                                    <Clock size={12}/> PENDENTE
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'nrs' && (
                <>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matriz de Treinamentos (NRs) e ASO</span>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1">
                                <Search size={14} className="text-slate-400"/>
                                <input placeholder="Buscar colaborador..." className="bg-transparent border-none outline-none text-xs w-48" />
                            </div>
                            <button onClick={() => setIsNrModalOpen(true)} className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-fuchsia-500/20 transition-all">
                                <Plus size={14}/> Lançar Certificado
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Colaborador</th>
                                    <th className="px-6 py-4">Treinamento / Exame</th>
                                    <th className="px-6 py-4">Realização</th>
                                    <th className="px-6 py-4">Validade</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Certificado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {nrs.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-700 dark:text-slate-200">{item.employee}</p>
                                            <p className="text-[10px] text-slate-400">{item.role}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{item.nr}</td>
                                        <td className="px-6 py-4 text-xs font-medium">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-xs font-medium">{new Date(item.validUntil).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            {item.status === 'Válido' && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">{item.status}</span>}
                                            {item.status.includes('Vence') && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">{item.status}</span>}
                                            {item.status === 'Vencido' && <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">{item.status}</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.fileUrl ? (
                                                <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-violet-600 hover:text-violet-500 font-bold flex items-center gap-1 text-xs">
                                                    <FileText size={14}/> Ver Arquivo
                                                </a>
                                            ) : (
                                                <span className="text-slate-400 text-xs">Sem anexo</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'mapa' && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-full max-w-4xl bg-white dark:bg-[#162032] border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                        
                        {/* Seletor de Planta */}
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projeto Base (GED)</span>
                            <select 
                                value={selectedDocId || ''}
                                onChange={e => setSelectedDocId(Number(e.target.value))}
                                className="p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm w-64"
                            >
                                <option value="">Selecione uma planta...</option>
                                {riskDocuments.map(doc => (
                                    <option key={doc.id} value={doc.id}>{doc.nome} ({doc.version})</option>
                                ))}
                            </select>
                        </div>

                        <div className="absolute top-20 right-6 flex flex-col gap-2 z-10">
                            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs space-y-2 shadow-lg">
                                <p className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[10px] tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">Legenda de Riscos</p>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div> <span className="text-slate-600 dark:text-slate-400">Risco Físico</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div> <span className="text-slate-600 dark:text-slate-400">Risco Ergonômico</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div> <span className="text-slate-600 dark:text-slate-400">Risco Elétrico</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-fuchsia-500 shadow-sm shadow-fuchsia-500/50"></div> <span className="text-slate-600 dark:text-slate-400">Equipamentos</span></div>
                            </div>
                        </div>

                        {/* PLANTA INTERATIVA */}
                        <div className="w-full h-[500px] bg-slate-100 dark:bg-slate-900 rounded-2xl relative border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center">
                            {selectedDocId ? (
                                (() => {
                                    const currentDoc = riskDocuments.find(d => d.id === selectedDocId);
                                    if(!currentDoc) return <p className="text-slate-400">Planta não encontrada.</p>;
                                    const isPdf = currentDoc.url.toLowerCase().endsWith('.pdf');
                                    return (
                                        <div 
                                            className="relative inline-block max-w-full max-h-full cursor-crosshair opacity-90 hover:opacity-100 transition-opacity" 
                                            onClick={handleImageClick}
                                        >
                                            {isPdf ? (
                                                (!currentDoc.size || currentDoc.size > 1024) ? (
                                                    <Document 
                                                        file={currentDoc.url}
                                                        loading={<div className="flex items-center justify-center h-[480px] text-slate-400 text-sm font-bold">Carregando PDF da Planta...</div>}
                                                        error={<div className="flex flex-col items-center justify-center h-[480px] text-red-500 p-6 text-center"><AlertTriangle size={32} className="mb-2"/><p className="font-bold">Erro ao carregar o PDF</p><p className="text-xs text-red-400 mt-1">O arquivo pode estar corrompido, não ser um PDF válido, ou ser apenas um arquivo de teste com extensão renomeada.</p></div>}
                                                        noData={<div className="flex items-center justify-center h-[480px] text-slate-400">PDF não encontrado</div>}
                                                    >
                                                        <Page 
                                                            pageNumber={1} 
                                                            renderTextLayer={false} 
                                                            renderAnnotationLayer={false} 
                                                            height={480}
                                                            className="shadow-xl"
                                                        />
                                                    </Document>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-[480px] text-red-500 p-6 text-center bg-red-50 dark:bg-red-900/10 rounded-xl">
                                                        <AlertTriangle size={32} className="mb-2"/>
                                                        <p className="font-bold">Este não é um PDF válido</p>
                                                        <p className="text-xs text-red-400 mt-1">
                                                            Identificamos que este arquivo tem apenas {currentDoc.size} bytes. 
                                                            Isso geralmente acontece quando um arquivo de texto vazio de teste 
                                                            é renomeado para .pdf. Por favor, suba um arquivo PDF de projeto real no GED.
                                                        </p>
                                                    </div>
                                                )
                                            ) : (
                                                <img 
                                                    src={currentDoc.url} 
                                                    alt="Planta do Projeto" 
                                                    className="max-w-full max-h-[480px] object-contain pointer-events-none"
                                                />
                                            )}
                                            
                                            {/* PINS RENDERIZADOS */}
                                            {currentDoc.pins?.map((pin: any) => {
                                                let bgColor = 'bg-slate-500';
                                                if(pin.type === 'risco_fisico') bgColor = 'bg-red-500 shadow-red-500/30';
                                                if(pin.type === 'risco_ergonomico') bgColor = 'bg-amber-500 shadow-amber-500/30';
                                                if(pin.type === 'risco_eletrico') bgColor = 'bg-blue-500 shadow-blue-500/30';
                                                if(pin.type === 'equipamento') bgColor = 'bg-fuchsia-500 shadow-fuchsia-500/30';

                                                return (
                                                    <div 
                                                        key={pin.id}
                                                        className="absolute group/pin cursor-pointer"
                                                        style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -50%)' }}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 shadow-lg flex items-center justify-center animate-bounce ${bgColor}`}></div>
                                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-2 rounded shadow-xl opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                                            {pin.title}
                                                            <br/>
                                                            <span className="text-[8px] font-normal text-slate-400">{pin.desc}</span>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeletePin(pin.id); }}
                                                            className="absolute -top-1 -right-4 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-auto"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    );
                                })()
                            ) : (
                                <p className="text-slate-400 font-bold text-lg uppercase tracking-[0.2em] opacity-30">Selecione uma planta do GED</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* MODAL NOVA FVS */}
        {isFvsModalOpen && (
            <Modal title="Nova Inspeção de Qualidade (FVS)" onClose={() => setIsFvsModalOpen(false)}>
                <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Serviço / Atividade</label>
                            <input 
                                value={fvsForm.title}
                                onChange={e => setFvsForm({...fvsForm, title: e.target.value})}
                                placeholder="Ex: Concretagem Laje 1"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Inspetor Responsável</label>
                            <input 
                                value={fvsForm.inspector}
                                onChange={e => setFvsForm({...fvsForm, inspector: e.target.value})}
                                placeholder="Nome do Engenheiro/Técnico"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* FVS Templates Loader */}
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setFvsForm({...fvsForm, title: 'Inspeção de Andaimes', items: [
                                { description: 'Base nivelada e apoiada', isConform: null },
                                { description: 'Guarda-corpo e rodapé instalados', isConform: null },
                                { description: 'Travamento e estaiamento adequados', isConform: null },
                                { description: 'Piso completo, sem falhas', isConform: null }
                            ]})}
                            className="text-[10px] px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            + Template: Andaimes
                        </button>
                        <button 
                            onClick={() => setFvsForm({...fvsForm, title: 'Inspeção de Extintores', items: [
                                { description: 'Acesso desobstruído', isConform: null },
                                { description: 'Sinalização visível', isConform: null },
                                { description: 'Manômetro na faixa verde', isConform: null },
                                { description: 'Lacre intacto', isConform: null }
                            ]})}
                            className="text-[10px] px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            + Template: Extintores
                        </button>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checklist de Verificação</label>
                        <div className="space-y-2">
                            {fvsForm.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.description}</span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleToggleConformity(idx, true)}
                                            className={`p-2 rounded-lg transition-all ${item.isConform===true?'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20':'bg-white dark:bg-slate-700 text-slate-300 hover:text-emerald-500'}`}
                                        >
                                            <Check size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => handleToggleConformity(idx, false)}
                                            className={`p-2 rounded-lg transition-all ${item.isConform===false?'bg-red-500 text-white shadow-lg shadow-red-500/20':'bg-white dark:bg-slate-700 text-slate-300 hover:text-red-500'}`}
                                        >
                                            <X size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Observações Gerais</label>
                        <textarea 
                            value={fvsForm.observations}
                            onChange={e => setFvsForm({...fvsForm, observations: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm h-24"
                        />
                    </div>

                    <button 
                        onClick={handleCreateFVS}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <ShieldCheck size={18}/> Salvar Inspeção
                    </button>
                </div>
            </Modal>
        )}

        {/* VISUALIZADOR DE FVS */}
        {selectedFvs && (
            <Modal title={`Detalhes da FVS: ${selectedFvs.title}`} onClose={() => setSelectedFvs(null)}>
                <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl grid grid-cols-2 gap-4 border border-slate-100 dark:border-slate-800">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Inspetor</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedFvs.inspector}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Data da Inspeção</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{new Date(selectedFvs.date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado do Checklist</label>
                        <div className="space-y-2">
                            {selectedFvs.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-50 dark:border-slate-800">
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{item.description}</span>
                                    {item.isConform === true ? (
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                                            <Check size={12}/> CONFORME
                                        </div>
                                    ) : item.isConform === false ? (
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">
                                            <X size={12}/> NÃO CONFORME
                                        </div>
                                    ) : (
                                        <div className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg uppercase">
                                            Não Avaliado
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedFvs.observations && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Observações do Inspetor</label>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
                                {selectedFvs.observations}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setSelectedFvs(null)}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-all"
                        >
                            Fechar
                        </button>
                        <button className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                            <FileText size={16}/> Gerar PDF (Em breve)
                        </button>
                    </div>
                </div>
            </Modal>
        )}

        {/* MODAL REGISTRAR DDS */}
        {isDdsModalOpen && (
            <Modal title="Registrar Diálogo Diário de Segurança (DDS)" onClose={() => setIsDdsModalOpen(false)}>
                <div className="space-y-5 p-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Tema do DDS</label>
                        <input 
                            value={ddsForm.topic}
                            onChange={e => setDdsForm({...ddsForm, topic: e.target.value})}
                            placeholder="Ex: Uso de EPIs em Altura"
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Supervisor / Palestrante</label>
                            <input 
                                value={ddsForm.supervisor}
                                onChange={e => setDdsForm({...ddsForm, supervisor: e.target.value})}
                                placeholder="Nome do TST ou Mestre"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Nº Participantes</label>
                            <input 
                                type="number"
                                value={ddsForm.participantsCount}
                                onChange={e => setDdsForm({...ddsForm, participantsCount: Number(e.target.value)})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleCreateDDS}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Users size={18}/> Salvar Registro
                    </button>
                </div>
            </Modal>
        )}

        {/* MODAL NOVA FICHA EPI */}
        {isEpiModalOpen && (
            <Modal title="Registrar Entrega de EPI" onClose={() => setIsEpiModalOpen(false)}>
                <div className="space-y-5 p-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Colaborador</label>
                        <select 
                            value={epiForm.employeeId}
                            onChange={e => setEpiForm({...epiForm, employeeId: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                        >
                            <option value="">Selecione um colaborador...</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobRole?.name || 'Sem cargo'})</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Equipamento (EPI)</label>
                            <input 
                                value={epiForm.equipmentName}
                                onChange={e => setEpiForm({...epiForm, equipmentName: e.target.value})}
                                placeholder="Ex: Botina de Segurança" 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Nº CA (Certificado)</label>
                            <input 
                                value={epiForm.caNumber}
                                onChange={e => setEpiForm({...epiForm, caNumber: e.target.value})}
                                placeholder="Ex: 31469" 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm" 
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleCreateEpi}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <ShieldCheck size={18}/> Registrar e Solicitar Assinatura
                    </button>
                </div>
            </Modal>
        )}

        {/* MODAL LANÇAR NR / CERTIFICADO */}
        {isNrModalOpen && (
            <Modal title="Lançar Certificado / ASO" onClose={() => setIsNrModalOpen(false)}>
                <div className="space-y-5 p-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Colaborador</label>
                        <select 
                            value={nrForm.employeeId}
                            onChange={e => setNrForm({...nrForm, employeeId: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                        >
                            <option value="">Selecione um colaborador...</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Tipo de Treinamento/Exame</label>
                        <select 
                            value={nrForm.type}
                            onChange={e => setNrForm({...nrForm, type: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                        >
                            <option value="NR-35">NR-35 (Trabalho em Altura)</option>
                            <option value="NR-18">NR-18 (Condições da Obra)</option>
                            <option value="NR-10">NR-10 (Elétrica)</option>
                            <option value="ASO">ASO (Atestado de Saúde)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Data Realização</label>
                            <input 
                                type="date"
                                value={nrForm.issueDate}
                                onChange={e => setNrForm({...nrForm, issueDate: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Data Validade</label>
                            <input 
                                type="date"
                                value={nrForm.expirationDate}
                                onChange={e => setNrForm({...nrForm, expirationDate: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm" 
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Anexar Certificado (PDF, JPG, PNG)</label>
                        <input 
                            type="file"
                            accept=".pdf, .png, .jpg, .jpeg"
                            onChange={e => setNrFile(e.target.files?.[0] || null)}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm" 
                        />
                    </div>
                    <button 
                        onClick={handleCreateNr}
                        disabled={isUploading}
                        className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl shadow-xl shadow-fuchsia-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <GraduationCap size={18}/> {isUploading ? 'Salvando...' : 'Salvar Certificado'}
                    </button>
                </div>
            </Modal>
        )}

        {/* MODAL ADICIONAR PIN (RISCO) */}
        {isPinModalOpen && (
            <Modal title="Adicionar Risco na Planta" onClose={() => setIsPinModalOpen(false)}>
                <div className="space-y-4 p-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Categoria do Risco</label>
                        <select 
                            value={pinForm.type}
                            onChange={e => setPinForm({...pinForm, type: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                        >
                            <option value="risco_fisico">Risco Físico / Queda / Máquinas (Vermelho)</option>
                            <option value="risco_ergonomico">Risco Ergonômico (Amarelo)</option>
                            <option value="risco_eletrico">Risco Elétrico (Azul)</option>
                            <option value="equipamento">Equipamento de Proteção / Extintor (Rosa)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Identificação / Título</label>
                        <input 
                            value={pinForm.title}
                            onChange={e => setPinForm({...pinForm, title: e.target.value})}
                            placeholder="Ex: Quadro Elétrico Aberto"
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Recomendação (Opcional)</label>
                        <input 
                            value={pinForm.desc}
                            onChange={e => setPinForm({...pinForm, desc: e.target.value})}
                            placeholder="Ex: Instalar bloqueio tipo cadeado"
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                        />
                    </div>
                    <button 
                        onClick={handleSavePin}
                        className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl shadow-xl shadow-violet-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <MapPin size={18}/> Salvar Marcação
                    </button>
                </div>
            </Modal>
        )}
    </div>
  );
}
