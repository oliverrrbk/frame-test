# Plan for Ultimate Zero-Lag Dragging

## 1. Eliminate Recursive Search on PointerMove
**Problem:** `getConnectedModule(appState.selectedElementId, elements)` is a recursive O(N) search that finds connected elements (arrows, text nodes linked to a shape). Currently, this heavy calculation runs 60 times a second inside `handlePointerMove`.
**Solution:** Move `getConnectedModule` to `handlePointerDown`. We calculate `appState.activeModuleIds` exactly ONCE when the drag starts, and just use that cached array during the drag.

## 2. Eliminate React Re-Renders for Dragging (The "Canvas Bypass")
**Problem:** Calling `setElements` triggers a full React component re-render on every pixel, recreating virtual DOM nodes for the entire dashboard.
**Solution:** 
- Introduce `activeElementsRef`. 
- In `handlePointerMove` (for dragging, resizing, rotating), we will only mutate `activeElementsRef.current` and call `redraw()`. This updates the Canvas instantly (0ms lag).
- **Selection Overlays:** The blue HTML selection borders won't automatically follow unless we force them to. We will attach a `ref` to the single selection overlay and manually update its inline `left`, `top`, `width`, and `height` styles inside `handlePointerMove` using DOM manipulation, bypassing React completely!
- We only call `setElements` once in `handlePointerUp` to save the final state to React and localStorage.

## 3. Persistent Engine Optimization
**Problem:** The user requested we "lock this in" so it never lags again.
**Solution:** By replacing all high-frequency `setElements` and `setAppState` calls in `handlePointerMove` with DOM/Canvas mutations, we fundamentally alter the engine's architecture to be independent of React's render cycle during interactions.
