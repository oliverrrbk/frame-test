export const getAttachedPosition = (parent, t, offset) => {
    if (parent.type === 'line' || parent.type === 'arrow' || parent.type === 'dimension') {
        const x = parent.x + (parent.endX - parent.x) * t;
        const y = parent.y + (parent.endY - parent.y) * t;
        // Normal vector for offset
        const dx = parent.endX - parent.x;
        const dy = parent.endY - parent.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return { x, y };
        const nx = -dy / len;
        const ny = dx / len;
        return { x: x + nx * offset, y: y + ny * offset };
    }
    // For shapes, we can just interpolate along the perimeter, or simpler: just use bounding box.
    const cx = parent.x + parent.w / 2;
    const cy = parent.y + parent.h / 2;
    // ...
    return { x: cx, y: cy };
}
