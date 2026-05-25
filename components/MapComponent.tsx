"use client";
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
// @ts-ignore
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { Building2, User, ArrowRight, Activity, MapPin } from 'lucide-react';

// Fix for default Leaflet icons in Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons for Status (Semáforo de Obras)
const createCustomIcon = (color: string) => {
    return new L.DivIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [15, 15],
        iconAnchor: [7, 7]
    });
};

const icons = {
    green: createCustomIcon('#10b981'),
    yellow: createCustomIcon('#f59e0b'),
    red: createCustomIcon('#ef4444')
};

interface MapProps {
    projects: any[];
}

export default function MapComponent({ projects }: MapProps) {
    // Coordenada Fallback (Araçatuba - Sede da WayService)
    const DEFAULT_CENTER: [number, number] = [-21.2089, -50.4404];

    return (
        <div className="w-full h-full relative">
            <MapContainer 
                center={DEFAULT_CENTER} 
                zoom={12} 
                style={{ height: '100%', width: '100%', background: '#0B1121' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                
                {projects.map((project) => {
                    // Lógica de Cor baseada na Margem/Saúde
                    let color = icons.green;
                    if (project.margin < 10) color = icons.yellow;
                    if (project.margin < 0 || project.saude === 'critico') color = icons.red;

                    // Verifica se tem coordenadas, senão usa o centro (levemente deslocado)
                    const position: [number, number] = project.lat && project.lng 
                      ? [project.lat, project.lng] 
                      : [DEFAULT_CENTER[0] + (Math.random() - 0.5) * 0.02, DEFAULT_CENTER[1] + (Math.random() - 0.5) * 0.02];

                    return (
                        <Marker 
                            key={project.id} 
                            position={position} 
                            icon={color}
                        >
                            <Popup className="custom-popup">
                                <div className="p-3 min-w-[220px]">
                                    <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                                        <Building2 size={16} className="text-blue-600"/>
                                        <h3 className="font-bold text-slate-900 m-0 text-sm leading-tight">{project.name}</h3>
                                    </div>
                                    
                                    <div className="space-y-2 mb-4 text-[11px] text-slate-600">
                                        <p className="flex items-center gap-2 m-0"><User size={14} className="text-slate-400 flex-shrink-0"/> <span className="truncate">{project.responsibleEngineer || 'Eng. Responsável'}</span></p>
                                        <p className="flex items-center gap-2 m-0 text-slate-500 leading-tight"><MapPin size={14} className="text-slate-400 flex-shrink-0"/> <span className="line-clamp-2">{project.address}</span></p>
                                        <p className="flex items-center gap-2 m-0 font-medium"><Activity size={14} className="text-slate-400 flex-shrink-0"/> Progresso: <span className="text-slate-900 font-bold">{project.progresso.toFixed(0)}%</span></p>
                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg mt-2">
                                            <span className="font-bold uppercase text-[9px] text-slate-400 tracking-wider">Margem Atual</span>
                                            <span className={`font-black text-xs ${project.margin < 0 ? "text-red-500" : project.margin < 10 ? "text-orange-500" : "text-green-600"}`}>
                                                {project.margin}%
                                            </span>
                                        </div>
                                    </div>

                                    <Link 
                                        href={`/projeto/${project.id}`}
                                        className="block w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-center text-[10px] font-black uppercase rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                    >
                                        Acessar Central do Projeto
                                    </Link>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Legend Overlay */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl text-[10px] font-bold uppercase tracking-widest space-y-3">
                <div className="flex items-center gap-3"><div className="w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-emerald-500/20"></div> <span>Margem Saudável (&gt;10%)</span></div>
                <div className="flex items-center gap-3"><div className="w-3 h-3 bg-amber-500 rounded-full ring-2 ring-amber-500/20"></div> <span>Margem em Atenção (0-10%)</span></div>
                <div className="flex items-center gap-3"><div className="w-3 h-3 bg-rose-500 rounded-full ring-2 ring-rose-500/20"></div> <span>Margem Crítica / Alertas</span></div>
            </div>
        </div>
    );
}
