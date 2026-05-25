"use client";
import React from 'react';
import { X, FileText, Layers, Box, Download, ExternalLink } from 'lucide-react';

export default function GEDViewer({ file, onClose }: any) {
  // Normalização de propriedades (suporta Mock e Real DB)
  const name = file.nome || file.name;
  const url = file.url;
  const version = file.version || file.rev || "R00";
  const type = (file.tipo || file.type || "").toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase();

  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  const isPdf = ext === 'pdf' || type === 'planta' || type === 'pdf';

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col animate-in zoom-in-95 duration-200">
        <div className="h-14 bg-slate-900 flex justify-between items-center px-6 text-white border-b border-slate-800">
            <div className="flex items-center gap-3">
                {isPdf ? <FileText className="text-red-500"/> : <Box className="text-indigo-500"/>}
                <span className="font-bold truncate max-w-md">{name}</span>
                <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300 font-black uppercase">Revisão {version}</span>
            </div>
            <div className="flex items-center gap-2">
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold"
                >
                    <ExternalLink size={16}/> Abrir em Nova Aba
                </a>
                <div className="w-px h-6 bg-slate-700 mx-2"></div>
                <button onClick={onClose} className="p-2 hover:bg-red-500 bg-slate-800 rounded-lg transition-all"><X size={20}/></button>
            </div>
        </div>
        
        <div className="flex-1 overflow-hidden relative flex items-center justify-center">
            {isPdf ? (
                <iframe 
                    src={`${url}#toolbar=0`} 
                    className="w-full h-full border-none bg-white"
                    title={name}
                />
            ) : isImage ? (
                <img src={url} alt={name} className="max-w-full max-h-full object-contain shadow-2xl" />
            ) : (
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <Box size={64} className="opacity-20" />
                    <div className="text-center">
                        <p className="font-bold text-lg">Visualização não disponível para este formato</p>
                        <p className="text-sm">Clique no botão abaixo para baixar o arquivo.</p>
                    </div>
                    <a 
                        href={url} 
                        download={name}
                        className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                    >
                        <Download size={20}/> Baixar Arquivo Original
                    </a>
                </div>
            )}
        </div>
    </div>
  );
}
