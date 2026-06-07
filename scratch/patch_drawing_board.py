import re

with open('src/components/Drawings/DrawingBoard.jsx', 'r') as f:
    code = f.read()

# 1. Add refs and useLayoutEffects
refs_block = """    const imageCache = useRef({});
    const rafRef = useRef(null);
    const actionStartRef = useRef({ x: 0, y: 0 });
    const panStartRef = useRef({ x: 0, y: 0 });
    
    // Engine State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [elements, setElements] = useState([]);
    
    const activePanRef = useRef({ x: 0, y: 0 });
    const activeElementsRef = useRef([]);

    useLayoutEffect(() => {
        activePanRef.current = pan;
    }, [pan]);

    useLayoutEffect(() => {
        activeElementsRef.current = elements;
    }, [elements]);

    const updateSelectionOverlayDOM = useCallback(() => {
        const overlay = document.getElementById('selection-overlay');
        if (!overlay) return;
        
        const activeEl = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
        if (!activeEl) return;
        
        const bounds = getElementBounds(activeEl);
        if (!bounds) return;

        overlay.style.transform = activeEl.rotation ? `rotate(${activeEl.rotation}rad)` : 'none';
        overlay.style.left = `${bounds.x + activePanRef.current.x}px`;
        overlay.style.top = `${bounds.y + activePanRef.current.y}px`;
        overlay.style.width = `${bounds.w}px`;
        overlay.style.height = `${bounds.h}px`;

        if (['arrow', 'dimension', 'line'].includes(activeEl.type)) {
            const startH = document.getElementById('arrow-start-handle');
            const endH = document.getElementById('arrow-end-handle');
            if (startH) {
                startH.style.left = `${activeEl.x - bounds.x - 5}px`;
                startH.style.top = `${activeEl.y - bounds.y - 5}px`;
            }
            if (endH) {
                endH.style.left = `${activeEl.endX - bounds.x - 5}px`;
                endH.style.top = `${activeEl.endY - bounds.y - 5}px`;
            }
        }
    }, [appState.selectedElementId]);
"""
code = re.sub(r'    const imageCache = useRef\(\{\}\);\n    const rafRef = useRef\(null\);\n    const actionStartRef = useRef\(\{ x: 0, y: 0 \}\);\n    const panStartRef = useRef\(\{ x: 0, y: 0 \}\);\n    \n    // DB state\n    const \[isLoading, setIsLoading\] = useState\(!!drawingId\);\n    const \[isSaving, setIsSaving\] = useState\(false\);\n    const \[drawingName, setDrawingName\] = useState\(\'Ny Skitse\'\);\n    \n    // Engine State\n    const \[pan, setPan\] = useState\(\{ x: 0, y: 0 \}\);\n    const \[elements, setElements\] = useState\(\[\]\);',
    """    const imageCache = useRef({});
    const rafRef = useRef(null);
    const actionStartRef = useRef({ x: 0, y: 0 });
    const panStartRef = useRef({ x: 0, y: 0 });
    
    // DB state
    const [isLoading, setIsLoading] = useState(!!drawingId);
    const [isSaving, setIsSaving] = useState(false);
    const [drawingName, setDrawingName] = useState('Ny Skitse');
""" + refs_block[refs_block.index("    // Engine State"):], code)


# 2. Update redraw to use activeRefs
redraw_block = """    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const currentPan = activePanRef.current;
        const currentElements = activeElementsRef.current;

        // Draw dot grid
        drawGrid(ctx, canvas.width, canvas.height, currentPan.x, currentPan.y);
        
        ctx.save();
        ctx.translate(currentPan.x, currentPan.y);

        currentElements.forEach(el => {"""
code = re.sub(r'    const redraw = useCallback\(\(\) => \{\n        const canvas = canvasRef\.current;\n        if \(\!canvas\) return;\n        const ctx = canvas\.getContext\(\'2d\'\);\n        ctx\.clearRect\(0, 0, canvas\.width, canvas\.height\);\n\n        // Draw dot grid\n        drawGrid\(ctx, canvas\.width, canvas\.height, pan\.x, pan\.y\);\n        \n        ctx\.save\(\);\n        ctx\.translate\(pan\.x, pan\.y\);\n\n        elements\.forEach\(el => \{', redraw_block, code)

# 3. Update redraw dependencies
code = code.replace("    }, [elements, appState.editingTextId, pan.x, pan.y]);", "    }, [appState.editingTextId]);")

# 4. Remove flushSync from imports and usage
code = code.replace("import { flushSync } from 'react-dom';\n", "")

# 5. Fix handlePointerMove to use activeRefs, not call setElements, call redraw and updateSelectionOverlayDOM
handleMove_old = """        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;

            flushSync(() => {
                if (appState.panning) {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const dx = clientX - panStartRef.current.x;
                const dy = clientY - panStartRef.current.y;
                panStartRef.current = { x: clientX, y: clientY };
                setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                return;
            }

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
            const dx = pos.x - actionStartRef.current.x;
            const dy = pos.y - actionStartRef.current.y;

            if (appState.tool === 'select') {
                actionStartRef.current = pos;
            }

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
        }
        }); // close flushSync
        }); // close requestAnimationFrame"""

handleMove_new = """        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;

            if (appState.panning) {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const dx = clientX - panStartRef.current.x;
                const dy = clientY - panStartRef.current.y;
                panStartRef.current = { x: clientX, y: clientY };
                activePanRef.current = { x: activePanRef.current.x + dx, y: activePanRef.current.y + dy };
                redraw();
                updateSelectionOverlayDOM();
                return;
            }

            const pos = getPointerPos(e);

            if (appState.resizing && appState.selectedElementId) {
                activeElementsRef.current = activeElementsRef.current.map(el => {
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
                });
                redraw();
                updateSelectionOverlayDOM();
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
                updateSelectionOverlayDOM();
                return;
            }

            if (appState.dragging && appState.selectedElementId) {
                const dx = pos.x - actionStartRef.current.x;
                const dy = pos.y - actionStartRef.current.y;

                if (appState.tool === 'select') {
                    actionStartRef.current = pos;
                }

                activeElementsRef.current = activeElementsRef.current.map(el => {
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
                });
                redraw();
                updateSelectionOverlayDOM();
            }
        }); // close requestAnimationFrame"""

code = code.replace(handleMove_old, handleMove_new)

# 6. handlePointerUp: commit to state
pointerUp_old = """    const handlePointerUp = () => {
        if (appState.panning) {
            setAppState(s => ({ ...s, panning: false }));
            return;
        }

        if (appState.dragging || appState.rotating || appState.resizing) {
            setAppState(s => ({ ...s, dragging: false, rotating: false, resizing: false }));"""

pointerUp_new = """    const handlePointerUp = () => {
        if (appState.panning) {
            setPan(activePanRef.current);
            setAppState(s => ({ ...s, panning: false }));
            return;
        }

        if (appState.dragging || appState.rotating || appState.resizing) {
            setElements(activeElementsRef.current);
            setAppState(s => ({ ...s, dragging: false, rotating: false, resizing: false }));"""

code = code.replace(pointerUp_old, pointerUp_new)


# 7. Add IDs to selectionOverlay
overlay_old = """        return (
            <div
                style={{
                    position: 'absolute',
                    left: bounds.x - padding + pan.x,
                    top: bounds.y - padding + pan.y,"""

overlay_new = """        return (
            <div
                id="selection-overlay"
                style={{
                    position: 'absolute',
                    left: bounds.x - padding + pan.x,
                    top: bounds.y - padding + pan.y,"""

code = code.replace(overlay_old, overlay_new)

handle_start_old = """                    <>
                        <div
                            style={{
                                position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1.5px solid #2563eb',
                                left: selectedElement.x - bounds.x + padding - 5,
                                top: selectedElement.y - bounds.y + padding - 5,"""

handle_start_new = """                    <>
                        <div
                            id="arrow-start-handle"
                            style={{
                                position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1.5px solid #2563eb',
                                left: selectedElement.x - bounds.x + padding - 5,
                                top: selectedElement.y - bounds.y + padding - 5,"""

code = code.replace(handle_start_old, handle_start_new)

handle_end_old = """                        />
                        <div
                            style={{
                                position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1.5px solid #2563eb',
                                left: selectedElement.endX - bounds.x + padding - 5,
                                top: selectedElement.endY - bounds.y + padding - 5,"""

handle_end_new = """                        />
                        <div
                            id="arrow-end-handle"
                            style={{
                                position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1.5px solid #2563eb',
                                left: selectedElement.endX - bounds.x + padding - 5,
                                top: selectedElement.endY - bounds.y + padding - 5,"""

code = code.replace(handle_end_old, handle_end_new)


with open('src/components/Drawings/DrawingBoard.jsx', 'w') as f:
    f.write(code)
print("Patched successfully")
