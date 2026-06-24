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

const SHAPE_TYPES = ['rectangle', 'circle', 'semicircle', 'triangle', 'polygon', 'rhombus', 'parallelogram', 'trapezoid'];
const LINE_TYPES = ['arrow', 'dimension', 'line'];
const PRIORITY_TYPES = ['text', 'arrow', 'dimension', 'line', 'pen', 'freehand'];

// 2. Bounding Boxes
export const getElementBounds = (element) => {
    if (element.type === 'pen' || element.type === 'freehand') {
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
    
    if (['rectangle', 'image', 'text', 'circle', 'semicircle', 'triangle', 'polygon', 'rhombus', 'parallelogram', 'trapezoid'].includes(element.type)) {
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
export const isPointInElement = (point, element, options = {}) => {
    const { mode = 'normal' } = options;
    // If element is rotated, we un-rotate the point around the element's center
    const bounds = getElementBounds(element);
    let checkPoint = point;
    
    if (element.rotation) {
        checkPoint = rotatePoint(point, {x: bounds.cx, y: bounds.cy}, -element.rotation);
    }

    if (LINE_TYPES.includes(element.type)) {
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

    if (element.type === 'text') {
        const hitThreshold = mode === 'fallback' ? 10 : 4;
        return (
            checkPoint.x >= bounds.x - hitThreshold &&
            checkPoint.x <= bounds.x + bounds.w + hitThreshold &&
            checkPoint.y >= bounds.y - hitThreshold &&
            checkPoint.y <= bounds.y + bounds.h + hitThreshold
        );
    }
    
    if (element.type === 'image') {
        const hitThreshold = 10 + (element.strokeWidth || 3);
        return (
            checkPoint.x >= bounds.x - hitThreshold &&
            checkPoint.x <= bounds.x + bounds.w + hitThreshold &&
            checkPoint.y >= bounds.y - hitThreshold &&
            checkPoint.y <= bounds.y + bounds.h + hitThreshold
        );
    }

    if (SHAPE_TYPES.includes(element.type)) {
        const hitThreshold = 10 + (element.strokeWidth || 3);

        if (mode !== 'fallback') {
            if (element.type === 'circle') {
                return isPointNearEllipse(checkPoint, element, hitThreshold);
            }
            const outlineHit = getShapeSegments(element).some(([p1, p2]) => (
                pointToLineDistance(checkPoint, p1, p2) <= hitThreshold
            ));
            if (outlineHit) return true;
            return false;
        }

        return (
            checkPoint.x >= bounds.x - hitThreshold &&
            checkPoint.x <= bounds.x + bounds.w + hitThreshold &&
            checkPoint.y >= bounds.y - hitThreshold &&
            checkPoint.y <= bounds.y + bounds.h + hitThreshold
        );
    }

    return false;
};

export const getShapeSegments = (element) => {
    if (element.type === 'rectangle' || element.type === 'image' || element.type === 'text') {
        const points = [
            { x: element.x, y: element.y },
            { x: element.x + element.w, y: element.y },
            { x: element.x + element.w, y: element.y + element.h },
            { x: element.x, y: element.y + element.h }
        ];
        return points.map((p, i) => [p, points[(i + 1) % points.length]]);
    }

    if (element.type === 'triangle') {
        const points = [
            { x: element.x + element.w / 2, y: element.y },
            { x: element.x + element.w, y: element.y + element.h },
            { x: element.x, y: element.y + element.h }
        ];
        return points.map((p, i) => [p, points[(i + 1) % points.length]]);
    }

    if (element.type === 'polygon') {
        const cx = element.x + element.w / 2;
        const cy = element.y + element.h / 2;
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3 - Math.PI / 2;
            points.push({
                x: cx + (element.w / 2) * Math.cos(angle),
                y: cy + (element.h / 2) * Math.sin(angle)
            });
        }
        return points.map((p, i) => [p, points[(i + 1) % points.length]]);
    }

    if (element.type === 'rhombus') {
        const points = [
            { x: element.x + element.w / 2, y: element.y },
            { x: element.x + element.w, y: element.y + element.h / 2 },
            { x: element.x + element.w / 2, y: element.y + element.h },
            { x: element.x, y: element.y + element.h / 2 }
        ];
        return points.map((p, i) => [p, points[(i + 1) % points.length]]);
    }

    if (element.type === 'parallelogram') {
        const skew = element.w * 0.2;
        const points = [
            { x: element.x + skew, y: element.y },
            { x: element.x + element.w, y: element.y },
            { x: element.x + element.w - skew, y: element.y + element.h },
            { x: element.x, y: element.y + element.h }
        ];
        return points.map((p, i) => [p, points[(i + 1) % points.length]]);
    }

    if (element.type === 'trapezoid') {
        const bounds = getElementBounds(element);
        const inset = bounds.w * 0.2;
        const points = [
            { x: bounds.x + inset, y: bounds.y },
            { x: bounds.x + bounds.w - inset, y: bounds.y },
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
            { x: bounds.x, y: bounds.y + bounds.h }
        ];
        return points.map((p, i) => [p, points[(i + 1) % points.length]]);
    }

    if (element.type === 'semicircle') {
        const bounds = getElementBounds(element);
        const baseY = bounds.y + bounds.h;
        const points = [];
        for (let i = 0; i <= 16; i++) {
            const angle = Math.PI + (Math.PI * i) / 16;
            points.push({
                x: bounds.cx + (bounds.w / 2) * Math.cos(angle),
                y: baseY + bounds.h * Math.sin(angle)
            });
        }
        points.push({ x: bounds.x, y: baseY });
        return points.map((p, i) => [p, points[(i + 1) % points.length]]);
    }

    if (element.type === 'circle') {
        return [];
    }

    return [];
};

const isPointNearEllipse = (point, element, tolerance) => {
    const cx = element.x + element.w / 2;
    const cy = element.y + element.h / 2;
    const rx = Math.abs(element.w) / 2;
    const ry = Math.abs(element.h) / 2;
    if (rx === 0 || ry === 0) return false;
    const normalized = Math.hypot((point.x - cx) / rx, (point.y - cy) / ry);
    const avgRadius = (rx + ry) / 2;
    return Math.abs(normalized - 1) * avgRadius <= tolerance;
};

// Find top-most element that was clicked
export const getElementAtPosition = (x, y, elements) => {
    const point = {x, y};

    // First pass: annotations and precise shape outlines win over big filled hitboxes.
    for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        if ((PRIORITY_TYPES.includes(element.type) || SHAPE_TYPES.includes(element.type)) && isPointInElement(point, element, { mode: 'precise' })) {
            return element;
        }
    }

    // Second pass: images and broad shape areas are fallback targets.
    for (let i = elements.length - 1; i >= 0; i--) {
        if (isPointInElement(point, elements[i], { mode: 'fallback' })) {
            return elements[i];
        }
    }
    return null;
};

export const getElementPoints = (el) => {
    if (el.type === 'line' || el.type === 'arrow' || el.type === 'dimension') {
        return [
            {x: el.x, y: el.y, type: 'endpoint'},
            {x: el.endX, y: el.endY, type: 'endpoint'},
            {x: (el.x + el.endX) / 2, y: (el.y + el.endY) / 2, type: 'midpoint'}
        ];
    }
    if (el.type === 'semicircle') {
        const bounds = getElementBounds(el);
        return [
            { x: bounds.x, y: bounds.y + bounds.h, type: 'endpoint' },
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h, type: 'endpoint' },
            { x: bounds.cx, y: bounds.y, type: 'midpoint' },
            { x: bounds.cx, y: bounds.y + bounds.h, type: 'center' }
        ];
    }
    if (el.type === 'trapezoid') {
        const bounds = getElementBounds(el);
        const inset = bounds.w * 0.2;
        return [
            { x: bounds.x + inset, y: bounds.y, type: 'corner' },
            { x: bounds.x + bounds.w - inset, y: bounds.y, type: 'corner' },
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h, type: 'corner' },
            { x: bounds.x, y: bounds.y + bounds.h, type: 'corner' },
            { x: bounds.cx, y: bounds.y, type: 'midpoint' },
            { x: bounds.x + bounds.w, y: bounds.cy, type: 'midpoint' },
            { x: bounds.cx, y: bounds.y + bounds.h, type: 'midpoint' },
            { x: bounds.x, y: bounds.cy, type: 'midpoint' },
            { x: bounds.cx, y: bounds.cy, type: 'center' }
        ];
    }
    if (['rectangle', 'image', 'text', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(el.type)) {
        const corners = [
            {x: el.x, y: el.y, type: 'corner'},
            {x: el.x + el.w, y: el.y, type: 'corner'},
            {x: el.x + el.w, y: el.y + el.h, type: 'corner'},
            {x: el.x, y: el.y + el.h, type: 'corner'}
        ];
        return [
            ...corners,
            {x: el.x + el.w / 2, y: el.y, type: 'midpoint'},
            {x: el.x + el.w, y: el.y + el.h / 2, type: 'midpoint'},
            {x: el.x + el.w / 2, y: el.y + el.h, type: 'midpoint'},
            {x: el.x, y: el.y + el.h / 2, type: 'midpoint'},
            {x: el.x + el.w / 2, y: el.y + el.h / 2, type: 'center'}
        ];
    }
    if (el.type === 'circle') {
        return [
            {x: el.x + el.w / 2, y: el.y + el.h / 2, type: 'center'},
            {x: el.x, y: el.y + el.h / 2, type: 'midpoint'},
            {x: el.x + el.w, y: el.y + el.h / 2, type: 'midpoint'},
            {x: el.x + el.w / 2, y: el.y, type: 'midpoint'},
            {x: el.x + el.w / 2, y: el.y + el.h, type: 'midpoint'}
        ];
    }
    if (el.type === 'pen' && el.points && el.points.length > 0) {
        return [
            { ...el.points[0], type: 'endpoint' },
            { ...el.points[el.points.length - 1], type: 'endpoint' }
        ];
    }
    return [];
};

// Forrang ved snap: midtpunkter er "klæbrigst", så de vinder over en nærliggende ende.
const SNAP_PRIORITY_BIAS = { midpoint: 7, center: 6, endpoint: 4, corner: 2 };

export const findSnapPoint = (pos, elements, ignoreId = null, threshold = 15) => {
    let bestSnap = null;
    let bestScore = Infinity;

    elements.forEach(el => {
        if (el.id === ignoreId || el.type === 'settings') return;
        const pts = getElementPoints(el);
        pts.forEach(p => {
            const dist = Math.hypot(p.x - pos.x, p.y - pos.y);
            if (dist > threshold) return;
            // Træk biasen fra afstanden, så foretrukne punkttyper får forrang.
            const score = dist - (SNAP_PRIORITY_BIAS[p.type] || 0);
            if (score < bestScore) {
                bestScore = score;
                bestSnap = { ...p };
            }
        });
    });
    return bestSnap;
};

export const getConnectedModule = (startId, elements) => {
    const connected = new Set([startId]);
    let added = true;
    
    const sharePoint = (el1, el2) => {
        const pts1 = getElementPoints(el1);
        const pts2 = getElementPoints(el2);
        for (let p1 of pts1) {
            for (let p2 of pts2) {
                if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 1) return true;
            }
        }
        return false;
    };

    while (added) {
        added = false;
        elements.forEach(el => {
            if (!connected.has(el.id)) {
                let connects = false;
                for (let cid of connected) {
                    const cel = elements.find(e => e.id === cid);
                    if (cel && sharePoint(el, cel)) {
                        connects = true;
                        break;
                    }
                }
                if (connects) {
                    connected.add(el.id);
                    added = true;
                }
            }
        });
    }
    return Array.from(connected);
};
