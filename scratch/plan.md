# Plan for Fixing Shapes, Lag, and Resizing

## 1. Lag during Panning/Moving (Performance Optimization)
**Problem:** `setPan` and `setAppState` (for dragging) are called on every `pointermove` event (60+ times a second). Since `DrawingBoard` is a large React component, forcing a full React re-render for every pixel of mouse movement causes massive lag.
**Solution:** 
- Instead of using `setPan` during `pointermove`, we will only update `activePanRef.current` and call `redraw()` directly to update the canvas.
- To ensure HTML overlays (like text inputs and selection boxes) move in sync *without* React renders, we will place all overlays inside a `<div ref={overlaysContainerRef}>` and directly update its `style.transform` during `pointermove`. 
- `setPan` and `setElements` will only be called on `pointerup` to sync the final state.

## 2. Drawing New Shapes (Dots instead of shapes)
**Problem:** When selecting a shape tool and clicking, the shape is initialized with width=0 and height=0. Since `handlePointerMove` didn't correctly implement dragging to set width/height for all these new shapes, they remain as dots.
**Solution:**
- Update `handlePointerDown` so that clicking *without* dragging creates a shape with a default size (e.g., 100x100).
- Ensure `handlePointerMove` correctly updates `w` and `h` when `appState.dragging` is true and a shape tool is active.

## 3. Resizing Handles for All Shapes
**Problem:** The resize handles (`nw`, `ne`, `sw`, `se`) are hardcoded to only show for `rectangle`, `image`, and `text`.
**Solution:**
- Add `circle`, `triangle`, `polygon`, `rhombus`, and `parallelogram` to the list of elements that get resize handles in `selectionOverlay`.

## Verification
- Panning with spacebar will not trigger React renders (0 lag).
- Creating new shapes will either draw a default size on click or allow dragging to set size.
- All shapes will have 4 corner resize handles.
