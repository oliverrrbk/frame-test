import re

with open('src/components/Drawings/DrawingBoard.jsx', 'r') as f:
    code = f.read()

target = "if (el.id === appState.selectedElementId) {"
replacement = "if (el.id === appState.selectedElementId || el.parentId === appState.selectedElementId) {"

code = code.replace(target, replacement)

with open('src/components/Drawings/DrawingBoard.jsx', 'w') as f:
    f.write(code)
print("Updated dragging for children")
