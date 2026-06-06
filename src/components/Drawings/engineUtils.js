// engineUtils.js - Math and geometry for Bison Frame Engine

// 1. Point geometry
export const distance = (p1, p2) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

// Rotate a point around a center
export const rotatePoint = (point, center, angle) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
        x: center.x + (dx * cos - dy * sin),
        y: center.y + (dx * sin + dy * cos)
    };
};

// Distance from point to line segment
export const pointToLineDistance = (p, p1, p2) => {
    const A = p.x - p1.x;
    const B = p.y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = p1.x;
        yy = p1.y;
    } else if (param > 1) {
        xx = p2.x;
        yy = p2.y;
    } else {
        xx = p1.x + param * C;
        yy = p1.y + param * D;
    }

    const dx = p.x - xx;
    const dy = p.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
};

// 2. Bounding Boxes
export const getElementBounds = (element) => {
    if (element.type === 'freehand') {
        if (!element.points || element.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        element.points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        });
        return {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY,
            cx: minX + (maxX - minX) / 2,
            cy: minY + (maxY - minY) / 2
        };
    }
    
    if (element.type === 'rectangle' || element.type === 'image' || element.type === 'text' || element.type === 'circle') {
        const { x, y, w, h } = element;
        return {
            x: Math.min(x, x + w),
            y: Math.min(y, y + h),
            w: Math.abs(w),
            h: Math.abs(h),
            cx: x + w / 2,
            cy: y + h / 2
        };
    }

    if (element.type === 'arrow' || element.type === 'dimension' || element.type === 'line') {
        const minX = Math.min(element.x, element.endX);
        const maxX = Math.max(element.x, element.endX);
        const minY = Math.min(element.y, element.endY);
        const maxY = Math.max(element.y, element.endY);
        // Add some padding to dimensions/arrows bounds so they are easier to grab
        const pad = 20;
        return {
            x: minX - pad, y: minY - pad, w: maxX - minX + pad*2, h: maxY - minY + pad*2,
            cx: minX + (maxX - minX) / 2, cy: minY + (maxY - minY) / 2
        };
    }
    
    return { x: element.x, y: element.y, w: 100, h: 50, cx: element.x + 50, cy: element.y + 25 };
};

// 3. Hit Testing
export const isPointInElement = (point, element) => {
    // If element is rotated, we un-rotate the point around the element's center
    const bounds = getElementBounds(element);
    let checkPoint = point;
    
    if (element.rotation) {
        checkPoint = rotatePoint(point, {x: bounds.cx, y: bounds.cy}, -element.rotation);
    }

    if (element.type === 'arrow' || element.type === 'dimension' || element.type === 'line') {
        const { x, y, endX, endY } = element;
        // Øget tolerance (fra 8 til 16) for touch screens og iPad
        const tolerance = 16;
        if (distance(checkPoint, { x, y }) < tolerance) return true;
        if (distance(checkPoint, { x: endX, y: endY }) < tolerance) return true;
        const lineDist = pointToLineDistance(checkPoint, { x, y }, { x: endX, y: endY });
        return lineDist <= tolerance;
    }

    if (element.type === 'pen' || element.type === 'freehand') {
        const hitThreshold = 10 + (element.strokeWidth || 3);
        for (let i = 0; i < element.points.length - 1; i++) {
            const d = pointToLineDistance(checkPoint, element.points[i], element.points[i+1]);
            if (d < hitThreshold) return true;
        }
        return false;
    }
    
    if (element.type === 'rectangle' || element.type === 'image' || element.type === 'text' || element.type === 'circle') {
        const hitThreshold = 10 + (element.strokeWidth || 3);
        return (
            checkPoint.x >= bounds.x - hitThreshold &&
            checkPoint.x <= bounds.x + bounds.w + hitThreshold &&
            checkPoint.y >= bounds.y - hitThreshold &&
            checkPoint.y <= bounds.y + bounds.h + hitThreshold
        );
    }

    if (element.type === 'arrow' || element.type === 'dimension') {
        const d = pointToLineDistance(checkPoint, {x: element.x, y: element.y}, {x: element.endX, y: element.endY});
        return d < hitThreshold + 10; // Extra padding for easier clicking
    }

    return false;
};

// Find top-most element that was clicked
export const getElementAtPosition = (x, y, elements) => {
    // Iterate backwards so we hit top elements first
    for (let i = elements.length - 1; i >= 0; i--) {
        if (isPointInElement({x, y}, elements[i])) {
            return elements[i];
        }
    }
    return null;
};
