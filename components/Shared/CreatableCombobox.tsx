"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Search, Check } from 'lucide-react';

interface Option {
    id?: number | string;
    name: string;
}

interface Props {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onCreate?: (name: string) => void;
    label?: string;
}

export default function CreatableCombobox({ options, value, onChange, placeholder, onCreate, label }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
        opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exactMatch = options.find(opt => opt.name.toLowerCase() === searchTerm.toLowerCase());

    const handleSelect = (val: string) => {
        onChange(val);
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleCreate = () => {
        if (!searchTerm) return;
        if (onCreate) onCreate(searchTerm);
        onChange(searchTerm);
        setSearchTerm('');
        setIsOpen(false);
    };

    return (
        <div className="space-y-1 relative" ref={containerRef}>
            {label && <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{label}</label>}
            
            <div 
                className="w-full p-2.5 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus-within:border-blue-500/50 flex items-center justify-between cursor-pointer transition-all"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                    {value || placeholder || 'Selecione...'}
                </span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-[#0B1121]">
                        <Search size={14} className="text-slate-400" />
                        <input 
                            autoFocus
                            type="text" 
                            className="bg-transparent border-none outline-none text-xs w-full p-1"
                            placeholder="Buscar ou criar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && searchTerm && !exactMatch) handleCreate();
                                if (e.key === 'Enter' && exactMatch) handleSelect(exactMatch.name);
                            }}
                        />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, i) => (
                                <div 
                                    key={i}
                                    className="p-2.5 px-4 text-sm hover:bg-blue-500 hover:text-white cursor-pointer flex justify-between items-center group transition-colors"
                                    onClick={() => handleSelect(opt.name)}
                                >
                                    <span>{opt.name}</span>
                                    {value === opt.name && <Check size={14} className="text-blue-500 group-hover:text-white" />}
                                </div>
                            ))
                        ) : searchTerm && !exactMatch && (
                            <div className="p-2">
                                <p className="text-[10px] text-slate-400 px-2 py-1 italic">Nenhum resultado encontrado.</p>
                            </div>
                        )}

                        {searchTerm && !exactMatch && (
                            <div 
                                className="p-2.5 px-4 text-sm bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2 font-bold transition-all"
                                onClick={handleCreate}
                            >
                                <Plus size={14} />
                                Criar "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
