import re

with open('src/components/Drawings/DrawingBoard.jsx', 'r') as f:
    code = f.read()

# 1. Imports
code = code.replace(
    "import { ChevronLeft, Save, ImagePlus, Type, Square, ArrowRight, Eraser, PenTool, MousePointer2, Undo, Ruler, FileImage, Minus, Circle } from 'lucide-react';",
    "import { ChevronLeft, Save, ImagePlus, Type, Square, ArrowRight, Eraser, PenTool, MousePointer2, Undo, Ruler, FileImage, Minus, Circle, Shapes, Triangle, Hexagon, Diamond } from 'lucide-react';"
)

# 2. appState
state_old = """    const [appState, setAppState] = useState({
        tool: 'select', // 'select', 'pen', 'eraser', 'rectangle', 'arrow', 'image', 'text', 'dimension'
        color: '#0f172a',
        strokeWidth: 3,
        selectedElementId: null,
        editingTextId: null, // For text and dimension input
        dragging: false,
        rotating: false,
        resizing: false, // false or 'nw', 'ne', 'sw', 'se'
        panning: false,
        actionStartPoint: null, 
        initialRotation: 0,
    });"""

state_new = """    const [appState, setAppState] = useState({
        tool: 'select', // 'select', 'pen', 'eraser', 'rectangle', 'arrow', 'image', 'text', 'dimension'
        color: '#0f172a',
        strokeWidth: 3,
        selectedElementId: null,
        editingTextId: null, // For text and dimension input
        dragging: false,
        rotating: false,
        resizing: false, // false or 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
        panning: false,
        actionStartPoint: null, 
        initialRotation: 0,
        zoom: 1,
    });
    const [showShapesMenu, setShowShapesMenu] = useState(false);"""
code = code.replace(state_old, state_new)

# 3. getPointerPos
pos_old = """    const getPointerPos = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left - pan.x, y: clientY - rect.top - pan.y };
    };"""

pos_new = """    const getPointerPos = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { 
            x: (clientX - rect.left - pan.x) / appState.zoom, 
            y: (clientY - rect.top - pan.y) / appState.zoom 
        };
    };"""
code = code.replace(pos_old, pos_new)

# 4. redraw zoom
redraw_old = """        // Apply pan
        ctx.translate(currentPan.x, currentPan.y);

        currentElements.forEach(el => {"""
redraw_new = """        // Apply pan
        ctx.translate(currentPan.x, currentPan.y);
        ctx.scale(appState.zoom, appState.zoom);

        currentElements.forEach(el => {"""
code = code.replace(redraw_old, redraw_new)

# 5. redraw shapes
draw_old = """            } else if (el.type === 'circle') {
                ctx.beginPath();
                ctx.ellipse(el.x + el.w/2, el.y + el.h/2, Math.abs(el.w)/2, Math.abs(el.h)/2, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else if (el.type === 'line') {"""
draw_new = """            } else if (el.type === 'circle') {
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
            } else if (el.type === 'line') {"""
code = code.replace(draw_old, draw_new)

# 6. handlePointerDown
pd_old = """    const handlePointerDown = (e) => {
        const pos = getPointerPos(e);"""
pd_new = """    const handlePointerDown = (e) => {
        if (e.button === 1 || e.button === 2) {
            setAppState(s => ({ ...s, panning: true }));
            return;
        }
        const pos = getPointerPos(e);"""
code = code.replace(pd_old, pd_new)

pd_tool_old = """            if (appState.tool === 'pen') {
                newElement.points = [pos];
            } else if (appState.tool === 'rectangle' || appState.tool === 'text' || appState.tool === 'circle') {"""
pd_tool_new = """            if (appState.tool === 'pen') {
                newElement.points = [pos];
            } else if (['rectangle', 'text', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool)) {"""
code = code.replace(pd_tool_old, pd_tool_new)

# 7. handlePointerMove
pm_old = """    const handlePointerMove = (e) => {
        if (!appState.panning && !appState.dragging && !appState.rotating && !appState.resizing) return;
        
        e.persist && e.persist();
        if (rafRef.current) return;"""
pm_new = """    const handlePointerMove = (e) => {
        if (!appState.panning && !appState.dragging && !appState.rotating && !appState.resizing) return;
        
        e.persist && e.persist();
        actionStartRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);"""
code = code.replace(pm_old, pm_new)

pm_resize_old = """                    if (el.type === 'rectangle' || el.type === 'image' || el.type === 'text' || el.type === 'circle') {"""
pm_resize_new = """                    if (['rectangle', 'image', 'text', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(el.type)) {"""
code = code.replace(pm_resize_old, pm_resize_new)

pm_drag_old = """            if (appState.dragging && appState.selectedElementId) {
                const dx = pos.x - actionStartRef.current.x;
                const dy = pos.y - actionStartRef.current.y;

                if (appState.tool === 'select') {
                    actionStartRef.current = pos;
                }

                activeElementsRef.current = activeElementsRef.current.map(el => {
                    if (el.id !== appState.selectedElementId) return el;"""
pm_drag_new = """            if (appState.dragging && appState.selectedElementId) {
                const dx = pos.x - (actionStartRef.current?.x || 0);
                const dy = pos.y - (actionStartRef.current?.y || 0);

                if (appState.tool === 'select') {
                    actionStartRef.current = pos;
                }

                activeElementsRef.current = activeElementsRef.current.map(el => {
                    // Include parentId logic here so children move with parent!
                    if (el.id !== appState.selectedElementId && el.parentId !== appState.selectedElementId) return el;"""
code = code.replace(pm_drag_old, pm_drag_new)

pm_tool_draw_old = """                    else if (appState.tool === 'rectangle' || appState.tool === 'circle' || appState.tool === 'image') {"""
pm_tool_draw_new = """                    else if (['rectangle', 'circle', 'image', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool)) {"""
code = code.replace(pm_tool_draw_old, pm_tool_draw_new)

pm_tool_switch_old = """            if (['rectangle', 'arrow', 'text', 'dimension', 'circle', 'line', 'pen'].includes(appState.tool)) {"""
pm_tool_switch_new = """            if (['rectangle', 'arrow', 'text', 'dimension', 'circle', 'line', 'pen', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool)) {"""
code = code.replace(pm_tool_switch_old, pm_tool_switch_new)

# 8. onWheel and Double Click
events_old = """    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#f8fafc', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            
            {/* The Canvas Area */}
            <div 
                ref={containerRef} 
                style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >"""
events_new = """    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            setAppState(s => {
                const newZoom = Math.min(Math.max(s.zoom * zoomDelta, 0.1), 10);
                return { ...s, zoom: newZoom };
            });
        } else {
            setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
            activePanRef.current = { x: activePanRef.current.x - e.deltaX, y: activePanRef.current.y - e.deltaY };
            redraw();
        }
    };

    const handleDoubleClick = (e) => {
        const pos = getPointerPos(e);
        const clickedElement = getElementAtPosition(pos.x, pos.y, elements);
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
                
                setElements(prev => [...prev, newElement]);
                setAppState(s => ({ ...s, editingTextId: textId }));
            }
        }
    };

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
                onDoubleClick={handleDoubleClick}
                onWheel={handleWheel}
            >"""
code = code.replace(events_old, events_new)

# 9. Toolbar shapes menu
toolbar_old = """                {[
                    { id: 'select', icon: MousePointer2, title: 'Markør' },
                    { id: 'pen', icon: PenTool, title: 'Fritegning' },
                    { id: 'line', icon: Minus, title: 'Lige Streg' },
                    { id: 'rectangle', icon: Square, title: 'Firkant' },
                    { id: 'circle', icon: Circle, title: 'Cirkel' },
                    { id: 'arrow', icon: ArrowRight, title: 'Pil' },
                    { id: 'dimension', icon: Ruler, title: 'Målebånd' },
                    { id: 'text', icon: Type, title: 'Tekst' },
                    { id: 'eraser', icon: Eraser, title: 'Viskelæder' }
                ].map(t => ("""
toolbar_new = """                {[
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
                ].map(t => ("""
code = code.replace(toolbar_old, toolbar_new)

# 10. Selection Overlay Scale
overlay_old = """        overlay.style.transform = activeEl.rotation ? `rotate(${activeEl.rotation}rad)` : 'none';
        overlay.style.left = `${bounds.x + activePanRef.current.x}px`;
        overlay.style.top = `${bounds.y + activePanRef.current.y}px`;"""
overlay_new = """        overlay.style.transform = `scale(${appState.zoom}) ` + (activeEl.rotation ? `rotate(${activeEl.rotation}rad)` : 'none');
        overlay.style.transformOrigin = 'top left';
        overlay.style.left = `${(bounds.x + activePanRef.current.x) * appState.zoom}px`;
        overlay.style.top = `${(bounds.y + activePanRef.current.y) * appState.zoom}px`;"""
code = code.replace(overlay_old, overlay_new)

resize_old = """                {/* Resize Handles (only for rect, text, image, circle) */}
                {['rectangle', 'image', 'text', 'circle'].includes(selectedElement.type) && ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(handle => {"""
resize_new = """                {/* Resize Handles (only for rect, text, image, circle, triangle, etc) */}
                {['rectangle', 'image', 'text', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(selectedElement.type) && ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(handle => {"""
code = code.replace(resize_old, resize_new)

with open('src/components/Drawings/DrawingBoard.jsx', 'w') as f:
    f.write(code)
print("Script successfully generated DrawingBoard.jsx")
