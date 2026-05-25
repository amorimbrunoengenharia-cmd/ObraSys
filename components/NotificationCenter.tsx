"use client";
import React from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function NotificationCenter({ notifications, isOpen, onClose, onClear }: any) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-6 w-80 bg-white dark:bg-[#162032] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 animate-in slide-in-from-top-2">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-sm flex items-center gap-2"><Bell size={16} className="text-emerald-500"/> Notificações</h3>
        <div className="flex gap-2">
            <button onClick={onClear} className="text-[10px] text-blue-500 hover:underline">Limpar</button>
            <button onClick={onClose}><X size={16} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Nenhuma notificação nova.</div>
        ) : (
            notifications.map((n: any) => (
                <div key={n.id} className="p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3">
                    <div className={`mt-1 ${n.type==='success'?'text-green-500':n.type==='alert'?'text-red-500':'text-blue-500'}`}>
                        {n.type==='success' ? <CheckCircle size={16}/> : n.type==='alert' ? <AlertTriangle size={16}/> : <Info size={16}/>}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{n.title}</p>
                        <p className="text-[10px] text-slate-500 leading-snug">{n.msg}</p>
                        <p className="text-[9px] text-slate-400 mt-1">{n.time}</p>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
