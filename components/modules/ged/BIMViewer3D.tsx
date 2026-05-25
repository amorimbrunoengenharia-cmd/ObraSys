"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Color } from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';

export default function BIMViewer3D({ url }: { url: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!containerRef.current) return;
        
        const viewer = new IfcViewerAPI({ container: containerRef.current, backgroundColor: new Color(0x0f172a) }); // dark slate background
        viewer.IFC.setWasmPath('/'); // Reads web-ifc.wasm from public folder
        
        // Add basic grid/axes
        viewer.grid.setGrid();
        viewer.axes.setAxes();

        async function loadBIM() {
            try {
                setLoading(true);
                await viewer.IFC.loadIfcUrl(url);
            } catch (err) {
                console.error("Error loading IFC:", err);
            } finally {
                setLoading(false);
            }
        }

        loadBIM();

        return () => {
            viewer.dispose();
        };
    }, [url]);

    return (
        <div className="w-full h-full relative bg-slate-900">
            <div ref={containerRef} className="w-full h-full" />
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white mt-4 font-bold">Carregando Modelo 3D BIM...</p>
                    </div>
                </div>
            )}
            <div className="absolute bottom-4 left-4 text-xs font-bold text-slate-400 bg-black/50 px-3 py-1 rounded">
                Mouse Esquerdo: Orbitar | Mouse Direito: Mover | Scroll: Zoom
            </div>
        </div>
    );
}
