"use client";

import dynamic from "next/dynamic";
import React from 'react';

// Importação dinâmica com SSR desabilitado para o Leaflet
const MapComponent = dynamic(() => import("@/components/MapComponent"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-slate-900 rounded-2xl animate-pulse">
        <p className="text-slate-400 font-bold uppercase tracking-widest">
            Carregando Torre de Controle...
        </p>
    </div>
  )
});

export default function MapWrapper({ projects }: { projects: any[] }) {
  return <MapComponent projects={projects} />;
}
