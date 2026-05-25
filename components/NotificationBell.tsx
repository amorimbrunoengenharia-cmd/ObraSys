"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { getNotifications, markAsRead, markAllAsRead, checkFinancialDeadlines } from '../app/actions/notifications';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

export default function NotificationBell() {
    const { user } = useAuth() as any;
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user?.id) {
            fetchNotifications();
            // Verifica prazos ao carregar (apenas para gestores)
            if (user.role === 'Diretor' || user.role === 'Gerente de Obras') {
                checkFinancialDeadlines();
            }
        }
    }, [user]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        if (!user?.id) return;
        const data = await getNotifications(user.id);
        setNotifications(data);
    };

    const handleMarkAsRead = async (notif: any) => {
        if (!notif.isRead) {
            await markAsRead(notif.id);
            fetchNotifications();
        }
        if (notif.link) {
            router.push(notif.link);
            setIsOpen(false);
        }
    };

    const handleMarkAll = async () => {
        if (!user?.id) return;
        await markAllAsRead(user.id);
        fetchNotifications();
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'WARNING': return <AlertTriangle className="text-amber-500" size={16} />;
            case 'SUCCESS': return <CheckCircle className="text-emerald-500" size={16} />;
            case 'ERROR': return <XCircle className="text-red-500" size={16} />;
            default: return <Info className="text-blue-500" size={16} />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce border-2 border-white dark:border-slate-800">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Notificações</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Alertas e Atualizações</p>
                        </div>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAll} className="text-[9px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest">Lida Tudo</button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Info size={32} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-xs font-bold text-slate-400 uppercase">Nenhum alerta recente</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {notifications.map((n) => (
                                    <div 
                                        key={n.id} 
                                        onClick={() => handleMarkAsRead(n)}
                                        className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-all flex gap-3 ${!n.isRead ? 'bg-blue-50/30 dark:bg-blue-500/5 border-l-4 border-blue-500' : ''}`}
                                    >
                                        <div className="mt-1 shrink-0">{getTypeIcon(n.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-black truncate ${!n.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                                {n.message}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">
                                                {new Date(n.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fim da lista</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
