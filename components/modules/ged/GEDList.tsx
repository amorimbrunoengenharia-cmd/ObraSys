"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Folder, FileText, Layers, Box, Upload, Search, Eye, EyeOff, Download, Plus, Trash2, RefreshCw, Edit2, Check, X } from 'lucide-react';

export default function GEDList({ folders, rootDocuments, onSelect, onUpload, onDelete, onCreateFolder, onRevision, onRenameFolder, onDeleteFolder, onToggleFolderVisibility, onToggleDocumentVisibility, isUploading }: any) {
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [revisionDocId, setRevisionDocId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const revisionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (revisionDocId && revisionInputRef.current) {
        revisionInputRef.current.click();
    }
  }, [revisionDocId]);
  
  const activeFolder = folders.find((f: any) => f.id === activeFolderId);
  const files = activeFolder 
    ? activeFolder.documents 
    : [...(rootDocuments || []), ...folders.flatMap((f: any) => f.documents || [])];

  const filtered = (files || []).filter((f: any) => f.nome.toLowerCase().includes(search.toLowerCase()));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isRevision?: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
        if (isRevision && revisionDocId && onRevision) {
            onRevision(revisionDocId, file);
            setRevisionDocId(null);
        } else if (onUpload) {
            onUpload(file, activeFolderId);
        }
    }
  };

  const handleStartEdit = (e: React.MouseEvent, folder: any) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  };

  const handleSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingName && editingFolderId && onRenameFolder) {
        onRenameFolder(editingFolderId, editingName);
    }
    setEditingFolderId(null);
  };

  const handleDeleteFolder = (e: React.MouseEvent, folderId: number) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja excluir esta pasta?")) {
        onDeleteFolder(folderId);
    }
  };

  return (
    <div className="flex h-full overflow-hidden animate-in fade-in">
        <div className="w-64 bg-white dark:bg-[#162032] border-r border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="p-4 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Disciplinas / Pastas</span>
                {onCreateFolder && <button onClick={onCreateFolder} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Nova Pasta"><Plus size={14}/></button>}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <button onClick={() => setActiveFolderId(null)} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${activeFolderId===null?'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold':'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Layers size={16}/> Todos Arquivos
                </button>
                {folders.map((folder: any) => (
                    <div key={folder.id} className="group relative">
                        {editingFolderId === folder.id ? (
                            <form onSubmit={handleSaveEdit} className="flex items-center gap-1 p-1 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                                <input 
                                    autoFocus 
                                    value={editingName} 
                                    onChange={e=>setEditingName(e.target.value)}
                                    className="w-full text-xs p-1 bg-transparent border-none outline-none font-bold text-blue-600"
                                    onBlur={() => handleSaveEdit()}
                                />
                                <button type="submit" className="text-emerald-500 hover:text-emerald-600"><Check size={14}/></button>
                            </form>
                        ) : (
                            <button 
                                onClick={() => setActiveFolderId(folder.id)} 
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all ${activeFolderId===folder.id?'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold':'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Folder size={16} className={activeFolderId===folder.id?'fill-blue-200':''}/> 
                                    <span className="truncate">{folder.name}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onToggleFolderVisibility && <span 
                                        onClick={(e) => { e.stopPropagation(); onToggleFolderVisibility(folder.id, !folder.visibleToClient); }} 
                                        className={`p-1 rounded cursor-pointer transition-colors ${folder.visibleToClient ? 'text-blue-500 hover:bg-blue-100' : 'text-slate-300 hover:bg-slate-100'}`}
                                        title={folder.visibleToClient ? "Visível para o Cliente" : "Privado (Oculto para o Cliente)"}
                                    >
                                        {folder.visibleToClient ? <Eye size={12}/> : <EyeOff size={12}/>}
                                    </span>}
                                    {onRenameFolder && <span onClick={(e) => handleStartEdit(e, folder)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded text-blue-400 hover:text-blue-600 cursor-pointer" title="Renomear">
                                        <Edit2 size={12}/>
                                    </span>}
                                    {onDeleteFolder && <span onClick={(e) => handleDeleteFolder(e, folder.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded text-red-400 hover:text-red-600 cursor-pointer" title="Excluir Pasta">
                                        <Trash2 size={12}/>
                                    </span>}
                                </div>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
        <div className="flex-1 bg-slate-50 dark:bg-[#0B1121] p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{activeFolder ? activeFolder.name : 'Todos Arquivos'}</h3>
                <div className="relative w-64"><Search size={14} className="absolute left-3 top-2.5 text-slate-400"/><input type="text" placeholder="Filtrar..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs bg-white dark:bg-[#162032] outline-none" onChange={e=>setSearch(e.target.value)}/></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((file:any) => {
                    const ext = file.nome.split('.').pop()?.toLowerCase();
                    return (
                        <div key={file.id} onClick={() => onSelect(file)} className="bg-white dark:bg-[#162032] p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer group relative">
                            <div className="absolute top-3 right-3 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                                <a 
                                    href={file.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-slate-50 text-slate-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 hover:text-blue-600"
                                    title="Visualizar em Nova Aba"
                                >
                                    <Eye size={14}/>
                                </a>
                                <a 
                                    href={file.url} 
                                    download={file.nome}
                                    className="p-1.5 bg-slate-50 text-slate-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                                    title="Baixar Arquivo"
                                >
                                    <Download size={14}/>
                                </a>
                                {onRevision && <button 
                                    onClick={() => setRevisionDocId(file.id)}
                                    className="p-1.5 bg-blue-50 text-blue-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-100"
                                    title="Subir Nova Revisão"
                                >
                                    <RefreshCw size={14} className={isUploading && revisionDocId === file.id ? 'animate-spin' : ''}/>
                                </button>}
                                {onDelete && <button 
                                    onClick={() => onDelete(file.id)}
                                    className="p-1.5 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100"
                                    title="Excluir Arquivo"
                                >
                                    <Trash2 size={14}/>
                                </button>}
                                {onToggleDocumentVisibility && <button 
                                    onClick={() => onToggleDocumentVisibility(file.id, !file.visibleToClient)}
                                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${file.visibleToClient ? 'bg-blue-50 text-blue-500 hover:bg-blue-100' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                                    title={file.visibleToClient ? "Visível no Portal do Cliente" : "Oculto no Portal do Cliente"}
                                >
                                    {file.visibleToClient ? <Eye size={14}/> : <EyeOff size={14}/>}
                                </button>}
                                <div className={`ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ext==='pdf'?'bg-red-100 text-red-600':ext==='dwg'?'bg-blue-100 text-blue-600':'bg-indigo-100 text-indigo-600'}`}>
                                    {ext?.toUpperCase() || 'FILE'}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                                    {ext==='pdf' ? <FileText/> : ext==='dwg' ? <Layers/> : <Box/>}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <a 
                                            href={file.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="font-bold text-sm truncate block text-slate-800 dark:text-white hover:text-blue-500 transition-colors"
                                            title={file.nome}
                                        >
                                            {file.nome}
                                        </a>
                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase flex-shrink-0">
                                            Vigente: {file.version || 'R00'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">{file.data} • {file.version}</p>
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-400 flex justify-between mt-2">
                                <span>{file.uploadedBy}</span>
                                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                        </div>
                    );
                })}
                
                {onUpload && (
                    <label className={`border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-all min-h-[120px] ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                        <input type="file" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                        {isUploading ? (
                            <>
                                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                <span className="text-xs font-bold animate-pulse text-emerald-600">Enviando...</span>
                            </>
                        ) : (
                            <>
                                <Upload size={24} className="mb-1"/>
                                <span className="text-xs font-bold">Upload Arquivo</span>
                                <span className="text-[9px] mt-1 text-slate-400">PDF, DWG, BIM</span>
                            </>
                        )}
                    </label>
                )}

                {/* Input Invisível para Revisão */}
                <input 
                    type="file" 
                    ref={revisionInputRef}
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, true)} 
                />
            </div>
        </div>
    </div>
  );
}
