"use client";
import React, { useState, useRef, MouseEvent } from 'react';
import { 
    ZoomIn, ZoomOut, Move, MapPin, Layers, Settings, X, 
    MessageSquare, AlertTriangle, CheckCircle2, ChevronRight, Share2, ChevronLeft, Send 
} from 'lucide-react';
import { getDocumentPins, createPin, updatePinStatus, deletePin, addPinComment } from '../../../app/actions/pins';
import BIMViewer3D from './BIMViewer3D';

export default function ProjectViewer({ files = [], initialIndex = 0, onClose }: { files?: any[], initialIndex?: number, onClose: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const file = files.length > 0 ? files[currentIndex] : null;

    const handlePrev = () => setCurrentIndex(prev => prev > 0 ? prev - 1 : prev);
    const handleNext = () => setCurrentIndex(prev => prev < files.length - 1 ? prev + 1 : prev);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    const [activeTool, setActiveTool] = useState<'pan' | 'pin'>('pan');
    const [selectedPin, setSelectedPin] = useState<number | null>(null);

    const [pins, setPins] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');

    // Fetch pins whenever the active file changes
    React.useEffect(() => {
        if (!file?.id) {
            setPins([]);
            return;
        }
        getDocumentPins(file.id).then(res => {
            if (res.success) setPins(res.pins || []);
            else console.error("Error fetching pins:", res.error);
        });
    }, [file?.id]);

    const viewerRef = useRef<HTMLDivElement>(null);

    // Zoom Handlers
    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

    // Pan Handlers
    const handleMouseDown = (e: MouseEvent) => {
        if (activeTool === 'pan') {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && activeTool === 'pan') {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        if (isDragging) setIsDragging(false);
    };

    // Add Pin Handler
    const handleImageClick = async (e: MouseEvent) => {
        if (activeTool === 'pin' && viewerRef.current && file?.id) {
            const rect = viewerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            const title = prompt("Título da marcação:");
            if (!title) return;
            const desc = prompt("Descrição do problema:") || "";
            const type = confirm("Isto é uma Dúvida (RFI)? OK para RFI, Cancelar para RNC (Não Conformidade).") ? 'rfi' : 'rnc';
            
            // Otimistic Update
            const tempId = Date.now();
            const newPin = { id: tempId, x, y, type, status: 'aberto', title, desc, authorName: 'Você', createdAt: new Date().toISOString() };
            setPins(prev => [...prev, newPin]);
            setSelectedPin(tempId);
            setActiveTool('pan');

            const res = await createPin(file.projectId, file.id, newPin);
            if (res.success && res.pin) {
                setPins(prev => prev.map(p => p.id === tempId ? { ...res.pin, authorName: 'Você' } : p));
                setSelectedPin(res.pin.id);
            } else {
                alert("Erro ao salvar marcação: " + res.error);
                setPins(prev => prev.filter(p => p.id !== tempId));
                setSelectedPin(null);
            }
        }
    };

    const selectedPinData = pins.find(p => p.id === selectedPin);

    return (
        <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-[#0B1121] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="h-16 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-800 px-6 flex justify-between items-center z-20 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Layers className="text-blue-500" />
                        {file ? file.nome : 'PROJ-ESTRUTURAL-PAV1.pdf'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Revisão {file ? (file.version || 'R00') : 'R03'} • Selecionado do Repositório</p>
                </div>
                
                {files.length > 1 && (
                    <div className="flex items-center gap-4 bg-slate-100 dark:bg-[#0B1121] px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button onClick={handlePrev} disabled={currentIndex === 0} className="p-1 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 rounded"><ChevronLeft size={20}/></button>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{currentIndex + 1} de {files.length}</span>
                        <button onClick={handleNext} disabled={currentIndex === files.length - 1} className="p-1 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 rounded"><ChevronRight size={20}/></button>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 text-sm font-bold">
                        <Share2 size={16}/> Compartilhar
                    </button>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg flex items-center gap-2 text-sm font-bold">
                        <X size={16}/> Fechar
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex relative overflow-hidden">
                
                {/* Tools Sidebar (Floating) */}
                <div className="absolute left-6 top-6 z-20 flex flex-col gap-2">
                    <div className="bg-white/80 dark:bg-[#162032]/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex flex-col gap-1">
                        <button onClick={() => setActiveTool('pan')} className={`p-3 rounded-lg transition-colors ${activeTool === 'pan' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Mover Planta">
                            <Move size={20} />
                        </button>
                        <button onClick={() => setActiveTool('pin')} className={`p-3 rounded-lg transition-colors ${activeTool === 'pin' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Adicionar Pin (RFI/RNC)">
                            <MapPin size={20} />
                        </button>
                    </div>

                    <div className="bg-white/80 dark:bg-[#162032]/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex flex-col gap-1 mt-4">
                        <button onClick={handleZoomIn} className="p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ZoomIn size={20} /></button>
                        <div className="text-center text-[10px] font-bold text-slate-400 py-1">{Math.round(scale * 100)}%</div>
                        <button onClick={handleZoomOut} className="p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ZoomOut size={20} /></button>
                    </div>
                </div>

                {/* Viewer Canvas */}
                <div 
                    className={`flex-1 relative overflow-hidden bg-slate-200/50 dark:bg-black/50 ${file?.url?.toLowerCase().endsWith('.ifc') ? '' : (activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair')}`}
                    onMouseDown={file?.url?.toLowerCase().endsWith('.ifc') ? undefined : handleMouseDown}
                    onMouseMove={file?.url?.toLowerCase().endsWith('.ifc') ? undefined : handleMouseMove}
                    onMouseUp={file?.url?.toLowerCase().endsWith('.ifc') ? undefined : handleMouseUp}
                    onMouseLeave={file?.url?.toLowerCase().endsWith('.ifc') ? undefined : handleMouseUp}
                >
                    {file?.url?.toLowerCase().endsWith('.ifc') ? (
                        <BIMViewer3D url={file.url} />
                    ) : (
                        <div 
                            ref={viewerRef}
                            className="absolute top-1/2 left-1/2 w-[800px] h-[600px] origin-center transition-transform duration-100 ease-out"
                            style={{
                                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                            }}
                            onClick={activeTool === 'pin' ? handleImageClick : undefined}
                        >
                            {/* Blueprint Image */}
                            <div className="w-full h-full bg-white shadow-2xl border border-slate-200 dark:border-slate-800 rounded-sm relative overflow-hidden pointer-events-none select-none">
                            {file?.url?.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={`${file.url}#toolbar=0`} className="w-full h-full border-none" />
                            ) : (
                                <img src={file?.url || "/blueprint.png"} alt="Blueprint" className="w-full h-full object-cover opacity-90 dark:invert" draggable={false} />
                            )}
                        </div>

                        {/* Pins Layer */}
                        {pins.map(pin => (
                            <div 
                                key={pin.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedPin(pin.id); setActiveTool('pan'); }}
                                className={`absolute w-8 h-8 -ml-4 -mt-4 cursor-pointer flex items-center justify-center transform transition-transform hover:scale-125 ${selectedPin === pin.id ? 'scale-125 z-30' : 'z-20'}`}
                                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                            >
                                <div className="absolute inset-0 animate-ping opacity-20 rounded-full" 
                                     style={{ backgroundColor: pin.type === 'rfi' ? (pin.status === 'urgente' ? '#ef4444' : '#3b82f6') : '#f59e0b' }}>
                                </div>
                                <MapPin 
                                    className={`drop-shadow-lg ${pin.type === 'rfi' ? (pin.status === 'urgente' ? 'text-red-500 fill-red-100' : 'text-blue-500 fill-blue-100') : 'text-amber-500 fill-amber-100'}`} 
                                    size={32} 
                                />
                            </div>
                        ))}
                    </div>
                    )}
                </div>

                {/* Right Side Panel (Pin Details) */}
                {selectedPinData && (
                    <div className="w-96 bg-white dark:bg-[#162032] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right z-30">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                {selectedPinData.type === 'rfi' ? <MessageSquare className="text-blue-500" size={18}/> : <AlertTriangle className="text-amber-500" size={18}/>}
                                <h3 className="font-bold text-sm uppercase text-slate-500">{selectedPinData.type === 'rfi' ? 'RFI (Dúvida)' : 'RNC (Não Conformidade)'}</h3>
                            </div>
                            <button onClick={() => setSelectedPin(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><X size={16}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">{selectedPinData.title}</h2>
                                <div className="flex gap-2">
                                    <select 
                                        value={selectedPinData.status}
                                        onChange={async (e) => {
                                            const newStatus = e.target.value;
                                            setPins(prev => prev.map(p => p.id === selectedPinData.id ? { ...p, status: newStatus } : p));
                                            await updatePinStatus(selectedPinData.id, newStatus);
                                        }}
                                        className={`px-2 py-1 text-[10px] font-bold rounded uppercase outline-none cursor-pointer ${
                                        selectedPinData.status === 'aberto' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                                        selectedPinData.status === 'urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    }`}>
                                        <option value="aberto">ABERTO</option>
                                        <option value="urgente">URGENTE</option>
                                        <option value="fechado">FECHADO</option>
                                    </select>
                                    <span className="px-2 py-1 text-[10px] font-bold rounded uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                        ID: #{selectedPinData.id.toString().substring(0,4)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Descrição</label>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{selectedPinData.desc}</p>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-4 block">Histórico / Chat</label>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                            {selectedPinData.authorName?.substring(0, 2).toUpperCase() || 'SYS'}
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg rounded-tl-none flex-1">
                                            <p className="text-xs font-bold mb-1">{selectedPinData.authorName} <span className="text-slate-400 font-normal">criou a marcação</span></p>
                                            <p className="text-[10px] text-slate-400">{new Date(selectedPinData.createdAt).toLocaleString('pt-BR')}</p>
                                        </div>
                                    </div>
                                    {selectedPinData.comments && selectedPinData.comments.map((comment: any) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                {comment.author?.name?.substring(0, 2).toUpperCase() || 'U'}
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg rounded-tl-none flex-1 border border-slate-100 dark:border-slate-800">
                                                <p className="text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">{comment.author?.name}</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">{comment.text}</p>
                                                <p className="text-[10px] text-slate-400 mt-2 text-right">{new Date(comment.createdAt).toLocaleString('pt-BR')}</p>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if(e.key === 'Enter') {
                                                        const txt = commentText;
                                                        if(!txt.trim()) return;
                                                        setCommentText('');
                                                        addPinComment(selectedPinData.id, txt).then(res => {
                                                            if(res.success && res.comment) {
                                                                setPins(prev => prev.map(p => p.id === selectedPinData.id ? { ...p, comments: [...(p.comments||[]), res.comment] } : p));
                                                            }
                                                        });
                                                    }
                                                }}
                                                placeholder="Escreva um comentário..." 
                                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
                                            />
                                            <button 
                                                onClick={() => {
                                                    const txt = commentText;
                                                    if(!txt.trim()) return;
                                                    setCommentText('');
                                                    addPinComment(selectedPinData.id, txt).then(res => {
                                                        if(res.success && res.comment) {
                                                            setPins(prev => prev.map(p => p.id === selectedPinData.id ? { ...p, comments: [...(p.comments||[]), res.comment] } : p));
                                                        }
                                                    });
                                                }}
                                                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                                                disabled={!commentText.trim()}
                                            >
                                                <Send size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#111827]">
                            <div className="flex gap-2">
                                <button onClick={async () => {
                                    if(confirm('Excluir esta marcação?')) {
                                        await deletePin(selectedPinData.id);
                                        setPins(prev => prev.filter(p => p.id !== selectedPinData.id));
                                        setSelectedPin(null);
                                    }
                                }} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 rounded-lg text-sm font-bold flex items-center gap-1"><X size={16}/> Excluir Pin</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
