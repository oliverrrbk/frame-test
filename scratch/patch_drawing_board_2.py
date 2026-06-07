import re

with open('src/components/Drawings/DrawingBoard.jsx', 'r') as f:
    code = f.read()

# 1. Imports
imp_old = "import { getElementBounds, getElementAtPosition, rotatePoint } from './engineUtils';"
imp_new = "import { getElementBounds, getElementAtPosition, rotatePoint, findSnapPoint, getConnectedModule } from './engineUtils';"
code = code.replace(imp_old, imp_new)

# 2. appState drillDown
state_old = "        selectedElementId: null,"
state_new = "        selectedElementId: null,\n        drillDown: false,"
code = code.replace(state_old, state_new)

# 3. handlePointerDown selection
sel_old = """        if (appState.tool === 'select') {
            const clickedElement = getElementAtPosition(pos.x, pos.y, elements);
            if (clickedElement) {
                // Determine if click is on resize handle"""
sel_new = """        if (appState.tool === 'select') {
            const clickedElement = getElementAtPosition(pos.x, pos.y, elements);
            if (clickedElement) {
                if (clickedElement.id === appState.selectedElementId) {
                    // Clicked again -> Drill down to edit just this element
                    setAppState(s => ({ ...s, drillDown: true }));
                } else {
                    setAppState(s => ({ ...s, drillDown: false }));
                }
                // Determine if click is on resize handle"""
code = code.replace(sel_old, sel_new)

# 4. handlePointerMove snapping
pm_tool_draw_old = """                    else if (['rectangle', 'circle', 'image', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool)) {
                        return { ...el, w: pos.x - el.x, h: pos.y - el.y };
                    }
                    else if (appState.tool === 'arrow' || appState.tool === 'dimension' || appState.tool === 'line') {
                        const dx = pos.x - el.x;
                        const dy = pos.y - el.y;"""
pm_tool_draw_new = """                    else if (['rectangle', 'circle', 'image', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool)) {
                        const snap = findSnapPoint(pos, activeElementsRef.current, el.id);
                        const endPos = snap || pos;
                        return { ...el, w: endPos.x - el.x, h: endPos.y - el.y };
                    }
                    else if (appState.tool === 'arrow' || appState.tool === 'dimension' || appState.tool === 'line') {
                        const snap = findSnapPoint(pos, activeElementsRef.current, el.id);
                        const endPos = snap || pos;
                        const dx = endPos.x - el.x;
                        const dy = endPos.y - el.y;"""
code = code.replace(pm_tool_draw_old, pm_tool_draw_new)

pm_line_snap_old = """                        let endX = pos.x, endY = pos.y;
                        if (Math.abs(angle - closestSnap) < 0.17) {
                            const dist = Math.hypot(dx, dy);
                            endX = el.x + Math.cos(closestSnap) * dist;
                            endY = el.y + Math.sin(closestSnap) * dist;
                        }
                        return { ...el, endX, endY };"""
pm_line_snap_new = """                        let endX = endPos.x, endY = endPos.y;
                        // Only apply angular snap if not already magnetic snapping
                        if (!snap && Math.abs(angle - closestSnap) < 0.17) {
                            const dist = Math.hypot(dx, dy);
                            endX = el.x + Math.cos(closestSnap) * dist;
                            endY = el.y + Math.sin(closestSnap) * dist;
                        }
                        return { ...el, endX, endY };"""
code = code.replace(pm_line_snap_old, pm_line_snap_new)

# 5. handlePointerMove dragging module
drag_old = """                activeElementsRef.current = activeElementsRef.current.map(el => {
                    // Include parentId logic here so children move with parent!
                    if (el.id !== appState.selectedElementId && el.parentId !== appState.selectedElementId) return el;

                    if (appState.tool === 'select') {"""
drag_new = """                let moduleIds = [appState.selectedElementId];
                if (!appState.drillDown) {
                    moduleIds = getConnectedModule(appState.selectedElementId, activeElementsRef.current);
                }

                activeElementsRef.current = activeElementsRef.current.map(el => {
                    // Include parentId logic so children move with parent!
                    const isMoving = moduleIds.includes(el.id) || moduleIds.includes(el.parentId);
                    if (!isMoving) return el;

                    if (appState.tool === 'select') {"""
code = code.replace(drag_old, drag_new)

with open('src/components/Drawings/DrawingBoard.jsx', 'w') as f:
    f.write(code)
print("Patched drawing board for Auto Modules")
