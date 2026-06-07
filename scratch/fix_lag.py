import re

with open('src/components/Drawings/DrawingBoard.jsx', 'r') as f:
    code = f.read()

# 1. Add lastPointerRef
imp_old = "const canvasRef = useRef(null);"
imp_new = "const canvasRef = useRef(null);\n    const lastPointerRef = useRef({ x: 0, y: 0 });\n    const saveTimeoutRef = useRef(null);"
code = code.replace(imp_old, imp_new)

# 2. Fix handlePointerDown for panning
pd_old = """                setAppState(s => ({ 
                    ...s, 
                    selectedElementId: null, 
                    editingTextId: null, 
                    panning: { x: e.clientX || (e.touches && e.touches[0].clientX) || 0, y: e.clientY || (e.touches && e.touches[0].clientY) || 0 }
                }));"""
pd_new = """                lastPointerRef.current = { x: e.clientX || (e.touches && e.touches[0].clientX) || 0, y: e.clientY || (e.touches && e.touches[0].clientY) || 0 };
                setAppState(s => ({ 
                    ...s, 
                    selectedElementId: null, 
                    editingTextId: null, 
                    panning: true
                }));"""
code = code.replace(pd_old, pd_new)

# 3. Fix handlePointerMove for panning
pm_old = """    const handlePointerMove = (e) => {
        if (appState.panning && typeof appState.panning === 'object') {
            const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            const dx = currentX - appState.panning.x;
            const dy = currentY - appState.panning.y;
            
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
            activePanRef.current = { x: activePanRef.current.x + dx, y: activePanRef.current.y + dy };
            
            setAppState(s => ({ ...s, panning: { x: currentX, y: currentY } }));
            redraw();
            return;
        }"""
pm_new = """    const handlePointerMove = (e) => {
        if (appState.panning) {
            const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            const dx = currentX - lastPointerRef.current.x;
            const dy = currentY - lastPointerRef.current.y;
            
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
            activePanRef.current = { x: activePanRef.current.x + dx, y: activePanRef.current.y + dy };
            lastPointerRef.current = { x: currentX, y: currentY };
            
            redraw();
            return;
        }"""
code = code.replace(pm_old, pm_new)

# 4. Fix Wheel Zoom (ALWAYS zoom)
wheel_old = """    const handleWheel = (e) => {
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
    };"""
wheel_new = """    const handleWheel = (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        setAppState(s => {
            const newZoom = Math.min(Math.max(s.zoom * zoomDelta, 0.1), 10);
            return { ...s, zoom: newZoom };
        });
    };"""
code = code.replace(wheel_old, wheel_new)

# 5. Fix LocalStorage Debounce
auto_old = """    // LocalStorage Autosave
    useEffect(() => {
        if (!isLoading) {
            const saveKey = `autosave_drawing_${drawingId || 'new'}`;
            localStorage.setItem(saveKey, JSON.stringify({
                timestamp: Date.now(),
                elements,
                name: drawingName
            }));
        }
    }, [elements, drawingName, drawingId, isLoading]);"""
auto_new = """    // LocalStorage Autosave (Debounced to prevent lag)
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
    }, [elements, drawingName, drawingId, isLoading]);"""
code = code.replace(auto_old, auto_new)

with open('src/components/Drawings/DrawingBoard.jsx', 'w') as f:
    f.write(code)
print("Fixed lagging, panning, and zooming")
