"use client";
import React, { useState } from 'react';
import { Folder, FileCode, Layers, Plus } from 'lucide-react';
import { canUploadGED } from '../../lib/permissions';
import { useAuth } from '../AuthContext';
import { getFolders, createFolder, addDocument, deleteDocument, uploadRevision, renameFolder, deleteFolder, toggleFolderVisibility, toggleDocumentVisibility } from '../../app/actions/document';
import { getMaterialLists } from '../../app/actions/lm';
import GEDList from './ged/GEDList';
import GEDViewer from './ged/GEDViewer';
import GEDMaterials from './ged/GEDMaterials';
import ProjectViewer from './ged/ProjectViewer';
import { Modal } from '../Shared';

export default function GED({ proj, onRefresh }: any) {
  const [section, setSection] = useState('projetos');
  const [folders, setFolders] = useState<any[]>([]);
  const [rootDocs, setRootDocs] = useState<any[]>([]);
  const [lms, setLms] = useState<any[]>([]);
  const { user } = useAuth();
  const hasUploadPermission = canUploadGED(user?.role || '');
  
  // States for viewers
  const [viewerFile, setViewerFile] = useState(null);
  const [showProjectViewer, setShowProjectViewer] = useState(false);

  // States for management
  const [isUploading, setIsUploading] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  React.useEffect(() => {
    async function loadData() {
        const res = await getFolders(proj.id);
        setFolders(res.folders);
        setRootDocs(res.rootDocuments);

        const lmRes = await getMaterialLists(proj.id);
        if (lmRes.success) setLms(lmRes.lists || []);
    }
    loadData();
  }, [proj.id]);

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    const res = await createFolder(proj.id, newFolderName);
    if (res.success) {
        setIsFolderModalOpen(false);
        setNewFolderName('');
        const fresh = await getFolders(proj.id);
        setFolders(fresh.folders);
        setRootDocs(fresh.rootDocuments);
        if (onRefresh) onRefresh();
    }
  };

  const handleRenameFolder = async (folderId: number, name: string) => {
    const res = await renameFolder(folderId, proj.id, name);
    if (res.success) {
        const fresh = await getFolders(proj.id);
        setFolders(fresh.folders);
        setRootDocs(fresh.rootDocuments);
    } else {
        alert("Erro ao renomear: " + res.error);
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    const res = await deleteFolder(folderId, proj.id);
    if (res.success) {
        const fresh = await getFolders(proj.id);
        setFolders(fresh.folders);
        setRootDocs(fresh.rootDocuments);
    } else {
        alert("⚠️ Atenção: " + res.error);
    }
  };

  const handleToggleFolderVisibility = async (folderId: number, visible: boolean) => {
    const res = await toggleFolderVisibility(folderId, visible, proj.id);
    if (res.success) {
        const fresh = await getFolders(proj.id);
        setFolders(fresh.folders);
        setRootDocs(fresh.rootDocuments);
    }
  };

  const handleToggleDocumentVisibility = async (docId: number, visible: boolean) => {
    const res = await toggleDocumentVisibility(docId, visible, proj.id);
    if (res.success) {
        const fresh = await getFolders(proj.id);
        setFolders(fresh.folders);
        setRootDocs(fresh.rootDocuments);
    }
  };

  const handleUpload = async (file: File, folderId?: number) => {
    setIsUploading(true);
    console.log("Iniciando Upload:", file.name, "FolderID:", folderId);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', proj.id.toString());
    if (folderId) formData.append('folderId', folderId.toString());

    try {
        const response = await fetch('/api/upload/ged', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (result.success) {
            const dbRes = await addDocument(proj.id, {
                nome: result.name,
                tipo: file.name.split('.').pop()?.toUpperCase() === 'PDF' ? 'Planta' : 'Outros',
                url: result.url,
                size: result.size,
                folderId: folderId,
                uploadedBy: "Admin" 
            });

            if (dbRes.success) {
                const fresh = await getFolders(proj.id);
                setFolders(fresh.folders);
                setRootDocs(fresh.rootDocuments);
                if (onRefresh) onRefresh();
                alert("✅ Arquivo enviado e registrado com sucesso!");
            } else {
                throw new Error("Erro ao registrar no banco: " + dbRes.error);
            }
        } else {
            throw new Error(result.error || "Erro desconhecido no servidor de upload");
        }
    } catch (e: any) {
        console.error("Erro no Upload GED:", e);
        alert("❌ Falha no Upload: " + e.message);
    } finally {
        setIsUploading(false);
    }
  };

  const handleRevision = async (oldDocId: number, file: File) => {
    setIsUploading(true);
    console.log("Iniciando Revisão do Documento:", oldDocId, "Novo Arquivo:", file.name);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', proj.id.toString());

    try {
        // 1. Upload Físico
        const response = await fetch('/api/upload/ged', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error("Falha no upload físico da revisão.");
        const result = await response.json();

        if (result.success) {
            // 2. Lógica de Versão no Banco
            const dbRes = await uploadRevision(oldDocId, {
                nome: result.name,
                url: result.url,
                size: result.size,
                uploadedBy: "Admin"
            });

            if (dbRes.success) {
                const fresh = await getFolders(proj.id);
                setFolders(fresh.folders);
                setRootDocs(fresh.rootDocuments);
                if (onRefresh) onRefresh();
                alert(`✅ Revisão ${dbRes.version} enviada com sucesso!`);
            } else {
                throw new Error(dbRes.error);
            }
        }
    } catch (e: any) {
        console.error("Erro na Revisão GED:", e);
        alert("❌ Falha na Revisão: " + e.message);
    } finally {
        setIsUploading(false);
    }
  };

  const handleDeleteFile = async (docId: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este documento permanentemente? Esta ação não pode ser desfeita.")) return;
    
    const res = await deleteDocument(docId, proj.id);
    if (res.success) {
        const fresh = await getFolders(proj.id);
        setFolders(fresh.folders);
        setRootDocs(fresh.rootDocuments);
        if (onRefresh) onRefresh();
    } else {
        alert("Erro ao excluir: " + res.error);
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in relative bg-slate-50 dark:bg-[#0B1121]">
        
        {/* VIEWERS */}
        {viewerFile && <GEDViewer file={viewerFile} onClose={()=>setViewerFile(null)} />}
        {showProjectViewer && (() => {
            const planDocs = rootDocs.filter(d => d.tipo === 'Planta' || d.url?.toLowerCase().endsWith('.pdf'));
            const folderDocs = folders.flatMap(f => f.documents).filter(d => d.tipo === 'Planta' || d.url?.toLowerCase().endsWith('.pdf'));
            const allPlans = [...planDocs, ...folderDocs];
            return <ProjectViewer files={allPlans} initialIndex={allPlans.length > 0 ? allPlans.length - 1 : 0} onClose={() => setShowProjectViewer(false)} />;
        })()}
        
        <div className="p-6 pb-0 flex justify-between items-end mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Folder className="text-emerald-500"/> Central de Engenharia
                </h2>
                <p className="text-sm text-slate-500 mt-1">Gerenciamento de Plantas e Documentos</p>
            </div>
            <div className="flex gap-4 items-center">
                <button 
                    onClick={() => setShowProjectViewer(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <Layers size={16}/> Abrir Visualizador BIM/Plantas
                </button>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex bg-slate-100 dark:bg-[#162032] p-1 rounded-lg border dark:border-slate-800">
                    <button onClick={() => setSection('projetos')} className={`px-4 py-2 text-xs font-bold rounded flex gap-2 ${section==='projetos'?'bg-white shadow text-emerald-600':'text-slate-400'}`}><Folder size={14}/> Arquivos</button>
                    <button onClick={() => setSection('lms')} className={`px-4 py-2 text-xs font-bold rounded flex gap-2 ${section==='lms'?'bg-white shadow text-blue-500':'text-slate-400'}`}><FileCode size={14}/> Listas (LM)</button>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-hidden border-t dark:border-slate-800 mt-4">
            {section === 'projetos' ? (
                <GEDList 
                    folders={folders} 
                    rootDocuments={rootDocs}
                    onSelect={setViewerFile} 
                    onUpload={hasUploadPermission ? handleUpload : undefined}
                    onDelete={user?.role === 'Diretor' ? handleDeleteFile : undefined}
                    onRevision={hasUploadPermission ? handleRevision : undefined}
                    onRenameFolder={hasUploadPermission ? handleRenameFolder : undefined}
                    onDeleteFolder={user?.role === 'Diretor' ? handleDeleteFolder : undefined}
                    onToggleFolderVisibility={handleToggleFolderVisibility}
                    onToggleDocumentVisibility={handleToggleDocumentVisibility}
                    onCreateFolder={hasUploadPermission ? () => setIsFolderModalOpen(true) : undefined}
                    isUploading={isUploading}
                />
            ) : (
                <GEDMaterials projId={proj.id} initialLms={lms} onRefresh={() => {
                    getMaterialLists(proj.id).then(r => { if(r.success) setLms(r.lists || []) })
                }} />
            )}
        </div>

        {isFolderModalOpen && (
            <Modal title="Criar Nova Pasta de Documentos" onClose={() => setIsFolderModalOpen(false)}>
                <div className="space-y-4 p-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Nome da Pasta</label>
                        <input 
                            value={newFolderName} 
                            onChange={e => setNewFolderName(e.target.value)} 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none" 
                            placeholder="Ex: Projetos Executivos, Contratos..." 
                        />
                    </div>
                    <button 
                        onClick={handleCreateFolder}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs"
                    >
                        Criar Pasta
                    </button>
                </div>
            </Modal>
        )}
    </div>
  );
}
