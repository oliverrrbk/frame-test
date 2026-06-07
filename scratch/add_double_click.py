import re

with open('src/components/Drawings/DrawingBoard.jsx', 'r') as f:
    code = f.read()

# Add handleDoubleClick function
func = """
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
                
                // Add an attached text
                const newElement = {
                    id: textId,
                    type: 'text',
                    parentId: clickedElement.id,
                    text: '',
                    color: appState.color,
                    x: pos.x,
                    y: pos.y,
                    w: 100,
                    h: 30
                };
                
                setElements(prev => [...prev, newElement]);
                setAppState(s => ({ ...s, editingTextId: textId }));
            }
        }
    };
"""

# Insert before return (
target = "    return ("
code = code.replace(target, func + "\n" + target)

# Add to container
container = """            <div 
                ref={containerRef} 
                style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >"""
replacement = """            <div 
                ref={containerRef} 
                style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onDoubleClick={handleDoubleClick}
            >"""
code = code.replace(container, replacement)

with open('src/components/Drawings/DrawingBoard.jsx', 'w') as f:
    f.write(code)
print("Added handleDoubleClick")
