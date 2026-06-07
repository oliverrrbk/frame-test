import re

with open('src/components/Drawings/DrawingBoard.jsx', 'r') as f:
    code = f.read()

# Extract updateSelectionOverlayDOM
pattern = r"    const updateSelectionOverlayDOM = useCallback\(\(\) => \{.*?    \}, \[appState\.selectedElementId\]\);\n\n"
match = re.search(pattern, code, re.DOTALL)
if match:
    overlay_func = match.group(0)
    # Remove it from current position
    code = code.replace(overlay_func, "")
    
    # Insert it after appState
    appState_str = """        panning: false,
        actionStartPoint: null, 
        initialRotation: 0,
    });\n"""
    
    code = code.replace(appState_str, appState_str + "\n" + overlay_func)
    
    with open('src/components/Drawings/DrawingBoard.jsx', 'w') as f:
        f.write(code)
    print("Fixed order")
else:
    print("Pattern not found")
