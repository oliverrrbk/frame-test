import { getElementBounds } from './engineUtils';

const NON_DRAWING_TYPES = ['settings'];

const isDrawableElement = (el) => el && el.type && !NON_DRAWING_TYPES.includes(el.type);

export const getDrawingBounds = (elements = []) => {
    const drawable = elements.filter(isDrawableElement);
    if (drawable.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    drawable.forEach(el => {
        const bounds = getElementBounds(el);
        if (!bounds) return;
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.w);
        maxY = Math.max(maxY, bounds.y + bounds.h);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return null;
    }

    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    return {
        x: minX,
        y: minY,
        w,
        h,
        cx: minX + w / 2,
        cy: minY + h / 2
    };
};

const loadImage = (src, cache) => new Promise((resolve, reject) => {
    if (!src) {
        reject(new Error('Billedet mangler data.'));
        return;
    }
    if (cache && cache[src]) {
        resolve(cache[src]);
        return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        if (cache) cache[src] = img;
        resolve(img);
    };
    img.onerror = () => reject(new Error('Kunne ikke indlæse billede i tegningen.'));
    img.src = src;
});

export const drawElement = async (ctx, el, options = {}) => {
    const { imageCache = {}, skipTextId = null } = options;
    ctx.save();

    const bounds = getElementBounds(el);
    if (el.rotation) {
        ctx.translate(bounds.cx, bounds.cy);
        ctx.rotate(el.rotation);
        ctx.translate(-bounds.cx, -bounds.cy);
    }

    ctx.strokeStyle = el.color || '#0f172a';
    ctx.fillStyle = el.color || '#0f172a';
    ctx.lineWidth = el.strokeWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (el.type === 'pen') {
        ctx.beginPath();
        if (el.points && el.points.length > 0) {
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (let i = 1; i < el.points.length; i++) {
                ctx.lineTo(el.points[i].x, el.points[i].y);
            }
        }
        ctx.stroke();
    } else if (el.type === 'rectangle') {
        ctx.strokeRect(el.x, el.y, el.w, el.h);
    } else if (el.type === 'circle') {
        ctx.beginPath();
        ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.abs(el.w) / 2, Math.abs(el.h) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (el.type === 'semicircle') {
        ctx.beginPath();
        ctx.moveTo(bounds.x, bounds.y + bounds.h);
        ctx.ellipse(bounds.cx, bounds.y + bounds.h, bounds.w / 2, bounds.h, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(bounds.x, bounds.y + bounds.h);
        ctx.stroke();
    } else if (el.type === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(el.x + el.w / 2, el.y);
        ctx.lineTo(el.x + el.w, el.y + el.h);
        ctx.lineTo(el.x, el.y + el.h);
        ctx.closePath();
        ctx.stroke();
    } else if (el.type === 'polygon') {
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3 - Math.PI / 2;
            const px = cx + (el.w / 2) * Math.cos(angle);
            const py = cy + (el.h / 2) * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    } else if (el.type === 'rhombus') {
        ctx.beginPath();
        ctx.moveTo(el.x + el.w / 2, el.y);
        ctx.lineTo(el.x + el.w, el.y + el.h / 2);
        ctx.lineTo(el.x + el.w / 2, el.y + el.h);
        ctx.lineTo(el.x, el.y + el.h / 2);
        ctx.closePath();
        ctx.stroke();
    } else if (el.type === 'parallelogram') {
        const skew = el.w * 0.2;
        ctx.beginPath();
        ctx.moveTo(el.x + skew, el.y);
        ctx.lineTo(el.x + el.w, el.y);
        ctx.lineTo(el.x + el.w - skew, el.y + el.h);
        ctx.lineTo(el.x, el.y + el.h);
        ctx.closePath();
        ctx.stroke();
    } else if (el.type === 'trapezoid') {
        const inset = bounds.w * 0.2;
        ctx.beginPath();
        ctx.moveTo(bounds.x + inset, bounds.y);
        ctx.lineTo(bounds.x + bounds.w - inset, bounds.y);
        ctx.lineTo(bounds.x + bounds.w, bounds.y + bounds.h);
        ctx.lineTo(bounds.x, bounds.y + bounds.h);
        ctx.closePath();
        ctx.stroke();
    } else if (el.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.endX, el.endY);
        ctx.stroke();
    } else if (el.type === 'arrow') {
        const headlen = 15;
        const dx = el.endX - el.x;
        const dy = el.endY - el.y;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.endX, el.endY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(el.endX, el.endY);
        ctx.lineTo(el.endX - headlen * Math.cos(angle - Math.PI / 6), el.endY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(el.endX, el.endY);
        ctx.lineTo(el.endX - headlen * Math.cos(angle + Math.PI / 6), el.endY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    } else if (el.type === 'dimension') {
        const dx = el.endX - el.x;
        const dy = el.endY - el.y;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.endX, el.endY);
        ctx.stroke();
        const tickLen = 10;
        ctx.save(); ctx.translate(el.x, el.y); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, -tickLen); ctx.lineTo(0, tickLen); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(el.endX, el.endY); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, -tickLen); ctx.lineTo(0, tickLen); ctx.stroke(); ctx.restore();
        if (el.text && el.id !== skipTextId) {
            const fontSize = el.fontSize || 16;
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textWidth = ctx.measureText(el.text).width;
            ctx.save();
            ctx.translate(el.x + dx / 2, el.y + dy / 2);
            let textAngle = angle;
            if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) textAngle += Math.PI;
            ctx.rotate(textAngle);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-textWidth / 2 - 6, -fontSize / 2 - 4, textWidth + 12, fontSize + 8);
            ctx.fillStyle = el.color || '#0f172a';
            ctx.fillText(el.text, 0, 0);
            ctx.restore();
        }
    } else if (el.type === 'text') {
        if (el.text && el.id !== skipTextId) {
            const fontSize = el.fontSize || 20;
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
            ctx.textBaseline = 'top';
            if (el.isLineNote || el.attachedToId) {
                const textWidth = ctx.measureText(el.text).width;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(el.x - 5, el.y - 3, textWidth + 10, fontSize + 8);
            }
            ctx.fillStyle = el.color || '#0f172a';
            ctx.fillText(el.text, el.x, el.y);
        }
    } else if (el.type === 'image' && el.dataUrl) {
        const img = await loadImage(el.dataUrl, imageCache);
        ctx.drawImage(img, el.x, el.y, el.w, el.h);
    }

    ctx.restore();
};

export const renderElementsToCanvas = async (elements = [], options = {}) => {
    const {
        width = 1600,
        height = 1000,
        padding = 72,
        background = '#ffffff',
        imageCache = {}
    } = options;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const bounds = getDrawingBounds(elements);
    if (!bounds) return { canvas, bounds: null, scale: 1 };

    const availableW = Math.max(1, width - padding * 2);
    const availableH = Math.max(1, height - padding * 2);
    const scale = Math.min(availableW / bounds.w, availableH / bounds.h);
    const offsetX = (width - bounds.w * scale) / 2 - bounds.x * scale;
    const offsetY = (height - bounds.h * scale) / 2 - bounds.y * scale;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    for (const el of elements) {
        if (!isDrawableElement(el)) continue;
        await drawElement(ctx, el, { imageCache });
    }
    ctx.restore();

    return { canvas, bounds, scale };
};
