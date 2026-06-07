import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { ChevronLeft, Save, ImagePlus, Type, Square, ArrowRight, Eraser, PenTool, MousePointer2, Undo, Ruler, FileImage, Minus, Circle, Shapes, Triangle, Hexagon, Diamond, Maximize2, Grid3X3 } from 'lucide-react';
import { getElementBounds, getElementAtPosition, rotatePoint, findSnapPoint, getConnectedModule } from './engineUtils';
import { getDrawingBounds, renderElementsToCanvas } from './renderUtils';

const COLORS = ['#0f172a', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];

const generateId = () => Math.random().toString(36).substr(2, 9);

const DrawingBoard = ({ drawingId, leadId, onClose }) => {
    const canvasRef = useRef(null);
    const lastPointerRef = useRef({ x: 0, y: 0 });
    const saveTimeoutRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageCache = useRef({});
    const viewInitializedRef = useRef(false);
    
    // DB state
    const [isLoading, setIsLoading] = useState(!!drawingId);
    const [isSaving, setIsSaving] = useState(false);
    const [drawingName, setDrawingName] = useState('Ny Skitse');
    
    // Engine State
    const [elements, setElements] = useState([]);
    const [history, setHistory] = useState([]); // Stack of previous states
    const [appState, setAppState] = useState({
        tool: 'select', // 'select', 'pen', 'eraser', 'rectangle', 'arrow', 'image', 'text', 'dimension'
        color: '#0f172a',
        strokeWidth: 3,
        selectedElementId: null,
        drillDown: false,
        editingTextId: null, // For text and dimension input
        dragging: false,
        rotating: false,
        resizing: false, // false or 'nw', 'ne', 'sw', 'se'
        actionStartPoint: null, 
        initialRotation: 0,
        zoom: 1,
        selectedElementIds: [],
        marqueeStartPoint: null,
        marqueeCurrentPoint: null,
        isSpaceDown: false,
        showGrid: false
    });
    const activeZoomRef = useRef(1);
    const activePanRef = useRef({ x: 0, y: 0 });
    const overlaysContainerRef = useRef(null);
    const activeElementsRef = useRef(elements);
    const activeModuleIdsRef = useRef([]);
    const selectionOverlayRef = useRef(null);
    const startHandleRef = useRef(null);
    const endHandleRef = useRef(null);
    const lastActionPointRef = useRef({ x: 0, y: 0 });
    const dragHistoryPushedRef = useRef(false);
    const [showShapesMenu, setShowShapesMenu] = useState(false);

    const getOverlayTransform = useCallback(() => {
        const zoom = activeZoomRef.current;
        const pan = activePanRef.current;
        return `matrix(${zoom}, 0, 0, ${zoom}, ${pan.x}, ${pan.y})`;
    }, []);

    const syncOverlayTransform = useCallback(() => {
        if (overlaysContainerRef.current) {
            overlaysContainerRef.current.style.transform = getOverlayTransform();
        }
    }, [getOverlayTransform]);

    const getViewportCenter = useCallback(() => {
        const container = containerRef.current;
        const width = container?.clientWidth || window.innerWidth;
        const height = container?.clientHeight || window.innerHeight;
        return {
            x: (width / 2 - activePanRef.current.x) / activeZoomRef.current,
            y: (height / 2 - activePanRef.current.y) / activeZoomRef.current
        };
    }, []);

    const constrainAngle = (origin, point) => {
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;
        const distance = Math.hypot(dx, dy);
        if (!distance) return point;
        const snap = Math.PI / 4;
        const angle = Math.atan2(dy, dx);
        const snappedAngle = Math.round(angle / snap) * snap;
        return {
            x: origin.x + Math.cos(snappedAngle) * distance,
            y: origin.y + Math.sin(snappedAngle) * distance
        };
    };

    // Save to history before modifying
    const pushHistory = useCallback((newElements) => {
        setHistory(prev => [...prev, newElements]);
    }, []);

    const handleUndo = () => {
        if (history.length === 0) return;
        const previousState = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        activeElementsRef.current = previousState;
        setElements(previousState);
        setAppState(s => ({ ...s, selectedElementId: null, selectedElementIds: [], editingTextId: null }));
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !appState.editingTextId) {
                e.preventDefault();
                if (history.length === 0) return;
                const previousState = history[history.length - 1];
                setHistory(prev => prev.slice(0, -1));
                activeElementsRef.current = previousState;
                setElements(previousState);
                setAppState(s => ({ ...s, selectedElementId: null, selectedElementIds: [], editingTextId: null }));
                return;
            }
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                setAppState(s => ({ ...s, isSpaceDown: true }));
            }
            if ((e.key === 'Backspace' || e.key === 'Delete') && !appState.editingTextId) {
                if (appState.selectedElementId) {
                    pushHistory(elements);
                    setElements(prev => prev.filter(el => el.id !== appState.selectedElementId));
                    setAppState(s => ({ ...s, selectedElementId: null }));
                } else if (appState.selectedElementIds && appState.selectedElementIds.length > 0) {
                    pushHistory(elements);
                    setElements(prev => prev.filter(el => !appState.selectedElementIds.includes(el.id)));
                    setAppState(s => ({ ...s, selectedElementIds: [] }));
                }
            }
        };
        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                setAppState(s => ({ ...s, isSpaceDown: false }));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [appState.selectedElementId, appState.selectedElementIds, appState.editingTextId, elements, history, pushHistory]);

    // Rendering Engine
    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Reset transform to clear the whole canvas
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const dpr = window.devicePixelRatio || 1;
        const cssWidth = canvas.width / dpr;
        const cssHeight = canvas.height / dpr;
        const zoom = activeZoomRef.current;
        const pan = activePanRef.current;

        // Map drawing-space coordinates to CSS pixels, then to backing-store pixels.
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * pan.x, dpr * pan.y);

        if (appState.showGrid) {
            drawGrid(ctx, cssWidth, cssHeight);
        }
        
        const elementsToDraw = activeElementsRef.current || elements;
        elementsToDraw.forEach(el => {
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
            } else if (el.type === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(el.x + el.w/2, el.y);
                ctx.lineTo(el.x + el.w, el.y + el.h);
                ctx.lineTo(el.x, el.y + el.h);
                ctx.closePath();
                ctx.stroke();
            } else if (el.type === 'polygon') {
                const cx = el.x + el.w/2;
                const cy = el.y + el.h/2;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3 - Math.PI / 2;
                    ctx.lineTo(cx + (el.w/2) * Math.cos(angle), cy + (el.h/2) * Math.sin(angle));
                }
                ctx.closePath();
                ctx.stroke();
            } else if (el.type === 'rhombus') {
                ctx.beginPath();
                ctx.moveTo(el.x + el.w/2, el.y);
                ctx.lineTo(el.x + el.w, el.y + el.h/2);
                ctx.lineTo(el.x + el.w/2, el.y + el.h);
                ctx.lineTo(el.x, el.y + el.h/2);
                ctx.closePath();
                ctx.stroke();
            } else if (el.type === 'parallelogram') {
                const skew = el.w * 0.2;
                ctx.beginPath();
                ctx.moveTo(el.x + skew, el.y);
                ctx.lineTo(el.x + el.w, el.y);
                ctx.lineTo(el.x + el.w - skew, el.y + el.h);
                ctx.lineTo(el.x, el.y + el.h);
                ctx.closePath();
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
    }, [appState.editingTextId, appState.showGrid]); // Element changes redraw through activeElementsRef.

    const fitDrawingToView = useCallback((sourceElements = activeElementsRef.current) => {
        const container = containerRef.current;
        if (!container) return;

        const bounds = getDrawingBounds(sourceElements);
        if (!bounds) {
            activeZoomRef.current = 1;
            activePanRef.current = { x: 0, y: 0 };
            setAppState(s => ({ ...s, zoom: 1 }));
            syncOverlayTransform();
            redraw();
            return;
        }

        const padding = 96;
        const viewW = Math.max(1, container.clientWidth);
        const viewH = Math.max(1, container.clientHeight);
        const availableW = Math.max(1, viewW - padding * 2);
        const availableH = Math.max(1, viewH - padding * 2);
        const nextZoom = Math.min(Math.max(Math.min(availableW / bounds.w, availableH / bounds.h), 0.1), 6);
        const nextPan = {
            x: viewW / 2 - bounds.cx * nextZoom,
            y: viewH / 2 - bounds.cy * nextZoom
        };

        activeZoomRef.current = nextZoom;
        activePanRef.current = nextPan;
        setAppState(s => ({ ...s, zoom: nextZoom }));
        syncOverlayTransform();
        redraw();
    }, [redraw, syncOverlayTransform]);

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
                
                redraw();
            }
        };

        window.addEventListener('resize', resizeCanvas);
        setTimeout(resizeCanvas, 100);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [redraw]);

    // Draw on elements change
    useEffect(() => {
        activeElementsRef.current = elements;
        redraw();
    }, [elements, redraw]);

    useEffect(() => {
        redraw();
    }, [appState.editingTextId, appState.showGrid, redraw]);

    useEffect(() => {
        viewInitializedRef.current = false;
    }, [drawingId]);

    useEffect(() => {
        if (isLoading || viewInitializedRef.current) return;
        viewInitializedRef.current = true;
        requestAnimationFrame(() => fitDrawingToView(activeElementsRef.current));
    }, [elements, fitDrawingToView, isLoading]);

    // Load Data
    useEffect(() => {
        if (!drawingId || drawingId === 'new') {
            setIsLoading(false);
            const localStr = localStorage.getItem('autosave_drawing_new');
            if (localStr) {
                try {
                    const localData = JSON.parse(localStr);
                    if (localData.elements && localData.elements.length > 0) {
                        setElements(localData.elements);
                        setDrawingName(localData.name || 'Ny Skitse');
                        toast.success('Gendannede kladde!');
                    }
                } catch(e) {}
            }
            return;
        }

        const loadDrawing = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase.from('drawings').select('*').eq('id', drawingId).single();
                if (error) throw error;
                if (data) {
                    let finalElements = data.document_data && Array.isArray(data.document_data) ? data.document_data : [];
                    let finalName = data.name || 'Ny Skitse';
                    
                    // Check local autosave
                    const localStr = localStorage.getItem(`autosave_drawing_${drawingId}`);
                    if (localStr) {
                        try {
                            const localData = JSON.parse(localStr);
                            const dbTime = new Date(data.updated_at || 0).getTime();
                            if (localData.timestamp > dbTime) {
                                finalElements = localData.elements;
                                finalName = localData.name;
                                toast.success('Gendannede ændringer der ikke var gemt!');
                            }
                        } catch(e) {}
                    }
                    
                    setElements(finalElements);
                    setDrawingName(finalName);
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

    // LocalStorage Autosave (Debounced to prevent lag)
    useEffect(() => {
        if (!isLoading) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                const saveKey = `autosave_drawing_${drawingId || 'new'}`;
                localStorage.setItem(saveKey, JSON.stringify({
                    timestamp: Date.now(),
                    elements,
                    name: drawingName
                }));
            }, 1000);
        }
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [elements, drawingName, drawingId, isLoading]);

    // Interaction Helpers
    const getPointerPos = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const unscaledX = clientX - rect.left;
        const unscaledY = clientY - rect.top;
        return { 
            x: (unscaledX - activePanRef.current.x) / activeZoomRef.current, 
            y: (unscaledY - activePanRef.current.y) / activeZoomRef.current 
        };
    };

    // Pointer Events
    const handlePointerDown = (e) => {
        if (e.button === 1 || e.button === 2 || appState.isSpaceDown) {
            lastPointerRef.current = { x: e.clientX || (e.touches && e.touches[0].clientX) || 0, y: e.clientY || (e.touches && e.touches[0].clientY) || 0 };
            setAppState(s => ({ ...s, panning: true }));
            return;
        }
        const pos = getPointerPos(e);
        lastActionPointRef.current = pos;
        dragHistoryPushedRef.current = false;
        
        if (appState.tool === 'select') {
            const clickedElement = getElementAtPosition(pos.x, pos.y, activeElementsRef.current);
            if (clickedElement) {
                if (clickedElement.id === appState.selectedElementId && (clickedElement.type === 'text' || clickedElement.type === 'dimension')) {
                    setAppState(s => ({ ...s, editingTextId: clickedElement.id }));
                } else {
                    let moduleIds = [clickedElement.id];
                    if (!appState.drillDown) {
                        const moduleRootId = clickedElement.parentId || clickedElement.id;
                        moduleIds = getConnectedModule(moduleRootId, activeElementsRef.current);
                        if (!moduleIds.includes(clickedElement.id)) moduleIds.push(clickedElement.id);
                    }
                    activeModuleIdsRef.current = moduleIds;

                    setAppState(s => ({ 
                        ...s, 
                        selectedElementId: clickedElement.id, 
                        dragging: true, 
                        actionStartPoint: pos,
                        editingTextId: null
                    }));
                }
            } else {
                setAppState(s => ({ 
                    ...s, 
                    selectedElementId: null, 
                    selectedElementIds: [],
                    editingTextId: null, 
                    marqueeStartPoint: pos,
                    marqueeCurrentPoint: pos
                }));
            }
        } 
        else if (appState.tool === 'eraser') {
            const clickedElement = getElementAtPosition(pos.x, pos.y, activeElementsRef.current);
            if (clickedElement) {
                pushHistory(elements);
                const updatedElements = activeElementsRef.current.filter(el => el.id !== clickedElement.id);
                activeElementsRef.current = updatedElements;
                setElements(updatedElements);
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
            } else if (['rectangle', 'text', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool)) {
                newElement.x = pos.x;
                newElement.y = pos.y;
                newElement.w = appState.tool === 'text' ? 100 : 100;
                newElement.h = appState.tool === 'text' ? 30 : 100;
                newElement.text = '';
            } else if (appState.tool === 'arrow' || appState.tool === 'dimension' || appState.tool === 'line') {
                newElement.x = pos.x;
                newElement.y = pos.y;
                newElement.endX = pos.x;
                newElement.endY = pos.y;
                newElement.text = '';
            }

            const updatedElements = [...activeElementsRef.current, newElement];
            activeElementsRef.current = updatedElements;
            setElements(updatedElements);
            setAppState(s => ({ 
                ...s, 
                selectedElementId: newElement.id, 
                dragging: true, 
                actionStartPoint: pos,
                editingTextId: appState.tool === 'text' ? newElement.id : null
            }));
            
            // Calculate module IDs ONCE when drag starts
            let moduleIds = [newElement.id];
            if (!appState.drillDown) {
                moduleIds = getConnectedModule(newElement.id, elements);
            }
            activeModuleIdsRef.current = moduleIds;
            return;
        }
    };

    const handlePointerMove = (e) => {
        if (appState.panning) {
            const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            const dx = currentX - lastPointerRef.current.x;
            const dy = currentY - lastPointerRef.current.y;
            
            activePanRef.current = { x: activePanRef.current.x + dx, y: activePanRef.current.y + dy };
            lastPointerRef.current = { x: currentX, y: currentY };
            
            syncOverlayTransform();
            
            redraw();
            return;
        }
        
        if (appState.marqueeStartPoint) {
            setAppState(s => ({ ...s, marqueeCurrentPoint: getPointerPos(e) }));
            return;
        }

        if (!appState.dragging && !appState.rotating && !appState.resizing) return;
        const pos = getPointerPos(e);

        if (appState.resizing && appState.selectedElementId) {
            activeElementsRef.current = activeElementsRef.current.map(el => {
                if (el.id !== appState.selectedElementId) return el;
                const bounds = getElementBounds(el);
                let localPos = pos;
                if (el.rotation) localPos = rotatePoint(pos, {x: bounds.cx, y: bounds.cy}, -el.rotation);

                if (el.type === 'rectangle' || el.type === 'image' || el.type === 'text' || el.type === 'circle' || el.type === 'triangle' || el.type === 'polygon' || el.type === 'rhombus' || el.type === 'parallelogram') {
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
                        const nextPos = e.shiftKey ? constrainAngle({ x: el.endX, y: el.endY }, localPos) : localPos;
                        return { ...el, x: nextPos.x, y: nextPos.y };
                    }
                    if (appState.resizing === 'end') {
                        const nextPos = e.shiftKey ? constrainAngle({ x: el.x, y: el.y }, localPos) : localPos;
                        return { ...el, endX: nextPos.x, endY: nextPos.y };
                    }
                }
                
                return el;
            });
            
            // Sync single overlay box if present
            if (selectionOverlayRef.current) {
                const el = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
                if (el) {
                    const bounds = getElementBounds(el);
                    const endpointHandleSize = 10 / (activeZoomRef.current || 1);
                    selectionOverlayRef.current.style.left = `${bounds.x}px`;
                    selectionOverlayRef.current.style.top = `${bounds.y}px`;
                    selectionOverlayRef.current.style.width = `${bounds.w}px`;
                    selectionOverlayRef.current.style.height = `${bounds.h}px`;
                    
                    if (startHandleRef.current) {
                        startHandleRef.current.style.left = `${el.x - bounds.x - endpointHandleSize / 2}px`;
                        startHandleRef.current.style.top = `${el.y - bounds.y - endpointHandleSize / 2}px`;
                    }
                    if (endHandleRef.current) {
                        endHandleRef.current.style.left = `${el.endX - bounds.x - endpointHandleSize / 2}px`;
                        endHandleRef.current.style.top = `${el.endY - bounds.y - endpointHandleSize / 2}px`;
                    }
                }
            }
            redraw();
            return;
        }

        if (appState.rotating && appState.selectedElementId) {
            const el = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
            if (!el) return;
            const bounds = getElementBounds(el);
            const angle = Math.atan2(pos.y - bounds.cy, pos.x - bounds.cx);
            const rotation = angle + Math.PI / 2;
            
            activeElementsRef.current = activeElementsRef.current.map(e => e.id === appState.selectedElementId ? { ...e, rotation } : e);
            redraw();
            return;
        }

        if (appState.dragging && (appState.selectedElementId || (appState.selectedElementIds && appState.selectedElementIds.length > 0))) {
            const dx = pos.x - lastActionPointRef.current.x;
            const dy = pos.y - lastActionPointRef.current.y;

            if (appState.tool === 'select' && !dragHistoryPushedRef.current && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
                pushHistory(activeElementsRef.current);
                dragHistoryPushedRef.current = true;
            }

            let moduleIds = appState.selectedElementId ? activeModuleIdsRef.current : appState.selectedElementIds;

            activeElementsRef.current = activeElementsRef.current.map(el => {
                const isMoving = moduleIds.includes(el.id) || moduleIds.includes(el.parentId);
                if (!isMoving) return el;

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
                else if (['rectangle', 'circle', 'image', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool)) {
                    const snap = findSnapPoint(pos, activeElementsRef.current, el.id);
                    const endPos = snap || pos;
                    let w = endPos.x - el.x;
                    let h = endPos.y - el.y;
                    if (e.shiftKey && appState.tool !== 'image') {
                        const size = Math.max(Math.abs(w), Math.abs(h));
                        w = Math.sign(w || 1) * size;
                        h = Math.sign(h || 1) * size;
                    }
                    return { ...el, w, h };
                }
                else if (['arrow', 'dimension', 'line'].includes(appState.tool)) {
                    const snap = findSnapPoint(pos, activeElementsRef.current, el.id);
                    const rawEndPos = snap || pos;
                    const endPos = e.shiftKey ? constrainAngle({ x: el.x, y: el.y }, rawEndPos) : rawEndPos;
                    return { ...el, endX: endPos.x, endY: endPos.y };
                }
                return el;
            });

            // Sync overlays directly via DOM during drag to avoid React render
            if (appState.selectedElementId && selectionOverlayRef.current) {
                    const el = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
                if (el) {
                    const bounds = getElementBounds(el);
                    const endpointHandleSize = 10 / (activeZoomRef.current || 1);
                    selectionOverlayRef.current.style.left = `${bounds.x}px`;
                    selectionOverlayRef.current.style.top = `${bounds.y}px`;
                    selectionOverlayRef.current.style.width = `${bounds.w}px`;
                    selectionOverlayRef.current.style.height = `${bounds.h}px`;
                    
                    if (startHandleRef.current) {
                        startHandleRef.current.style.left = `${el.x - bounds.x - endpointHandleSize / 2}px`;
                        startHandleRef.current.style.top = `${el.y - bounds.y - endpointHandleSize / 2}px`;
                    }
                    if (endHandleRef.current) {
                        endHandleRef.current.style.left = `${el.endX - bounds.x - endpointHandleSize / 2}px`;
                        endHandleRef.current.style.top = `${el.endY - bounds.y - endpointHandleSize / 2}px`;
                    }
                }
            } else if (appState.selectedElementIds && appState.selectedElementIds.length > 0) {
                appState.selectedElementIds.forEach(id => {
                    const el = activeElementsRef.current.find(e => e.id === id);
                    if (!el) return;
                    const bounds = getElementBounds(el);
                    const elNode = document.getElementById('multi-select-' + el.id);
                    if (elNode) {
                        elNode.style.left = `${bounds.x}px`;
                        elNode.style.top = `${bounds.y}px`;
                    }
                });
            }

            redraw();
            lastActionPointRef.current = pos;
        }
    };

    const handlePointerUp = () => {
        if (appState.panning) {
            setAppState(s => ({ ...s, panning: false, pan: { ...activePanRef.current } }));
        }

        if (appState.marqueeStartPoint && appState.marqueeCurrentPoint) {
            const x1 = Math.min(appState.marqueeStartPoint.x, appState.marqueeCurrentPoint.x);
            const y1 = Math.min(appState.marqueeStartPoint.y, appState.marqueeCurrentPoint.y);
            const x2 = Math.max(appState.marqueeStartPoint.x, appState.marqueeCurrentPoint.x);
            const y2 = Math.max(appState.marqueeStartPoint.y, appState.marqueeCurrentPoint.y);
            
            // Allow clicking empty space to deselect without tiny marquee box
            if (x2 - x1 < 5 && y2 - y1 < 5) {
                setAppState(s => ({ ...s, marqueeStartPoint: null, marqueeCurrentPoint: null, selectedElementId: null, selectedElementIds: [] }));
                return;
            }

            const selectedIds = [];
            activeElementsRef.current.forEach(el => {
                const bounds = getElementBounds(el);
                if (!bounds) return;
                // Simple intersection: if center is inside the marquee
                if (bounds.cx >= x1 && bounds.cx <= x2 && bounds.cy >= y1 && bounds.cy <= y2) {
                    selectedIds.push(el.id);
                }
            });

            if (selectedIds.length === 1) {
                setAppState(s => ({ ...s, selectedElementId: selectedIds[0], selectedElementIds: [], marqueeStartPoint: null, marqueeCurrentPoint: null }));
            } else if (selectedIds.length > 1) {
                setAppState(s => ({ ...s, selectedElementId: null, selectedElementIds: selectedIds, marqueeStartPoint: null, marqueeCurrentPoint: null }));
            } else {
                setAppState(s => ({ ...s, marqueeStartPoint: null, marqueeCurrentPoint: null, selectedElementId: null, selectedElementIds: [] }));
            }
            return;
        }

        if (appState.dragging || appState.rotating || appState.resizing) {
            setAppState(s => ({ ...s, dragging: false, rotating: false, resizing: false }));
            
            // SYNCHRONIZE BYPASS TO REACT STATE
            setElements(activeElementsRef.current);
            
            const activeEl = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
            if (activeEl && appState.tool !== 'select') {
                // If drawing a rect/arrow that is tiny, remove it
                if (['rectangle', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(activeEl.type) && Math.abs(activeEl.w) < 5 && Math.abs(activeEl.h) < 5) {
                    const filtered = activeElementsRef.current.filter(e => e.id !== activeEl.id);
                    activeElementsRef.current = filtered;
                    setElements(filtered);
                }
                else if ((activeEl.type === 'arrow' || activeEl.type === 'dimension' || activeEl.type === 'line') && Math.abs(activeEl.endX - activeEl.x) < 5 && Math.abs(activeEl.endY - activeEl.y) < 5) {
                    const filtered = activeElementsRef.current.filter(e => e.id !== activeEl.id);
                    activeElementsRef.current = filtered;
                    setElements(filtered);
                }
                else if (activeEl.type === 'text' || activeEl.type === 'dimension') {
                    // Auto-focus text editing
                    setAppState(s => ({ ...s, editingTextId: activeEl.id }));
                }
            }
            
            // Automatically switch back to select after drawing a shape/line
            if (appState.tool !== 'select' && appState.tool !== 'eraser') {
                setAppState(s => ({ ...s, tool: 'select' }));
            }
        }
    };

    // Save Logic
    const handleSave = async () => {
        // Remove the early return if leadId is null, since generic drawings can have null leadId
        setIsSaving(true);
        const tid = toast.loading('Gemmer skitse...');
        try {
            // 1. Generate Thumbnail Blob (small JPEG)
            let thumbUrl = null;
            if (activeElementsRef.current.length > 0) {
                try {
                    const { canvas: thumbCanvas } = await renderElementsToCanvas(activeElementsRef.current, {
                        width: 1200,
                        height: 800,
                        padding: 60,
                        imageCache: imageCache.current
                    });
                    const blob = await new Promise(resolve => thumbCanvas.toBlob(resolve, 'image/jpeg', 0.86));
                    const fileName = `thumb_${drawingId || 'new'}_${Date.now()}.jpg`;

                    const { error: uploadError } = await supabase.storage
                        .from('uploads')
                        .upload(`drawings_thumbnails/${fileName}`, blob, { contentType: 'image/jpeg' });
                        
                    if (!uploadError) {
                        const { data: urlData } = supabase.storage
                            .from('uploads')
                            .getPublicUrl(`drawings_thumbnails/${fileName}`);
                        thumbUrl = urlData.publicUrl;
                    }
                } catch (thumbErr) {
                    console.error("Kunne ikke generere thumbnail:", thumbErr);
                }
            }

            // 2. Save to Database
            if (drawingId && drawingId !== 'new') {
                const updatePayload = { 
                    document_data: activeElementsRef.current, 
                    name: drawingName,
                    updated_at: new Date().toISOString()
                };
                if (thumbUrl) updatePayload.image_url = thumbUrl;
                
                const { error } = await supabase
                    .from('drawings')
                    .update(updatePayload)
                    .eq('id', drawingId);
                if (error) throw error;
                localStorage.removeItem(`autosave_drawing_${drawingId}`);
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                
                const payload = {
                    name: drawingName,
                    document_data: activeElementsRef.current,
                    user_id: user?.id
                };
                if (thumbUrl) payload.image_url = thumbUrl;
                
                if (leadId) {
                    payload.lead_id = leadId;
                }

                const { error } = await supabase
                    .from('drawings')
                    .insert([payload]);
                if (error) throw error;
                localStorage.removeItem('autosave_drawing_new');
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
        const zoom = activeZoomRef.current;
        const pan = activePanRef.current;
        const startX = Math.floor((-pan.x / zoom) / gridSize) * gridSize;
        const startY = Math.floor((-pan.y / zoom) / gridSize) * gridSize;
        const endX = ((width - pan.x) / zoom) + gridSize;
        const endY = ((height - pan.y) / zoom) + gridSize;

        for (let x = startX; x < endX; x += gridSize) {
            for (let y = startY; y < endY; y += gridSize) {
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
            const { canvas: exportCanvas } = await renderElementsToCanvas(activeElementsRef.current, {
                width: 2480,
                height: 1754,
                padding: 140,
                imageCache: imageCache.current
            });
            const blob = await new Promise(resolve => exportCanvas.toBlob(resolve, 'image/png'));
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
                const center = getViewportCenter();
                const w = img.width > 600 ? 600 : img.width;
                const h = img.width > 600 ? (img.height * (600 / img.width)) : img.height;
                // Insert at the beginning so it's drawn behind other elements
                const newElement = {
                    id: generateId(),
                    type: 'image',
                    x: center.x - w / 2,
                    y: center.y - h / 2,
                    w,
                    h,
                    rotation: 0,
                    dataUrl: event.target.result
                };
                const updatedElements = [newElement, ...activeElementsRef.current];
                activeElementsRef.current = updatedElements;
                setElements(updatedElements);
                setAppState(s => ({ ...s, tool: 'select', selectedElementId: newElement.id, selectedElementIds: [] }));
                e.target.value = '';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Selected Element Overlay
    const selectionOverlay = () => {
        if (appState.tool !== 'select') return null;
        
        const overlays = [];
        const padding = 0;
        const zoom = activeZoomRef.current || 1;
        const selectionBorderWidth = 1.5 / zoom;
        const shapeHandleSize = 9 / zoom;
        const endpointHandleSize = 10 / zoom;

        // 1. Single selection (with resize/rotate handles)
        const selectedElement = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
        if (selectedElement) {
            const bounds = getElementBounds(selectedElement);
            if (bounds) {
                overlays.push(
                    <div
                        key={'single-' + selectedElement.id}
                        ref={selectionOverlayRef}
                style={{
                    position: 'absolute',
                    left: bounds.x - padding,
                    top: bounds.y - padding,
                    width: bounds.w + padding * 2,
                    height: bounds.h + padding * 2,
                    border: `${selectionBorderWidth}px solid #2563eb`, // Thinner, sharper blue like tldraw
                    pointerEvents: 'none',
                    zIndex: 50,
                }}
            >
                {/* Rotation Handle */}
                <div
                    style={{
                        position: 'absolute', top: -32 / zoom, left: '50%', transform: 'translateX(-50%)',
                        width: 12 / zoom, height: 12 / zoom, backgroundColor: '#ffffff', border: `${selectionBorderWidth}px solid #2563eb`,
                        borderRadius: '50%', cursor: 'grab', pointerEvents: 'auto',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        pushHistory(activeElementsRef.current);
                        setAppState(s => ({ ...s, rotating: true, resizing: false, actionStartPoint: getPointerPos(e) }));
                    }}
                />
                
                {/* Connecting line for rotation */}
                <div style={{
                    position: 'absolute', top: -20 / zoom, left: '50%', transform: 'translateX(-50%)',
                    width: 1.5 / zoom, height: 20 / zoom, backgroundColor: '#2563eb'
                }} />

                {/* Resize Handles (for all shapes, image, text) */}
                {['rectangle', 'image', 'text', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(selectedElement.type) && ['nw', 'ne', 'sw', 'se'].map(corner => (
                    <div key={corner}
                        style={{
                            position: 'absolute', width: shapeHandleSize, height: shapeHandleSize, backgroundColor: '#ffffff', border: `${selectionBorderWidth}px solid #2563eb`,
                            top: corner.includes('n') ? -shapeHandleSize / 2 : 'auto', bottom: corner.includes('s') ? -shapeHandleSize / 2 : 'auto',
                            left: corner.includes('w') ? -shapeHandleSize / 2 : 'auto', right: corner.includes('e') ? -shapeHandleSize / 2 : 'auto',
                            cursor: `${corner}-resize`, pointerEvents: 'auto', borderRadius: '1px'
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            pushHistory(activeElementsRef.current);
                            setAppState(s => ({ ...s, resizing: corner, actionStartPoint: getPointerPos(e) }));
                        }}
                    />
                ))}

                {/* Endpoint Handles for arrows/dimensions/lines */}
                {['arrow', 'dimension', 'line'].includes(selectedElement.type) && (
                    <>
                        <div
                            ref={startHandleRef}
                            style={{
                                position: 'absolute', width: endpointHandleSize, height: endpointHandleSize, backgroundColor: '#ffffff', border: `${selectionBorderWidth}px solid #2563eb`,
                                left: selectedElement.x - bounds.x + padding - endpointHandleSize / 2,
                                top: selectedElement.y - bounds.y + padding - endpointHandleSize / 2,
                                cursor: 'move', pointerEvents: 'auto', borderRadius: '50%'
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                pushHistory(activeElementsRef.current);
                                setAppState(s => ({ ...s, resizing: 'start', actionStartPoint: getPointerPos(e) }));
                            }}
                        />
                        <div
                            ref={endHandleRef}
                            style={{
                                position: 'absolute', width: endpointHandleSize, height: endpointHandleSize, backgroundColor: '#ffffff', border: `${selectionBorderWidth}px solid #2563eb`,
                                left: selectedElement.endX - bounds.x + padding - endpointHandleSize / 2,
                                top: selectedElement.endY - bounds.y + padding - endpointHandleSize / 2,
                                cursor: 'move', pointerEvents: 'auto', borderRadius: '50%'
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                pushHistory(activeElementsRef.current);
                                setAppState(s => ({ ...s, resizing: 'end', actionStartPoint: getPointerPos(e) }));
                            }}
                        />
                    </>
                )}
            </div>
                );
            }
        }

        // 2. Multiple selection (just blue borders, no handles)
        if (appState.selectedElementIds && appState.selectedElementIds.length > 0) {
            appState.selectedElementIds.forEach(id => {
                const el = activeElementsRef.current.find(e => e.id === id);
                if (!el) return;
                const bounds = getElementBounds(el);
                if (!bounds) return;
                overlays.push(
                    <div
                        id={'multi-select-' + el.id}
                        key={'multi-' + el.id}
                        style={{
                            position: 'absolute',
                            left: bounds.x - padding,
                            top: bounds.y - padding,
                            width: bounds.w + padding * 2,
                            height: bounds.h + padding * 2,
                            border: `${selectionBorderWidth}px solid #2563eb`, // Thinner, sharper blue like tldraw
                            pointerEvents: 'none',
                            zIndex: 50,
                        }}
                    />
                );
            });
        }

        return <>{overlays}</>;
    }

    // Marquee Selection Box
    const renderMarquee = () => {
        if (!appState.marqueeStartPoint || !appState.marqueeCurrentPoint) return null;
        const x1 = Math.min(appState.marqueeStartPoint.x, appState.marqueeCurrentPoint.x);
        const y1 = Math.min(appState.marqueeStartPoint.y, appState.marqueeCurrentPoint.y);
        const x2 = Math.max(appState.marqueeStartPoint.x, appState.marqueeCurrentPoint.x);
        const y2 = Math.max(appState.marqueeStartPoint.y, appState.marqueeCurrentPoint.y);
        
        return (
            <div style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: x2 - x1,
                height: y2 - y1,
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                border: `${1 / (activeZoomRef.current || 1)}px solid rgba(37, 99, 235, 0.5)`,
                pointerEvents: 'none',
                zIndex: 60
            }} />
        );
    };

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
                        textAlign: textEl.type === 'dimension' ? 'center' : 'left',
                        pointerEvents: 'auto'
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                        const newText = e.target.value;
                        pushHistory(elements);
                        
                        const updatedElements = activeElementsRef.current.map(el => {
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
                        });
                        
                        activeElementsRef.current = updatedElements;
                        setElements(updatedElements);
                        setAppState(s => ({ ...s, editingTextId: null }));
                        requestAnimationFrame(() => redraw());
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur();
                    }}
                />
            );
        }
    }

    const handleWheel = (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = containerRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldBeforeZoom = getPointerPos(e);
        const newZoom = Math.min(Math.max(activeZoomRef.current * zoomDelta, 0.1), 10);
        activeZoomRef.current = newZoom;
        activePanRef.current = {
            x: screenX - worldBeforeZoom.x * newZoom,
            y: screenY - worldBeforeZoom.y * newZoom
        };
        setAppState(s => ({ ...s, zoom: newZoom }));
        syncOverlayTransform();
        redraw();
    };

    const handleDoubleClick = (e) => {
        const pos = getPointerPos(e);
        const clickedElement = getElementAtPosition(pos.x, pos.y, activeElementsRef.current);
        if (clickedElement) {
            if (clickedElement.type === 'text') {
                setAppState(s => ({ ...s, editingTextId: clickedElement.id }));
                return;
            }
            if (['line', 'arrow', 'dimension', 'rectangle', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(clickedElement.type)) {
                const textId = generateId();
                pushHistory(elements);
                
                const newElement = {
                    id: textId,
                    type: 'text',
                    parentId: clickedElement.id, // For linked moving!
                    text: '',
                    color: appState.color,
                    x: pos.x,
                    y: pos.y - 25, // Offset 25px!
                    w: 100,
                    h: 30
                };
                
                const updatedElements = [...activeElementsRef.current, newElement];
                activeElementsRef.current = updatedElements;
                setElements(updatedElements);
                setAppState(s => ({ ...s, editingTextId: textId }));
            }
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#f8fafc', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            
            <div 
                ref={containerRef}
                style={{ position: 'fixed', inset: 0, overflow: 'hidden', cursor: appState.tool === 'select' ? 'default' : 'crosshair', backgroundColor: '#f8fafc', touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onDoubleClick={handleDoubleClick}
                onWheel={handleWheel}
            >
                <canvas
                    ref={canvasRef}
                    style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
                />
                <div
                    ref={overlaysContainerRef}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        transform: getOverlayTransform(),
                        transformOrigin: '0 0',
                        pointerEvents: 'none'
                    }}
                >
                    {selectionOverlay()}
                    {renderMarquee()}
                    {textOverlay}
                </div>
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
                    onClick={() => fitDrawingToView()}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                    title="Vis hele tegningen"
                >
                    <Maximize2 size={18} />
                </button>

                <button
                    onClick={() => setAppState(s => ({ ...s, showGrid: !s.showGrid }))}
                    className={`p-1.5 rounded-lg transition-all active:scale-95 ${appState.showGrid ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}
                    title={appState.showGrid ? 'Skjul hjælpegrid' : 'Vis hjælpegrid'}
                >
                    <Grid3X3 size={18} />
                </button>

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
                    { id: 'arrow', icon: ArrowRight, title: 'Pil' }
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

                {/* Shapes Menu Toggle */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowShapesMenu(!showShapesMenu)}
                        className={`p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center
                            ${['rectangle', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool) 
                                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        style={{ width: '36px', height: '36px' }}
                        title="Figurer"
                    >
                        <Shapes size={18} strokeWidth={['rectangle', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool) ? 2.5 : 2} />
                    </button>
                    {showShapesMenu && (
                        <div style={{
                            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px',
                            backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(226, 232, 240, 1)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px'
                        }}>
                            {[
                                { id: 'rectangle', icon: Square, title: 'Firkant' },
                                { id: 'circle', icon: Circle, title: 'Cirkel' },
                                { id: 'triangle', icon: Triangle, title: 'Trekant' },
                                { id: 'polygon', icon: Hexagon, title: 'Polygon' },
                                { id: 'rhombus', icon: Diamond, title: 'Rombe' },
                                { id: 'parallelogram', icon: Square, title: 'Parallelogram' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setAppState(s => ({ ...s, tool: t.id, selectedElementId: null }));
                                        setShowShapesMenu(false);
                                    }}
                                    className={`p-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center
                                        ${appState.tool === t.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                                    style={{ width: '32px', height: '32px' }}
                                    title={t.title}
                                >
                                    <t.icon size={16} strokeWidth={2} style={t.id === 'parallelogram' ? { transform: 'skewX(-20deg)' } : {}} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {[
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
