import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { ChevronLeft, Save, ImagePlus, Type, Square, ArrowRight, Eraser, PenTool, MousePointer2, Undo, Ruler, FileImage, Minus, Circle } from 'lucide-react';
import { getElementBounds, getElementAtPosition, rotatePoint } from './engineUtils';

const COLORS = ['#0f172a', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];

const generateId = () => Math.random().toString(36).substr(2, 9);

const DrawingBoard = ({ drawingId, leadId, onClose }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageCache = useRef({});
    
    // DB state
    const [isLoading, setIsLoading] = useState(!!drawingId);
    const [isSaving, setIsSaving] = useState(false);
    const [drawingName, setDrawingName] = useState('Ny Skitse');
    
    // Engine State
    const [elements, setElements] = useState([]);
    const [history, setHistory] = useState([]); // Stack of previous states
    const [appState, setAppState] = useState({
        tool: 'pen', // 'select', 'pen', 'eraser', 'rectangle', 'arrow', 'image', 'text', 'dimension'
        color: '#0f172a',
        strokeWidth: 3,
        selectedElementId: null,
        editingTextId: null, // For text and dimension input
        dragging: false,
        rotating: false,
        resizing: false, // false or 'nw', 'ne', 'sw', 'se'
        actionStartPoint: null, 
        initialRotation: 0,
    });

    // Save to history before modifying
    const pushHistory = useCallback((newElements) => {
        setHistory(prev => [...prev, newElements]);
    }, []);

    const handleUndo = () => {
        if (history.length === 0) return;
        const previousState = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setElements(previousState);
        setAppState(s => ({ ...s, selectedElementId: null, editingTextId: null }));
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === 'Backspace' || e.key === 'Delete') && appState.selectedElementId && !appState.editingTextId) {
                pushHistory(elements);
                setElements(prev => prev.filter(el => el.id !== appState.selectedElementId));
                setAppState(s => ({ ...s, selectedElementId: null }));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appState.selectedElementId, appState.editingTextId, elements, pushHistory]);

    // Rendering Engine
    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw dot grid
        drawGrid(ctx, canvas.width, canvas.height);
        
        elements.forEach(el => {
            ctx.save();
            
            // Apply transformations
            const bounds = getElementBounds(el);
            if (el.rotation) {
                ctx.translate(bounds.cx, bounds.cy);
                ctx.rotate(el.rotation);
                ctx.translate(-bounds.cx, -bounds.cy);
            }

            ctx.strokeStyle = el.color;
            ctx.lineWidth = el.strokeWidth || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (el.type === 'pen') {
                ctx.beginPath();
                if (el.points && el.points.length > 0) {
                    ctx.moveTo(el.points[0].x, el.points[0].y);
                    for (let i = 1; i < el.points.length; i++) {
                        ctx.lineTo(el.points[i].x, el.points[i].y);
                    }
                }
                ctx.stroke();
            } else if (el.type === 'rectangle') {
                ctx.strokeRect(el.x, el.y, el.w, el.h);
            } else if (el.type === 'circle') {
                ctx.beginPath();
                ctx.ellipse(el.x + el.w/2, el.y + el.h/2, Math.abs(el.w)/2, Math.abs(el.h)/2, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else if (el.type === 'line') {
                ctx.beginPath();
                ctx.moveTo(el.x, el.y);
                ctx.lineTo(el.endX, el.endY);
                ctx.stroke();
            } else if (el.type === 'arrow') {
                const headlen = 15;
                const dx = el.endX - el.x;
                const dy = el.endY - el.y;
                const angle = Math.atan2(dy, dx);
                
                ctx.beginPath();
                ctx.moveTo(el.x, el.y);
                ctx.lineTo(el.endX, el.endY);
                ctx.stroke();
                
                // Arrow head
                ctx.beginPath();
                ctx.moveTo(el.endX, el.endY);
                ctx.lineTo(el.endX - headlen * Math.cos(angle - Math.PI / 6), el.endY - headlen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(el.endX, el.endY);
                ctx.lineTo(el.endX - headlen * Math.cos(angle + Math.PI / 6), el.endY - headlen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
            } else if (el.type === 'dimension') {
                const dx = el.endX - el.x;
                const dy = el.endY - el.y;
                const angle = Math.atan2(dy, dx);
                
                ctx.beginPath();
                ctx.moveTo(el.x, el.y);
                ctx.lineTo(el.endX, el.endY);
                ctx.stroke();
                
                const tickLen = 10;
                ctx.save(); ctx.translate(el.x, el.y); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, -tickLen); ctx.lineTo(0, tickLen); ctx.stroke(); ctx.restore();
                ctx.save(); ctx.translate(el.endX, el.endY); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, -tickLen); ctx.lineTo(0, tickLen); ctx.stroke(); ctx.restore();

                if (el.text && el.id !== appState.editingTextId) {
                    ctx.font = '600 16px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const textWidth = ctx.measureText(el.text).width;
                    
                    ctx.save();
                    ctx.translate(el.x + dx/2, el.y + dy/2);
                    let textAngle = angle;
                    if (textAngle > Math.PI/2 || textAngle < -Math.PI/2) textAngle += Math.PI; // Keep readable
                    ctx.rotate(textAngle);
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(-textWidth/2 - 6, -12, textWidth + 12, 24);
                    ctx.fillStyle = el.color;
                    ctx.fillText(el.text, 0, 0);
                    ctx.restore();
                }
            } else if (el.type === 'text') {
                if (el.text && el.id !== appState.editingTextId) {
                    ctx.font = '600 20px Inter, sans-serif';
                    ctx.textBaseline = 'top';
                    ctx.fillStyle = el.color;
                    ctx.fillText(el.text, el.x, el.y);
                }
            } else if (el.type === 'image') {
                if (el.dataUrl) {
                    if (imageCache.current[el.id]) {
                        ctx.drawImage(imageCache.current[el.id], el.x, el.y, el.w, el.h);
                    } else {
                        const img = new window.Image();
                        img.src = el.dataUrl;
                        img.onload = () => {
                            imageCache.current[el.id] = img;
                            redraw();
                        };
                    }
                }
            }

            ctx.restore();
        });
    }, [elements, appState.editingTextId]);

    // Canvas Resize Observer
    useEffect(() => {
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (canvas && container) {
                canvas.width = container.clientWidth * window.devicePixelRatio;
                canvas.height = container.clientHeight * window.devicePixelRatio;
                canvas.style.width = `${container.clientWidth}px`;
                canvas.style.height = `${container.clientHeight}px`;
                
                const ctx = canvas.getContext('2d');
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
                redraw();
            }
        };

        window.addEventListener('resize', resizeCanvas);
        setTimeout(resizeCanvas, 100);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [redraw]);

    // Draw on elements change
    useEffect(() => {
        redraw();
    }, [elements, redraw]);

    // Load Data
    useEffect(() => {
        if (!drawingId || drawingId === 'new') {
            setIsLoading(false);
            return;
        }

        const loadDrawing = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase.from('drawings').select('*').eq('id', drawingId).single();
                if (error) throw error;
                if (data) {
                    setDrawingName(data.name || 'Ny Skitse');
                    if (data.document_data && Array.isArray(data.document_data)) {
                        setElements(data.document_data);
                    }
                }
            } catch (err) {
                console.error("Fejl:", err);
                toast.error('Kunne ikke indlæse skitsen');
            } finally {
                setIsLoading(false);
            }
        };
        loadDrawing();
    }, [drawingId]);

    // Interaction Helpers
    const getPointerPos = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    // Pointer Events
    const handlePointerDown = (e) => {
        const pos = getPointerPos(e);
        
        if (appState.tool === 'select') {
            const clickedElement = getElementAtPosition(pos.x, pos.y, elements);
            if (clickedElement) {
                if (clickedElement.id === appState.selectedElementId && (clickedElement.type === 'text' || clickedElement.type === 'dimension')) {
                    setAppState(s => ({ ...s, editingTextId: clickedElement.id }));
                } else {
                    setAppState(s => ({ 
                        ...s, 
                        selectedElementId: clickedElement.id, 
                        dragging: true, 
                        actionStartPoint: pos,
                        editingTextId: null
                    }));
                }
            } else {
                setAppState(s => ({ ...s, selectedElementId: null, editingTextId: null }));
            }
        } 
        else if (appState.tool === 'eraser') {
            const clickedElement = getElementAtPosition(pos.x, pos.y, elements);
            if (clickedElement) {
                pushHistory(elements);
                setElements(prev => prev.filter(el => el.id !== clickedElement.id));
            }
        }
        else {
            pushHistory(elements);
            let newElement = {
                id: generateId(),
                type: appState.tool,
                color: appState.color,
                strokeWidth: appState.strokeWidth,
                rotation: 0
            };

            if (appState.tool === 'pen') {
                newElement.points = [pos];
            } else if (appState.tool === 'rectangle' || appState.tool === 'text' || appState.tool === 'circle') {
                newElement.x = pos.x;
                newElement.y = pos.y;
                newElement.w = appState.tool === 'text' ? 100 : 0;
                newElement.h = appState.tool === 'text' ? 30 : 0;
                newElement.text = '';
            } else if (appState.tool === 'arrow' || appState.tool === 'dimension' || appState.tool === 'line') {
                newElement.x = pos.x;
                newElement.y = pos.y;
                newElement.endX = pos.x;
                newElement.endY = pos.y;
                newElement.text = '';
            }

            setElements([...elements, newElement]);
            setAppState(s => ({ ...s, selectedElementId: newElement.id, dragging: true, actionStartPoint: pos }));
        }
    };

    const handlePointerMove = (e) => {
        if (!appState.dragging && !appState.rotating && !appState.resizing) return;
        const pos = getPointerPos(e);

        if (appState.resizing && appState.selectedElementId) {
            setElements(prev => prev.map(el => {
                if (el.id !== appState.selectedElementId) return el;
                const bounds = getElementBounds(el);
                let localPos = pos;
                if (el.rotation) localPos = rotatePoint(pos, {x: bounds.cx, y: bounds.cy}, -el.rotation);

                if (el.type === 'rectangle' || el.type === 'image' || el.type === 'text' || el.type === 'circle') {
                    let { x, y, w, h } = el;
                    if (appState.resizing.includes('w')) { w += x - localPos.x; x = localPos.x; }
                    if (appState.resizing.includes('e')) { w = localPos.x - x; }
                    if (appState.resizing.includes('n')) { h += y - localPos.y; y = localPos.y; }
                    if (appState.resizing.includes('s')) { h = localPos.y - y; }
                    if (w < 10) w = 10;
                    if (h < 10) h = 10;
                    return { ...el, x, y, w, h };
                }
                
                if (el.type === 'arrow' || el.type === 'dimension' || el.type === 'line') {
                    if (appState.resizing === 'start') {
                        const dx = localPos.x - el.endX;
                        const dy = localPos.y - el.endY;
                        const angle = Math.atan2(dy, dx);
                        const snap = Math.PI / 4;
                        const closestSnap = Math.round(angle / snap) * snap;
                        if (Math.abs(angle - closestSnap) < 0.17) {
                            const dist = Math.hypot(dx, dy);
                            return { ...el, x: el.endX + Math.cos(closestSnap) * dist, y: el.endY + Math.sin(closestSnap) * dist };
                        }
                        return { ...el, x: localPos.x, y: localPos.y };
                    }
                    if (appState.resizing === 'end') {
                        const dx = localPos.x - el.x;
                        const dy = localPos.y - el.y;
                        const angle = Math.atan2(dy, dx);
                        const snap = Math.PI / 4;
                        const closestSnap = Math.round(angle / snap) * snap;
                        if (Math.abs(angle - closestSnap) < 0.17) {
                            const dist = Math.hypot(dx, dy);
                            return { ...el, endX: el.x + Math.cos(closestSnap) * dist, endY: el.y + Math.sin(closestSnap) * dist };
                        }
                        return { ...el, endX: localPos.x, endY: localPos.y };
                    }
                }
                
                return el;
            }));
            return;
        }

        if (appState.rotating && appState.selectedElementId) {
            const el = elements.find(e => e.id === appState.selectedElementId);
            if (!el) return;
            const bounds = getElementBounds(el);
            const angle = Math.atan2(pos.y - bounds.cy, pos.x - bounds.cx);
            const rotation = angle + Math.PI / 2;
            
            setElements(prev => prev.map(e => e.id === appState.selectedElementId ? { ...e, rotation } : e));
            return;
        }

        if (appState.dragging && appState.selectedElementId) {
            const dx = pos.x - appState.actionStartPoint.x;
            const dy = pos.y - appState.actionStartPoint.y;

            setElements(prev => prev.map(el => {
                if (el.id !== appState.selectedElementId) return el;

                if (appState.tool === 'select') {
                    if (el.type === 'pen') {
                        return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
                    } else if (el.type === 'arrow' || el.type === 'line' || el.type === 'dimension') {
                        return { ...el, x: el.x + dx, y: el.y + dy, endX: el.endX + dx, endY: el.endY + dy };
                    } else {
                        return { ...el, x: el.x + dx, y: el.y + dy };
                    }
                } 
                else if (appState.tool === 'pen') {
                    return { ...el, points: [...el.points, pos] };
                }
                else if (appState.tool === 'rectangle' || appState.tool === 'circle' || appState.tool === 'image') {
                    return { ...el, w: pos.x - el.x, h: pos.y - el.y };
                }
                else if (appState.tool === 'arrow' || appState.tool === 'dimension' || appState.tool === 'line') {
                    const dx = pos.x - el.x;
                    const dy = pos.y - el.y;
                    const angle = Math.atan2(dy, dx);
                    const snap = Math.PI / 4;
                    const closestSnap = Math.round(angle / snap) * snap;
                    let endX = pos.x, endY = pos.y;
                    if (Math.abs(angle - closestSnap) < 0.17) {
                        const dist = Math.hypot(dx, dy);
                        endX = el.x + Math.cos(closestSnap) * dist;
                        endY = el.y + Math.sin(closestSnap) * dist;
                    }
                    return { ...el, endX, endY };
                }
                return el;
            }));

            if (appState.tool === 'select') {
                setAppState(s => ({ ...s, actionStartPoint: pos })); // Update start point for continuous drag
            }
        }
    };

    const handlePointerUp = () => {
        if (appState.dragging || appState.rotating || appState.resizing) {
            setAppState(s => ({ ...s, dragging: false, rotating: false, resizing: false }));
            
            const activeEl = elements.find(e => e.id === appState.selectedElementId);
            if (activeEl && appState.tool !== 'select') {
                // If drawing a rect/arrow that is tiny, remove it
                if (activeEl.type === 'rectangle' && Math.abs(activeEl.w) < 5 && Math.abs(activeEl.h) < 5) {
                    setElements(prev => prev.filter(e => e.id !== activeEl.id));
                }
                else if ((activeEl.type === 'arrow' || activeEl.type === 'dimension') && Math.abs(activeEl.endX - activeEl.x) < 5 && Math.abs(activeEl.endY - activeEl.y) < 5) {
                    setElements(prev => prev.filter(e => e.id !== activeEl.id));
                }
                else if (activeEl.type === 'text' || activeEl.type === 'dimension') {
                    // Auto-focus text editing
                    setAppState(s => ({ ...s, editingTextId: activeEl.id }));
                }
            }
            
            // Automatically switch back to select after drawing a shape
            if (['rectangle', 'arrow', 'text', 'dimension'].includes(appState.tool)) {
                setAppState(s => ({ ...s, tool: 'select' }));
            }
        }
    };

    // Save Logic
    const handleSave = async () => {
        if (!leadId) return;
        setIsSaving(true);
        const tid = toast.loading('Gemmer skitse...');
        try {
            if (drawingId && drawingId !== 'new') {
                const { error } = await supabase
                    .from('drawings')
                    .update({ 
                        document_data: elements, 
                        name: drawingName,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', drawingId);
                if (error) throw error;
            } else {
                // Generate a very basic SVG thumbnail to avoid crash in gallery if it expects thumbnail_svg
                const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" style="background-color: #f8fafc;"></svg>`;
                const { error } = await supabase
                    .from('drawings')
                    .insert([{
                        lead_id: leadId,
                        name: drawingName,
                        document_data: elements,
                        thumbnail_svg: svgContent
                    }]);
                if (error) throw error;
            }
            
            toast.success('Skitse gemt!', { id: tid });
            if (onClose) onClose();
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Fejl ved gemning: ' + error.message, { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    const drawGrid = (ctx, width, height) => {
        ctx.save();
        ctx.fillStyle = '#cbd5e1'; // Very subtle slate-300
        const gridSize = 40; // 40px grid spacing
        // Pan offset if we implement panning later, but for now fixed
        for (let x = 0; x < width; x += gridSize) {
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    };

    const handleMakeOfficial = async () => {
        setIsSaving(true);
        const tid = toast.loading('Genererer officielt dokument...');
        
        try {
            const originalCanvas = canvasRef.current;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalCanvas.width;
            tempCanvas.height = originalCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Draw solid white background
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Draw canvas content on top (grid is included in originalCanvas)
            tempCtx.drawImage(originalCanvas, 0, 0);

            const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
            const fileName = `drawing_${leadId}_${Date.now()}.png`;

            const { data, error } = await supabase.storage
                .from('uploads')
                .upload(`drawings/${fileName}`, blob, { contentType: 'image/png' });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('uploads')
                .getPublicUrl(`drawings/${fileName}`);

            const publicUrl = urlData.publicUrl;

            // Save to bilag
            const { error: dbError } = await supabase
                .from('bilag')
                .insert([{
                    lead_id: leadId,
                    file_url: publicUrl,
                    file_name: drawingName || 'Officiel Tegning',
                    file_type: 'image/png',
                    type: 'Drawing'
                }]);

            if (dbError) throw dbError;

            toast.success('Gemt som officielt bilag!', { id: tid });
            
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Fejl ved eksport: ' + error.message, { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    // Image Upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                pushHistory(elements);
                // Insert at the beginning so it's drawn behind other elements
                const newElement = {
                    id: generateId(),
                    type: 'image',
                    x: 50,
                    y: 50,
                    w: img.width > 600 ? 600 : img.width,
                    h: img.width > 600 ? (img.height * (600 / img.width)) : img.height,
                    rotation: 0,
                    dataUrl: event.target.result
                };
                setElements([newElement, ...elements]);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Selected Element Overlay
    const selectedElement = elements.find(e => e.id === appState.selectedElementId);
    const selectionOverlay = () => {
        if (!selectedElement) return null;
        const bounds = getElementBounds(selectedElement);
        if (!bounds) return null;

        // In professional mode, padding is small or 0
        const padding = 0;

        return (
            <div
                style={{
                    position: 'absolute',
                    left: bounds.x - padding,
                    top: bounds.y - padding,
                    width: bounds.w + padding * 2,
                    height: bounds.h + padding * 2,
                    border: '1.5px solid #2563eb', // Thinner, sharper blue like tldraw
                    pointerEvents: 'none',
                    zIndex: 50,
                    transform: selectedElement.rotation ? `rotate(${selectedElement.rotation}rad)` : 'none',
                    transformOrigin: 'center center'
                }}
            >
                {/* Rotation Handle */}
                <div
                    style={{
                        position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)',
                        width: 12, height: 12, backgroundColor: '#ffffff', border: '1.5px solid #2563eb',
                        borderRadius: '50%', cursor: 'grab', pointerEvents: 'auto',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        setAppState(s => ({ ...s, resizing: 'rotate', actionStartPoint: getPointerPos(e) }));
                    }}
                />
                
                {/* Connecting line for rotation */}
                <div style={{
                    position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                    width: 1.5, height: 20, backgroundColor: '#2563eb'
                }} />

                {/* Resize Handles (only for rect, text, image) */}
                {['rectangle', 'image', 'text'].includes(selectedElement.type) && ['nw', 'ne', 'sw', 'se'].map(corner => (
                    <div key={corner}
                        style={{
                            position: 'absolute', width: 9, height: 9, backgroundColor: '#ffffff', border: '1.5px solid #2563eb',
                            top: corner.includes('n') ? -4.5 : 'auto', bottom: corner.includes('s') ? -4.5 : 'auto',
                            left: corner.includes('w') ? -4.5 : 'auto', right: corner.includes('e') ? -4.5 : 'auto',
                            cursor: `${corner}-resize`, pointerEvents: 'auto', borderRadius: '1px'
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            setAppState(s => ({ ...s, resizing: corner, actionStartPoint: getPointerPos(e) }));
                        }}
                    />
                ))}

                {/* Endpoint Handles for arrows/dimensions */}
                {['arrow', 'dimension'].includes(selectedElement.type) && (
                    <>
                        <div
                            style={{
                                position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1.5px solid #2563eb',
                                left: selectedElement.x - bounds.x + padding - 5,
                                top: selectedElement.y - bounds.y + padding - 5,
                                cursor: 'move', pointerEvents: 'auto', borderRadius: '50%'
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                setAppState(s => ({ ...s, resizing: 'start', actionStartPoint: getPointerPos(e) }));
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1.5px solid #2563eb',
                                left: selectedElement.endX - bounds.x + padding - 5,
                                top: selectedElement.endY - bounds.y + padding - 5,
                                cursor: 'move', pointerEvents: 'auto', borderRadius: '50%'
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                setAppState(s => ({ ...s, resizing: 'end', actionStartPoint: getPointerPos(e) }));
                            }}
                        />
                    </>
                )}
            </div>
        );
    }

    // Text Editor Overlay
    let textOverlay = null;
    if (appState.editingTextId) {
        const textEl = elements.find(e => e.id === appState.editingTextId);
        if (textEl) {
            const bounds = getElementBounds(textEl);
            textOverlay = (
                <input
                    autoFocus
                    type="text"
                    defaultValue={textEl.text || ''}
                    placeholder={textEl.type === 'dimension' ? 'E.g. 250 cm' : 'Skriv note...'}
                    style={{
                        position: 'absolute',
                        top: textEl.type === 'dimension' ? bounds.cy - 12 : textEl.y,
                        left: textEl.type === 'dimension' ? bounds.cx : textEl.x,
                        transform: textEl.type === 'dimension' ? `translate(-50%, 0) rotate(${textEl.rotation || 0}rad)` : `rotate(${textEl.rotation || 0}rad)`,
                        transformOrigin: textEl.type === 'dimension' ? 'center center' : 'top left',
                        color: textEl.color,
                        fontFamily: 'Inter, sans-serif',
                        fontSize: textEl.type === 'dimension' ? '16px' : '20px',
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.9)',
                        border: '2px solid #3b82f6',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        outline: 'none',
                        zIndex: 1000,
                        minWidth: '150px',
                        textAlign: textEl.type === 'dimension' ? 'center' : 'left'
                    }}
                    onBlur={(e) => {
                        const newText = e.target.value;
                        pushHistory(elements);
                        setElements(prev => prev.map(el => {
                            if (el.id !== appState.editingTextId) return el;
                            
                            // Measure text width for accurate selection box later
                            const canvas = canvasRef.current;
                            if (canvas && el.type === 'text') {
                                const ctx = canvas.getContext('2d');
                                ctx.font = '600 20px Inter, sans-serif';
                                const width = ctx.measureText(newText).width;
                                return { ...el, text: newText, w: Math.max(100, width + 10) };
                            }
                            return { ...el, text: newText };
                        }));
                        setAppState(s => ({ ...s, editingTextId: null }));
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur();
                    }}
                />
            );
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#f8fafc', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            
            {/* The Canvas Area */}
            <div 
                ref={containerRef} 
                style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <canvas ref={canvasRef} style={{ touchAction: 'none' }} />
                {selectionOverlay()}
                {textOverlay}
            </div>

            {/* 1. TOP BAR (Header) - ORIGINAL FLOATING STYLE */}
            <div style={{ 
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '8px 12px 8px 16px',
                borderRadius: '16px',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid rgba(255,255,255,0.4)',
                zIndex: 10000,
                width: 'auto',
                minWidth: '600px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={onClose}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px 12px', borderRadius: '10px', transition: 'all 0.2s', fontWeight: 600 }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        <ChevronLeft size={18} strokeWidth={2.5} />
                        <span>Tilbage</span>
                    </button>
                    
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>
                    
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input 
                            type="text" 
                            value={drawingName}
                            onChange={(e) => setDrawingName(e.target.value)}
                            placeholder="Navngiv din skitse..."
                            style={{
                                background: 'transparent',
                                border: '1px solid transparent',
                                color: '#0f172a',
                                fontSize: '1.15rem',
                                fontWeight: 700,
                                padding: '8px 36px 8px 12px',
                                borderRadius: '10px',
                                outline: 'none',
                                width: '300px',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.background = 'rgba(59, 130, 246, 0.05)'; e.target.style.color = '#2563eb'; }}
                            onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#0f172a'; }}
                        />
                        <div style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: '#94a3b8' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={handleMakeOfficial}
                        disabled={isSaving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                            backgroundColor: 'white', color: '#3b82f6', border: '1px solid #bfdbfe',
                            borderRadius: '8px', fontWeight: 500, fontSize: '14px',
                            transition: 'all 0.2s', opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'wait' : 'pointer'
                        }}
                        onMouseOver={(e) => { if (!isSaving) { e.currentTarget.style.background = '#f0f9ff'; } }}
                        onMouseOut={(e) => { if (!isSaving) { e.currentTarget.style.background = 'white'; } }}
                    >
                        <FileImage size={18} />
                        Gør Officiel
                    </button>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                        }}
                        onMouseOver={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.3)'; } }}
                        onMouseOut={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.2)'; } }}
                    >
                        <Save size={18} />
                        {isSaving ? 'Gemmer...' : 'Gem Skitse'}
                    </button>
                </div>
            </div>

            {/* 2. RIGHT PANEL (Colors & Undo) - TLDRAW CLONE */}
            <div style={{
                position: 'absolute', top: 80, right: 16, zIndex: 10000,
                backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)',
                borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', gap: '8px',
                border: '1px solid rgba(226, 232, 240, 0.9)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => setAppState(s => ({ ...s, color: c, tool: appState.tool === 'eraser' ? 'pen' : appState.tool }))}
                            style={{
                                width: 22, height: 22, borderRadius: '50%', backgroundColor: c, 
                                border: appState.color === c ? '2.5px solid #93c5fd' : '1px solid #e2e8f0',
                                transform: appState.color === c ? 'scale(1.15)' : 'scale(1)',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', 
                                outline: appState.color === c ? '2px solid transparent' : 'none'
                            }}
                            title="Vælg farve"
                        />
                    ))}
                </div>
                <div style={{ width: 16, height: 1, backgroundColor: '#e2e8f0' }} />
                
                {/* Stroke Width Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    {[2, 4, 8].map(w => (
                        <button
                            key={w}
                            onClick={() => setAppState(s => ({ ...s, strokeWidth: w }))}
                            style={{
                                width: 24, height: 24, borderRadius: '4px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: appState.strokeWidth === w ? '#eff6ff' : 'transparent',
                                border: appState.strokeWidth === w ? '1px solid #bfdbfe' : '1px solid transparent',
                                transition: 'all 0.2s'
                            }}
                            title={`Tykkelse ${w}`}
                        >
                            <div style={{ width: 16, height: w, backgroundColor: appState.color, borderRadius: '1px' }} />
                        </button>
                    ))}
                </div>

                <div style={{ width: 16, height: 1, backgroundColor: '#e2e8f0' }} />

                <button 
                    onClick={handleUndo} 
                    disabled={history.length === 0} 
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-95" 
                    title="Fortryd (Undo)"
                >
                    <Undo size={18} />
                </button>
            </div>

            {/* 3. BOTTOM TOOLBAR (Drawing Tools) - TLDRAW CLONE */}
            <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
                backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)',
                borderRadius: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.03)',
                display: 'flex', alignItems: 'center', padding: '6px', gap: '2px',
                border: '1px solid rgba(226, 232, 240, 0.9)'
            }}>
                {[
                    { id: 'select', icon: MousePointer2, title: 'Markør' },
                    { id: 'pen', icon: PenTool, title: 'Fritegning' },
                    { id: 'line', icon: Minus, title: 'Lige Streg' },
                    { id: 'rectangle', icon: Square, title: 'Firkant' },
                    { id: 'circle', icon: Circle, title: 'Cirkel' },
                    { id: 'arrow', icon: ArrowRight, title: 'Pil' },
                    { id: 'dimension', icon: Ruler, title: 'Målebånd' },
                    { id: 'text', icon: Type, title: 'Tekst' },
                    { id: 'eraser', icon: Eraser, title: 'Viskelæder' }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setAppState(s => ({ ...s, tool: t.id, selectedElementId: null }))}
                        className={`p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center
                            ${appState.tool === t.id 
                                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        style={{ width: '36px', height: '36px' }}
                        title={t.title}
                    >
                        <t.icon size={18} strokeWidth={appState.tool === t.id ? 2.5 : 2} />
                    </button>
                ))}
                
                <div style={{ width: 1, height: 24, backgroundColor: '#e2e8f0', margin: '0 6px' }} />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all duration-200 active:scale-95 flex items-center justify-center"
                    style={{ width: '36px', height: '36px' }}
                    title="Indsæt Baggrundsbillede"
                >
                    <ImagePlus size={18} />
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                    />
                </button>
            </div>
            
            {/* Bison Frame Watermark */}
            <div style={{
                position: 'absolute', bottom: 24, right: 24, zIndex: 10000, pointerEvents: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end', padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
                <span className="text-[0.7rem] font-semibold text-slate-400 tracking-wider">POWERED BY</span>
                <span className="text-sm font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">BISON FRAME ENGINE</span>
            </div>
        </div>
    );
};

export default DrawingBoard;
