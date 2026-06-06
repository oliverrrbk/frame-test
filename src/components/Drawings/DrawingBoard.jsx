import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { ChevronLeft, Save, FileImage, Undo, Eraser, PenTool } from 'lucide-react';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];

const DrawingBoard = ({ drawingId, leadId, onClose }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(!!drawingId);
    const [isSaving, setIsSaving] = useState(false);
    const [drawingName, setDrawingName] = useState('Ny Skitse');
    
    // Drawing state
    const [paths, setPaths] = useState([]);
    const [currentPath, setCurrentPath] = useState(null);
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'

    // Resize canvas
    useEffect(() => {
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (canvas && container) {
                // Set actual size in memory (scaled to account for extra pixel density)
                canvas.width = container.clientWidth * window.devicePixelRatio;
                canvas.height = container.clientHeight * window.devicePixelRatio;
                
                // Set logical size
                canvas.style.width = `${container.clientWidth}px`;
                canvas.style.height = `${container.clientHeight}px`;
                
                // Normalize coordinate system to use css pixels
                const ctx = canvas.getContext('2d');
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                redraw(paths);
            }
        };

        window.addEventListener('resize', resizeCanvas);
        // Delay initial resize slightly to ensure container is fully rendered
        setTimeout(resizeCanvas, 100);
        
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [paths]);

    // Redraw all paths
    const redraw = useCallback((pathsToDraw) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Clear entire canvas
        ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
        
        pathsToDraw.forEach(p => {
            if (p.points.length === 0) return;
            
            ctx.beginPath();
            ctx.strokeStyle = p.tool === 'eraser' ? '#f8fafc' : p.color; // Eraser uses background color
            ctx.lineWidth = p.tool === 'eraser' ? 20 : p.width;
            ctx.moveTo(p.points[0].x, p.points[0].y);
            
            for (let i = 1; i < p.points.length; i++) {
                ctx.lineTo(p.points[i].x, p.points[i].y);
            }
            ctx.stroke();
        });
    }, []);

    // Load existing drawing
    useEffect(() => {
        if (!drawingId || drawingId === 'new') {
            setIsLoading(false);
            return;
        }

        const loadDrawing = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('drawings')
                    .select('*')
                    .eq('id', drawingId)
                    .single();

                if (error) throw error;
                if (data) {
                    setDrawingName(data.name || 'Ny Skitse');
                    if (data.document_data && Array.isArray(data.document_data)) {
                        setPaths(data.document_data);
                        setTimeout(() => redraw(data.document_data), 100);
                    }
                }
            } catch (err) {
                console.error("Fejl ved indlæsning af skitse:", err);
                toast.error('Kunne ikke indlæse skitsen');
            } finally {
                setIsLoading(false);
            }
        };

        loadDrawing();
    }, [drawingId, redraw]);

    // Pointer events
    const getPointerPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        e.preventDefault();
        const pos = getPointerPos(e);
        const newPath = {
            color,
            width: lineWidth,
            tool,
            points: [pos]
        };
        setCurrentPath(newPath);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!currentPath) return;
        
        const pos = getPointerPos(e);
        const updatedPath = { ...currentPath, points: [...currentPath.points, pos] };
        setCurrentPath(updatedPath);
        
        // Redraw everything plus current path
        redraw([...paths, updatedPath]);
    };

    const stopDrawing = () => {
        if (!currentPath) return;
        setPaths([...paths, currentPath]);
        setCurrentPath(null);
    };

    const handleUndo = () => {
        if (paths.length === 0) return;
        const newPaths = paths.slice(0, -1);
        setPaths(newPaths);
        redraw(newPaths);
    };

    const handleClear = () => {
        if (confirm('Er du sikker på, du vil rydde hele skitsen?')) {
            setPaths([]);
            redraw([]);
        }
    };

    const generateSvg = () => {
        const width = containerRef.current?.clientWidth || 800;
        const height = containerRef.current?.clientHeight || 600;
        
        let svgPaths = paths.map(p => {
            if (p.points.length === 0) return '';
            
            // Note: Eraser paths are complicated in standard SVG. 
            // For a thumbnail, we could just render them as white strokes or filter them out if they are true erasers.
            // A simple approach is just rendering them as white strokes over the other elements.
            const strokeColor = p.tool === 'eraser' ? '#ffffff' : p.color;
            const strokeWidth = p.tool === 'eraser' ? 20 : p.width;
            
            const pointsStr = p.points.map(pt => `${pt.x},${pt.y}`).join(' ');
            return `<polyline points="${pointsStr}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
        }).join('');

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #f8fafc;">${svgPaths}</svg>`;
    };

    const handleSave = async () => {
        if (!leadId) {
            toast.error("Kan ikke gemme skitse uden sag.");
            return;
        }

        setIsSaving(true);
        try {
            const svgContent = generateSvg();

            const drawingData = {
                lead_id: leadId,
                name: drawingName,
                document_data: paths,
                thumbnail_svg: svgContent
            };

            if (drawingId && drawingId !== 'new') {
                const { error } = await supabase
                    .from('drawings')
                    .update(drawingData)
                    .eq('id', drawingId);
                if (error) throw error;
                toast.success('Skitse opdateret');
            } else {
                const { data, error } = await supabase
                    .from('drawings')
                    .insert([drawingData])
                    .select()
                    .single();
                if (error) throw error;
                toast.success('Skitse gemt');
                
                // Force reload logic if needed
                if (onClose) onClose();
                return;
            }
        } catch (error) {
            console.error('Fejl ved gem:', error);
            toast.error('Kunne ikke gemme skitse');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#f8fafc', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            
            {/* Tegneområde */}
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
                />
                
                {isLoading && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248, 250, 252, 0.8)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                        <span style={{ fontWeight: 600, color: '#475569', fontSize: '1.1rem' }}>Indlæser skitse...</span>
                    </div>
                )}

                {/* Floating Modern Header */}
                <div style={{
                    position: 'absolute',
                    top: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10000,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    gap: '12px',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    <button 
                        onClick={onClose}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', borderRadius: '10px', color: '#64748b', fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.2s', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        <ChevronLeft size={16} />
                        Tilbage
                    </button>
                    
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />
                    
                    <input 
                        type="text" 
                        value={drawingName}
                        onChange={(e) => setDrawingName(e.target.value)}
                        placeholder="Navngiv skitse..."
                        style={{ border: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 600, color: '#0f172a', padding: '4px 8px', width: '200px', outline: 'none' }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => { setTool('pen'); setColor(c); }}
                                style={{
                                    width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c, border: color === c && tool === 'pen' ? '3px solid #cbd5e1' : 'none', cursor: 'pointer', transition: 'all 0.2s', transform: color === c && tool === 'pen' ? 'scale(1.1)' : 'scale(1)'
                                }}
                            />
                        ))}
                    </div>

                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />

                    <button
                        onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px', backgroundColor: tool === 'eraser' ? '#eff6ff' : 'transparent', color: tool === 'eraser' ? '#3b82f6' : '#64748b', border: 'none', cursor: 'pointer' }}
                        title="Viskelæder"
                    >
                        <Eraser size={18} />
                    </button>

                    <button
                        onClick={handleUndo}
                        disabled={paths.length === 0}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px', backgroundColor: 'transparent', color: paths.length === 0 ? '#cbd5e1' : '#64748b', border: 'none', cursor: paths.length === 0 ? 'default' : 'pointer' }}
                        title="Fortryd (Undo)"
                    >
                        <Undo size={18} />
                    </button>
                    
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />
                    
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', backgroundColor: '#0f172a', color: 'white', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.2)', opacity: isSaving ? 0.7 : 1 }}
                    >
                        <Save size={16} />
                        {isSaving ? 'Gemmer...' : 'Gem Skitse'}
                    </button>
                </div>

                {/* Bison Frame Watermark */}
                <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 10000,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Tegnet med</span>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Bison Frame</span>
                </div>
            </div>
        </div>
    );
};

export default DrawingBoard;
