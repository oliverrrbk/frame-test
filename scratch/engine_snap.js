export const getElementPoints = (el) => {
    if (el.type === 'line' || el.type === 'arrow' || el.type === 'dimension') {
        return [{x: el.x, y: el.y}, {x: el.endX, y: el.endY}];
    }
    if (['rectangle', 'image', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(el.type)) {
        return [
            {x: el.x, y: el.y},
            {x: el.x + el.w, y: el.y},
            {x: el.x + el.w, y: el.y + el.h},
            {x: el.x, y: el.y + el.h}
        ];
    }
    return [];
};

export const findSnapPoint = (pos, elements, ignoreId = null) => {
    let bestSnap = null;
    let minDist = 15; // Snap threshold

    elements.forEach(el => {
        if (el.id === ignoreId) return;
        const pts = getElementPoints(el);
        pts.forEach(p => {
            const dist = Math.hypot(p.x - pos.x, p.y - pos.y);
            if (dist < minDist) {
                minDist = dist;
                bestSnap = { ...p };
            }
        });
    });
    return bestSnap;
};

export const getConnectedModule = (startId, elements) => {
    const connected = new Set([startId]);
    let added = true;
    
    // Check if two elements share a point (dist < 1)
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
                // if it shares a point with any element in connected
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
