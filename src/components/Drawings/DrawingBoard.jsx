import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { ChevronLeft, Save, ImagePlus, Type, Square, ArrowRight, Eraser, PenTool, MousePointer2, Undo, Ruler, FileImage, Minus, Circle, Shapes, Triangle, Hexagon, Diamond, Maximize2, Grid3X3, Palette, Copy, Lock, Unlock, Layers, AlertTriangle, LibraryBig, DoorOpen, Columns3, Rows3, Hammer, RotateCw, FlipHorizontal2, FlipVertical2 } from 'lucide-react';
import { getElementBounds, getElementAtPosition, rotatePoint, findSnapPoint, getConnectedModule } from './engineUtils';
import { getDrawingBounds, renderElementsToCanvas } from './renderUtils';

const COLORS = ['#0f172a', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];
const EXTENDED_COLORS = ['#0f172a', '#475569', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#ffffff'];
const MEASURABLE_TYPES = ['line', 'arrow', 'dimension'];
const SHAPE_DIMENSION_TYPES = ['rectangle', 'image', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'];
const SETTINGS_ELEMENT_ID = '__drawing_settings__';

const generateId = () => Math.random().toString(36).substr(2, 9);

const SYMBOL_TOOL_PREFIX = 'symbol:';
const CARPENTER_SYMBOLS = [
    { id: 'door', icon: DoorOpen, title: 'Dør' },
    { id: 'window', icon: Columns3, title: 'Vindue' },
    { id: 'stairs', icon: Rows3, title: 'Trappe' },
    { id: 'post', icon: Square, title: 'Stolpe' },
    { id: 'beam', icon: Hammer, title: 'Bjælke' }
];

const createLineElement = ({ id, parentId, x, y, endX, endY, color, strokeWidth }) => ({
    id,
    parentId,
    type: 'line',
    color,
    strokeWidth,
    rotation: 0,
    x,
    y,
    endX,
    endY,
    text: ''
});

const createRectElement = ({ id, parentId, x, y, w, h, color, strokeWidth }) => ({
    id,
    parentId,
    type: 'rectangle',
    color,
    strokeWidth,
    rotation: 0,
    x,
    y,
    w,
    h,
    text: ''
});

const createSymbolElements = (symbolId, origin, color, strokeWidth) => {
    const rootId = generateId();
    const line = (coords, parentId = rootId) => createLineElement({ id: generateId(), parentId, color, strokeWidth, ...coords });
    const rect = (coords, parentId = rootId) => createRectElement({ id: generateId(), parentId, color, strokeWidth, ...coords });
    const x = origin.x;
    const y = origin.y;

    if (symbolId === 'door') {
        const root = createLineElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 38,
            y: y + 36,
            endX: x - 38,
            endY: y - 36,
            text: ''
        });
        return [
            root,
            line({ x: x - 38, y: y - 36, endX: x + 30, endY: y - 36 }),
            line({ x: x - 38, y: y + 36, endX: x + 30, endY: y + 36 }),
            line({ x: x - 38, y: y - 36, endX: x + 30, endY: y + 28 }),
            line({ x: x - 18, y: y + 16, endX: x + 4, endY: y + 32 }),
            line({ x: x + 4, y: y + 32, endX: x + 30, endY: y + 36 })
        ];
    }

    if (symbolId === 'window') {
        const root = createRectElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 44,
            y: y - 24,
            w: 88,
            h: 48,
            text: ''
        });
        return [
            root,
            line({ x: x, y: y - 24, endX: x, endY: y + 24 }),
            line({ x: x - 44, y, endX: x + 44, endY: y }),
            line({ x: x - 32, y: y - 16, endX: x + 32, endY: y + 16 }),
            line({ x: x - 32, y: y + 16, endX: x + 32, endY: y - 16 })
        ];
    }

    if (symbolId === 'stairs') {
        const root = createRectElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 48,
            y: y - 34,
            w: 96,
            h: 68,
            text: ''
        });
        const steps = [];
        for (let i = 1; i < 5; i++) {
            const stepX = x - 48 + i * 19.2;
            steps.push(line({ x: stepX, y: y - 34, endX: stepX, endY: y + 34 }));
        }
        return [
            root,
            ...steps,
            line({ x: x - 48, y: y + 34, endX: x + 48, endY: y - 34 })
        ];
    }

    if (symbolId === 'post') {
        const root = createRectElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 24,
            y: y - 24,
            w: 48,
            h: 48,
            text: ''
        });
        return [
            root,
            line({ x: x - 24, y: y - 24, endX: x + 24, endY: y + 24 }),
            line({ x: x + 24, y: y - 24, endX: x - 24, endY: y + 24 })
        ];
    }

    if (symbolId === 'beam') {
        const root = createRectElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 64,
            y: y - 16,
            w: 128,
            h: 32,
            text: ''
        });
        return [
            root,
            line({ x: x - 52, y: y - 16, endX: x - 28, endY: y + 16 }),
            line({ x: x - 16, y: y - 16, endX: x + 8, endY: y + 16 }),
            line({ x: x + 20, y: y - 16, endX: x + 44, endY: y + 16 })
        ];
    }

    return [];
};

const getLineMetrics = (element) => {
    if (!element || !MEASURABLE_TYPES.includes(element.type)) return null;
    const dx = element.endX - element.x;
    const dy = element.endY - element.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const normalizedAngle = ((angle % 360) + 360) % 360;

    return {
        length,
        angle: normalizedAngle > 180 ? normalizedAngle - 360 : normalizedAngle,
        midpoint: {
            x: element.x + dx / 2,
            y: element.y + dy / 2
        }
    };
};

const formatMeasurementNumber = (value) => {
    if (!Number.isFinite(value)) return '0';
    if (value >= 100) return String(Math.round(value));
    if (value >= 10) return value.toFixed(1);
    return value.toFixed(2);
};

const parseMeasurementText = (text) => {
    if (!text) return null;
    const match = String(text).trim().toLowerCase().replace(',', '.').match(/(-?\d+(?:\.\d+)?)\s*(mm|millimeter|millimeters|cm|centimeter|centimeters|m|meter|meters|metre|metres)\b/);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) return null;

    const unit = match[2];
    if (unit === 'mm' || unit.startsWith('millimeter')) return value / 1000;
    if (unit === 'cm' || unit.startsWith('centimeter')) return value / 100;
    return value;
};

const formatPhysicalLength = (meters) => {
    if (!Number.isFinite(meters)) return '';
    if (meters >= 1) return `${formatMeasurementNumber(meters)} m`;
    if (meters >= 0.01) return `${formatMeasurementNumber(meters * 100)} cm`;
    return `${formatMeasurementNumber(meters * 1000)} mm`;
};

const getDrawingSettings = (elements = []) => (
    elements.find(el => el.type === 'settings' && el.id === SETTINGS_ELEMENT_ID) || null
);

const formatLengthWithSettings = (drawingUnits, settings = null) => {
    const scale = settings?.measurementScale?.metersPerUnit;
    return Number.isFinite(scale) && scale > 0
        ? formatPhysicalLength(drawingUnits * scale)
        : formatMeasurementNumber(drawingUnits);
};

const getMeasurementLabel = (element, settings = null) => {
    const metrics = getLineMetrics(element);
    if (!metrics) return '';
    return `L ${formatLengthWithSettings(metrics.length, settings)} · ${Math.round(metrics.angle)}°`;
};

const getShapeMetrics = (element, settings = null) => {
    if (!element || !SHAPE_DIMENSION_TYPES.includes(element.type)) return null;
    const bounds = getElementBounds(element);
    if (!bounds || bounds.w < 1 || bounds.h < 1) return null;
    return {
        bounds,
        widthLabel: formatLengthWithSettings(bounds.w, settings),
        heightLabel: formatLengthWithSettings(bounds.h, settings)
    };
};

const transformBoxElement = (element, transformPoint, mode) => {
    const p1 = { x: element.x, y: element.y };
    const p2 = { x: element.x + element.w, y: element.y };
    const p3 = { x: element.x + element.w, y: element.y + element.h };
    const p4 = { x: element.x, y: element.y + element.h };

    if (mode === 'rotate90') {
        const rotated = [p1, p2, p3, p4].map(transformPoint);
        const minX = Math.min(...rotated.map(p => p.x));
        const minY = Math.min(...rotated.map(p => p.y));
        const maxX = Math.max(...rotated.map(p => p.x));
        const maxY = Math.max(...rotated.map(p => p.y));
        return {
            ...element,
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY
        };
    }

    const nextP1 = transformPoint(p1);
    const nextP3 = transformPoint(p3);
    return {
        ...element,
        x: nextP1.x,
        y: nextP1.y,
        w: nextP3.x - nextP1.x,
        h: nextP3.y - nextP1.y
    };
};

const DrawingBoard = ({ drawingId, leadId, onClose }) => {
    const canvasRef = useRef(null);
    const lastPointerRef = useRef({ x: 0, y: 0 });
    const saveTimeoutRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageCache = useRef({});
    const viewInitializedRef = useRef(false);
    const clipboardRef = useRef([]);
    
    // DB state
    const [isLoading, setIsLoading] = useState(!!drawingId);
    const [isSaving, setIsSaving] = useState(false);
    const [drawingName, setDrawingName] = useState('Ny Skitse');
    
    // Engine State
    const [elements, setElements] = useState([]);
    const [history, setHistory] = useState([]); // Stack of previous states
    const [appState, setAppState] = useState({
        tool: 'select', // 'select', 'pen', 'eraser', 'rectangle', 'arrow', 'image', 'text', 'dimension'
        color: '#0f172a',
        strokeWidth: 3,
        selectedElementId: null,
        drillDown: false,
        editingTextId: null, // For text and dimension input
        dragging: false,
        rotating: false,
        resizing: false, // false or 'nw', 'ne', 'sw', 'se'
        actionStartPoint: null, 
        initialRotation: 0,
        zoom: 1,
        selectedElementIds: [],
        marqueeStartPoint: null,
        marqueeCurrentPoint: null,
        isSpaceDown: false,
        showGrid: false,
        fontSize: 20,
        snapPoint: null
    });
    const activeZoomRef = useRef(1);
    const activePanRef = useRef({ x: 0, y: 0 });
    const overlaysContainerRef = useRef(null);
    const activeElementsRef = useRef(elements);
    const activeModuleIdsRef = useRef([]);
    const selectionOverlayRef = useRef(null);
    const startHandleRef = useRef(null);
    const endHandleRef = useRef(null);
    const lastActionPointRef = useRef({ x: 0, y: 0 });
    const dragHistoryPushedRef = useRef(false);
    const [showShapesMenu, setShowShapesMenu] = useState(false);
    const [showColorMenu, setShowColorMenu] = useState(false);
    const [showSymbolsMenu, setShowSymbolsMenu] = useState(false);

    const getOverlayTransform = useCallback(() => {
        const zoom = activeZoomRef.current;
        const pan = activePanRef.current;
        return `matrix(${zoom}, 0, 0, ${zoom}, ${pan.x}, ${pan.y})`;
    }, []);

    const syncOverlayTransform = useCallback(() => {
        if (overlaysContainerRef.current) {
            overlaysContainerRef.current.style.transform = getOverlayTransform();
        }
    }, [getOverlayTransform]);

    const getViewportCenter = useCallback(() => {
        const container = containerRef.current;
        const width = container?.clientWidth || window.innerWidth;
        const height = container?.clientHeight || window.innerHeight;
        return {
            x: (width / 2 - activePanRef.current.x) / activeZoomRef.current,
            y: (height / 2 - activePanRef.current.y) / activeZoomRef.current
        };
    }, []);

    // Save to history before modifying
    const pushHistory = useCallback((newElements) => {
        setHistory(prev => [...prev, newElements]);
    }, []);

    const constrainAngle = (origin, point) => {
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;
        const distance = Math.hypot(dx, dy);
        if (!distance) return point;
        const snap = Math.PI / 4;
        const angle = Math.atan2(dy, dx);
        const snappedAngle = Math.round(angle / snap) * snap;
        return {
            x: origin.x + Math.cos(snappedAngle) * distance,
            y: origin.y + Math.sin(snappedAngle) * distance
        };
    };

    const getSelectedIds = useCallback(() => {
        if (appState.selectedElementIds?.length > 0) return appState.selectedElementIds;
        if (appState.selectedElementId) return [appState.selectedElementId];
        return [];
    }, [appState.selectedElementId, appState.selectedElementIds]);

    const getSelectionWithChildren = useCallback((ids = getSelectedIds()) => {
        const selectedSet = new Set(ids);
        activeElementsRef.current.forEach(el => {
            if (selectedSet.has(el.id) && el.parentId) selectedSet.add(el.parentId);
        });

        let added = true;

        while (added) {
            added = false;
            activeElementsRef.current.forEach(el => {
                if (el.parentId && selectedSet.has(el.parentId) && !selectedSet.has(el.id)) {
                    selectedSet.add(el.id);
                    added = true;
                }
            });
        }

        return Array.from(selectedSet);
    }, [getSelectedIds]);

    const updateSelectedElements = useCallback((updater) => {
        const selectedIds = getSelectionWithChildren();
        if (selectedIds.length === 0) return false;
        pushHistory(activeElementsRef.current);
        const updatedElements = activeElementsRef.current.map(el => (
            selectedIds.includes(el.id) ? updater(el) : el
        ));
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        return true;
    }, [getSelectionWithChildren, pushHistory]);

    const applyColor = useCallback((color) => {
        const changedSelection = updateSelectedElements(el => ({ ...el, color }));
        setAppState(s => ({ ...s, color, tool: s.tool === 'eraser' ? 'pen' : s.tool }));
        return changedSelection;
    }, [updateSelectedElements]);

    const applyStrokeWidth = useCallback((strokeWidth) => {
        const changedSelection = updateSelectedElements(el => ({ ...el, strokeWidth }));
        setAppState(s => ({ ...s, strokeWidth }));
        return changedSelection;
    }, [updateSelectedElements]);

    const applyFontSize = useCallback((fontSize) => {
        const changedSelection = updateSelectedElements(el => {
            if (el.type !== 'text' && el.type !== 'dimension') return el;
            return {
                ...el,
                fontSize,
                h: el.type === 'text' ? Math.max(el.h || 0, fontSize + 12) : el.h
            };
        });
        setAppState(s => ({ ...s, fontSize }));
        return changedSelection;
    }, [updateSelectedElements]);

    const copySelectedElements = useCallback(() => {
        const selectedIds = getSelectionWithChildren();
        clipboardRef.current = activeElementsRef.current
            .filter(el => selectedIds.includes(el.id))
            .map(el => JSON.parse(JSON.stringify(el)));
    }, [getSelectionWithChildren]);

    const pasteElements = useCallback(() => {
        if (clipboardRef.current.length === 0) return;
        pushHistory(activeElementsRef.current);
        const idMap = new Map();
        const pasted = clipboardRef.current.map(el => {
            const id = generateId();
            idMap.set(el.id, id);
            const next = { ...JSON.parse(JSON.stringify(el)), id };
            if (next.parentId && idMap.has(next.parentId)) next.parentId = idMap.get(next.parentId);
            if (next.type === 'pen' && next.points) {
                next.points = next.points.map(p => ({ ...p, x: p.x + 32, y: p.y + 32 }));
            } else if (next.type === 'line' || next.type === 'arrow' || next.type === 'dimension') {
                next.x += 32; next.y += 32; next.endX += 32; next.endY += 32;
            } else {
                next.x += 32; next.y += 32;
            }
            return next;
        });
        const updatedElements = [...activeElementsRef.current, ...pasted];
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({
            ...s,
            tool: 'select',
            selectedElementId: pasted.length === 1 ? pasted[0].id : null,
            selectedElementIds: pasted.length > 1 ? pasted.map(el => el.id) : []
        }));
    }, [pushHistory]);

    const duplicateSelectedElements = useCallback(() => {
        copySelectedElements();
        pasteElements();
    }, [copySelectedElements, pasteElements]);

    const moveSelectedLayer = useCallback((direction) => {
        const selectedIds = getSelectionWithChildren();
        if (selectedIds.length === 0) return;
        pushHistory(activeElementsRef.current);
        const selectedSet = new Set(selectedIds);
        const selected = activeElementsRef.current.filter(el => selectedSet.has(el.id));
        const rest = activeElementsRef.current.filter(el => !selectedSet.has(el.id));
        const updatedElements = direction === 'front' ? [...rest, ...selected] : [...selected, ...rest];
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
    }, [getSelectionWithChildren, pushHistory]);

    const transformSelectedElements = useCallback((mode) => {
        const selectedIds = getSelectionWithChildren();
        if (selectedIds.length === 0) return;

        const selectedSet = new Set(selectedIds);
        const selectedElements = activeElementsRef.current.filter(el => selectedSet.has(el.id) && !el.locked);
        const bounds = getDrawingBounds(selectedElements);
        if (!bounds) return;

        const center = { x: bounds.cx, y: bounds.cy };
        const transformPoint = (point) => {
            if (mode === 'rotate90') {
                return {
                    x: center.x - (point.y - center.y),
                    y: center.y + (point.x - center.x)
                };
            }
            if (mode === 'flipH') {
                return { x: center.x * 2 - point.x, y: point.y };
            }
            if (mode === 'flipV') {
                return { x: point.x, y: center.y * 2 - point.y };
            }
            return point;
        };

        pushHistory(activeElementsRef.current);
        const updatedElements = activeElementsRef.current.map(el => {
            if (!selectedSet.has(el.id) || el.locked || el.type === 'settings') return el;

            if (el.type === 'pen' || el.type === 'freehand') {
                return {
                    ...el,
                    points: (el.points || []).map(transformPoint)
                };
            }

            if (el.type === 'line' || el.type === 'arrow' || el.type === 'dimension') {
                const start = transformPoint({ x: el.x, y: el.y });
                const end = transformPoint({ x: el.endX, y: el.endY });
                return {
                    ...el,
                    x: start.x,
                    y: start.y,
                    endX: end.x,
                    endY: end.y
                };
            }

            if (['rectangle', 'image', 'text', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(el.type)) {
                return transformBoxElement(el, transformPoint, mode);
            }

            return el;
        });

        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({ ...s, tool: 'select', editingTextId: null }));
    }, [getSelectionWithChildren, pushHistory]);

    const insertSymbol = useCallback((symbolId, pos) => {
        const symbolElements = createSymbolElements(symbolId, pos, appState.color, appState.strokeWidth);
        if (symbolElements.length === 0) return;

        pushHistory(activeElementsRef.current);
        const updatedElements = [...activeElementsRef.current, ...symbolElements];
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setShowSymbolsMenu(false);
        setAppState(s => ({
            ...s,
            tool: 'select',
            selectedElementId: symbolElements[0].id,
            selectedElementIds: [],
            editingTextId: null,
            dragging: false
        }));
    }, [appState.color, appState.strokeWidth, pushHistory]);

    const updateSelectedDimensionText = useCallback((text) => {
        const dimensionId = appState.selectedElementId;
        const dimensionElement = activeElementsRef.current.find(el => el.id === dimensionId);
        if (!dimensionElement || dimensionElement.type !== 'dimension') return;
        pushHistory(activeElementsRef.current);
        const updatedElements = activeElementsRef.current.map(el => (
            el.id === dimensionId ? { ...el, text } : el
        ));
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
    }, [appState.selectedElementId, pushHistory]);

    const calibrateFromSelectedDimension = useCallback(() => {
        const dimensionId = appState.selectedElementId;
        const dimensionElement = activeElementsRef.current.find(el => el.id === dimensionId);
        const metrics = getLineMetrics(dimensionElement);
        const physicalMeters = parseMeasurementText(dimensionElement?.text);

        if (!dimensionElement || dimensionElement.type !== 'dimension' || !metrics || metrics.length < 1) {
            toast.error('Vælg en mållinje først.');
            return;
        }

        if (!physicalMeters) {
            toast.error('Skriv et rigtigt mål først, fx 250 cm eller 5 m.');
            return;
        }

        const metersPerUnit = physicalMeters / metrics.length;
        const settingsElement = {
            id: SETTINGS_ELEMENT_ID,
            type: 'settings',
            measurementScale: {
                metersPerUnit,
                sourceDimensionId: dimensionId,
                sourceText: dimensionElement.text,
                updatedAt: new Date().toISOString()
            }
        };

        pushHistory(activeElementsRef.current);
        const hasSettings = activeElementsRef.current.some(el => el.id === SETTINGS_ELEMENT_ID && el.type === 'settings');
        const updatedElements = hasSettings
            ? activeElementsRef.current.map(el => (el.id === SETTINGS_ELEMENT_ID ? settingsElement : el))
            : [settingsElement, ...activeElementsRef.current];

        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        toast.success(`Målestok sat: ${formatPhysicalLength(metersPerUnit)} pr. tegneenhed`);
    }, [appState.selectedElementId, pushHistory]);

    const addDimensionForSelectedShape = useCallback((axis) => {
        const shapeId = appState.selectedElementId;
        const shapeElement = activeElementsRef.current.find(el => el.id === shapeId);
        const settings = getDrawingSettings(activeElementsRef.current);
        const shapeMetrics = getShapeMetrics(shapeElement, settings);

        if (!shapeElement || !shapeMetrics) {
            toast.error('Vælg en figur først.');
            return;
        }

        const { bounds } = shapeMetrics;
        const offset = 28;
        const isHorizontal = axis === 'width';
        const dimension = {
            id: generateId(),
            type: 'dimension',
            parentId: shapeElement.id,
            color: shapeElement.color || appState.color,
            strokeWidth: shapeElement.strokeWidth || appState.strokeWidth,
            rotation: 0,
            x: isHorizontal ? bounds.x : bounds.x + bounds.w + offset,
            y: isHorizontal ? bounds.y + bounds.h + offset : bounds.y,
            endX: isHorizontal ? bounds.x + bounds.w : bounds.x + bounds.w + offset,
            endY: isHorizontal ? bounds.y + bounds.h + offset : bounds.y + bounds.h,
            text: isHorizontal ? shapeMetrics.widthLabel : shapeMetrics.heightLabel,
            fontSize: appState.fontSize || 16
        };

        pushHistory(activeElementsRef.current);
        const updatedElements = [...activeElementsRef.current, dimension];
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({
            ...s,
            tool: 'select',
            selectedElementId: dimension.id,
            selectedElementIds: [],
            editingTextId: null
        }));
    }, [appState.color, appState.fontSize, appState.selectedElementId, appState.strokeWidth, pushHistory]);

    const toggleSelectedLock = useCallback(() => {
        const selectedIds = getSelectionWithChildren();
        if (selectedIds.length === 0) return;
        const selectedSet = new Set(selectedIds);
        const shouldLock = activeElementsRef.current.some(el => selectedSet.has(el.id) && !el.locked && el.type !== 'settings');

        pushHistory(activeElementsRef.current);
        const updatedElements = activeElementsRef.current.map(el => (
            selectedSet.has(el.id) && el.type !== 'settings'
                ? { ...el, locked: shouldLock }
                : el
        ));
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
    }, [getSelectionWithChildren, pushHistory]);

    const moveSelectedElements = useCallback((dx, dy) => {
        const selectedIds = getSelectedIds();
        if (selectedIds.length === 0) return;
        pushHistory(activeElementsRef.current);
        const selectedSet = new Set(selectedIds);
        const updatedElements = activeElementsRef.current.map(el => {
            const isMoving = selectedSet.has(el.id) || selectedSet.has(el.parentId);
            if (!isMoving || el.locked) return el;
            if (el.type === 'pen') {
                return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
            }
            if (el.type === 'arrow' || el.type === 'line' || el.type === 'dimension') {
                return { ...el, x: el.x + dx, y: el.y + dy, endX: el.endX + dx, endY: el.endY + dy };
            }
            return { ...el, x: el.x + dx, y: el.y + dy };
        });
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
    }, [getSelectedIds, pushHistory]);

    const handleUndo = () => {
        if (history.length === 0) return;
        const previousState = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        activeElementsRef.current = previousState;
        setElements(previousState);
        setAppState(s => ({ ...s, selectedElementId: null, selectedElementIds: [], editingTextId: null }));
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowShapesMenu(false);
                setShowColorMenu(false);
                setShowSymbolsMenu(false);
                setAppState(s => ({
                    ...s,
                    tool: 'select',
                    editingTextId: null,
                    dragging: false,
                    rotating: false,
                    resizing: false,
                    marqueeStartPoint: null,
                    marqueeCurrentPoint: null,
                    snapPoint: null
                }));
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !appState.editingTextId) {
                e.preventDefault();
                if (history.length === 0) return;
                const previousState = history[history.length - 1];
                setHistory(prev => prev.slice(0, -1));
                activeElementsRef.current = previousState;
                setElements(previousState);
                setAppState(s => ({ ...s, selectedElementId: null, selectedElementIds: [], editingTextId: null }));
                return;
            }
            if ((e.metaKey || e.ctrlKey) && !appState.editingTextId && !isTyping) {
                const key = e.key.toLowerCase();
                if (key === 'c') {
                    e.preventDefault();
                    copySelectedElements();
                    return;
                }
                if (key === 'v') {
                    e.preventDefault();
                    pasteElements();
                    return;
                }
                if (key === 'd') {
                    e.preventDefault();
                    duplicateSelectedElements();
                    return;
                }
            }
            if (e.code === 'Space' && !isTyping) {
                e.preventDefault();
                setAppState(s => ({ ...s, isSpaceDown: true }));
            }
            if ((e.key === 'Backspace' || e.key === 'Delete') && !appState.editingTextId) {
                if (appState.selectedElementId) {
                    const selectedIds = getSelectionWithChildren([appState.selectedElementId]);
                    pushHistory(elements);
                    const updatedElements = activeElementsRef.current.filter(el => el.locked || !selectedIds.includes(el.id));
                    activeElementsRef.current = updatedElements;
                    setElements(updatedElements);
                    setAppState(s => ({ ...s, selectedElementId: null }));
                } else if (appState.selectedElementIds && appState.selectedElementIds.length > 0) {
                    const selectedIds = getSelectionWithChildren(appState.selectedElementIds);
                    pushHistory(elements);
                    const updatedElements = activeElementsRef.current.filter(el => el.locked || !selectedIds.includes(el.id));
                    activeElementsRef.current = updatedElements;
                    setElements(updatedElements);
                    setAppState(s => ({ ...s, selectedElementIds: [] }));
                }
            }
            if (!appState.editingTextId && !isTyping && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
                const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
                moveSelectedElements(dx, dy);
                return;
            }
        };
        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                setAppState(s => ({ ...s, isSpaceDown: false }));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [appState.selectedElementId, appState.selectedElementIds, appState.editingTextId, elements, history, pushHistory, copySelectedElements, pasteElements, duplicateSelectedElements, moveSelectedElements, getSelectionWithChildren]);

    // Rendering Engine
    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Reset transform to clear the whole canvas
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const dpr = window.devicePixelRatio || 1;
        const cssWidth = canvas.width / dpr;
        const cssHeight = canvas.height / dpr;
        const zoom = activeZoomRef.current;
        const pan = activePanRef.current;

        // Map drawing-space coordinates to CSS pixels, then to backing-store pixels.
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * pan.x, dpr * pan.y);

        if (appState.showGrid) {
            drawGrid(ctx, cssWidth, cssHeight);
        }
        
        const elementsToDraw = activeElementsRef.current || elements;
        elementsToDraw.forEach(el => {
            if (el.type === 'settings') return;
            ctx.save();
            
            // Apply transformations
            const bounds = getElementBounds(el);
            if (el.rotation) {
                ctx.translate(bounds.cx, bounds.cy);
                ctx.rotate(el.rotation);
                ctx.translate(-bounds.cx, -bounds.cy);
            }

            ctx.strokeStyle = el.color || '#0f172a';
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
                ctx.ellipse(el.x + el.w/2, el.y + el.h/2, Math.abs(el.w)/2, Math.abs(el.h)/2, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else if (el.type === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(el.x + el.w/2, el.y);
                ctx.lineTo(el.x + el.w, el.y + el.h);
                ctx.lineTo(el.x, el.y + el.h);
                ctx.closePath();
                ctx.stroke();
            } else if (el.type === 'polygon') {
                const cx = el.x + el.w/2;
                const cy = el.y + el.h/2;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3 - Math.PI / 2;
                    ctx.lineTo(cx + (el.w/2) * Math.cos(angle), cy + (el.h/2) * Math.sin(angle));
                }
                ctx.closePath();
                ctx.stroke();
            } else if (el.type === 'rhombus') {
                ctx.beginPath();
                ctx.moveTo(el.x + el.w/2, el.y);
                ctx.lineTo(el.x + el.w, el.y + el.h/2);
                ctx.lineTo(el.x + el.w/2, el.y + el.h);
                ctx.lineTo(el.x, el.y + el.h/2);
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
                
                // Arrow head
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

                if (el.text && el.id !== appState.editingTextId) {
                    const fontSize = el.fontSize || 16;
                    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const textWidth = ctx.measureText(el.text).width;
                    
                    ctx.save();
                    ctx.translate(el.x + dx/2, el.y + dy/2);
                    let textAngle = angle;
                    if (textAngle > Math.PI/2 || textAngle < -Math.PI/2) textAngle += Math.PI; // Keep readable
                    ctx.rotate(textAngle);
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(-textWidth/2 - 6, -fontSize / 2 - 4, textWidth + 12, fontSize + 8);
                    ctx.fillStyle = el.color || '#0f172a';
                    ctx.fillText(el.text, 0, 0);
                    ctx.restore();
                }
            } else if (el.type === 'text') {
                if (el.text && el.id !== appState.editingTextId) {
                    ctx.font = `600 ${el.fontSize || 20}px Inter, sans-serif`;
                    ctx.textBaseline = 'top';
                    ctx.fillStyle = el.color || '#0f172a';
                    ctx.fillText(el.text, el.x, el.y);
                }
            } else if (el.type === 'image') {
                if (el.dataUrl) {
                    if (imageCache.current[el.id]) {
                        ctx.drawImage(imageCache.current[el.id], el.x, el.y, el.w, el.h);
                    } else {
                        const img = new window.Image();
                        img.src = el.dataUrl;
                        img.onload = () => {
                            imageCache.current[el.id] = img;
                            redraw();
                        };
                    }
                }
            }

            ctx.restore();
        });
    }, [appState.editingTextId, appState.showGrid]); // Element changes redraw through activeElementsRef.

    const fitDrawingToView = useCallback((sourceElements = activeElementsRef.current) => {
        const container = containerRef.current;
        if (!container) return;

        const bounds = getDrawingBounds(sourceElements);
        if (!bounds) {
            activeZoomRef.current = 1;
            activePanRef.current = { x: 0, y: 0 };
            setAppState(s => ({ ...s, zoom: 1 }));
            syncOverlayTransform();
            redraw();
            return;
        }

        const padding = 96;
        const viewW = Math.max(1, container.clientWidth);
        const viewH = Math.max(1, container.clientHeight);
        const availableW = Math.max(1, viewW - padding * 2);
        const availableH = Math.max(1, viewH - padding * 2);
        const nextZoom = Math.min(Math.max(Math.min(availableW / bounds.w, availableH / bounds.h), 0.1), 6);
        const nextPan = {
            x: viewW / 2 - bounds.cx * nextZoom,
            y: viewH / 2 - bounds.cy * nextZoom
        };

        activeZoomRef.current = nextZoom;
        activePanRef.current = nextPan;
        setAppState(s => ({ ...s, zoom: nextZoom }));
        syncOverlayTransform();
        redraw();
    }, [redraw, syncOverlayTransform]);

    // Canvas Resize Observer
    useEffect(() => {
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (canvas && container) {
                canvas.width = container.clientWidth * window.devicePixelRatio;
                canvas.height = container.clientHeight * window.devicePixelRatio;
                canvas.style.width = `${container.clientWidth}px`;
                canvas.style.height = `${container.clientHeight}px`;
                
                redraw();
            }
        };

        window.addEventListener('resize', resizeCanvas);
        setTimeout(resizeCanvas, 100);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [redraw]);

    // Draw on elements change
    useEffect(() => {
        activeElementsRef.current = elements;
        redraw();
    }, [elements, redraw]);

    useEffect(() => {
        redraw();
    }, [appState.editingTextId, appState.showGrid, redraw]);

    useEffect(() => {
        viewInitializedRef.current = false;
    }, [drawingId]);

    useEffect(() => {
        if (isLoading || viewInitializedRef.current) return;
        viewInitializedRef.current = true;
        requestAnimationFrame(() => fitDrawingToView(activeElementsRef.current));
    }, [elements, fitDrawingToView, isLoading]);

    // Load Data
    useEffect(() => {
        if (!drawingId || drawingId === 'new') {
            setIsLoading(false);
            const localStr = localStorage.getItem('autosave_drawing_new');
            if (localStr) {
                try {
                    const localData = JSON.parse(localStr);
                    if (localData.elements && localData.elements.length > 0) {
                        setElements(localData.elements);
                        setDrawingName(localData.name || 'Ny Skitse');
                        toast.success('Gendannede kladde!');
                    }
                } catch(e) {}
            }
            return;
        }

        const loadDrawing = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase.from('drawings').select('*').eq('id', drawingId).single();
                if (error) throw error;
                if (data) {
                    let finalElements = data.document_data && Array.isArray(data.document_data) ? data.document_data : [];
                    let finalName = data.name || 'Ny Skitse';
                    
                    // Check local autosave
                    const localStr = localStorage.getItem(`autosave_drawing_${drawingId}`);
                    if (localStr) {
                        try {
                            const localData = JSON.parse(localStr);
                            const dbTime = new Date(data.updated_at || 0).getTime();
                            if (localData.timestamp > dbTime) {
                                finalElements = localData.elements;
                                finalName = localData.name;
                                toast.success('Gendannede ændringer der ikke var gemt!');
                            }
                        } catch(e) {}
                    }
                    
                    setElements(finalElements);
                    setDrawingName(finalName);
                }
            } catch (err) {
                console.error("Fejl:", err);
                toast.error('Kunne ikke indlæse skitsen');
            } finally {
                setIsLoading(false);
            }
        };
        
        loadDrawing();
    }, [drawingId]);

    // LocalStorage Autosave (Debounced to prevent lag)
    useEffect(() => {
        if (!isLoading) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                const saveKey = `autosave_drawing_${drawingId || 'new'}`;
                localStorage.setItem(saveKey, JSON.stringify({
                    timestamp: Date.now(),
                    elements,
                    name: drawingName
                }));
            }, 1000);
        }
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [elements, drawingName, drawingId, isLoading]);

    // Interaction Helpers
    const getPointerPos = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const unscaledX = clientX - rect.left;
        const unscaledY = clientY - rect.top;
        return { 
            x: (unscaledX - activePanRef.current.x) / activeZoomRef.current, 
            y: (unscaledY - activePanRef.current.y) / activeZoomRef.current 
        };
    };

    // Pointer Events
    const handlePointerDown = (e) => {
        if (e.button === 1 || e.button === 2 || appState.isSpaceDown) {
            lastPointerRef.current = { x: e.clientX || (e.touches && e.touches[0].clientX) || 0, y: e.clientY || (e.touches && e.touches[0].clientY) || 0 };
            setAppState(s => ({ ...s, panning: true }));
            return;
        }
        const pos = getPointerPos(e);
        lastActionPointRef.current = pos;
        dragHistoryPushedRef.current = false;

        if (appState.tool.startsWith(SYMBOL_TOOL_PREFIX)) {
            insertSymbol(appState.tool.replace(SYMBOL_TOOL_PREFIX, ''), pos);
            return;
        }
        
        if (appState.tool === 'select') {
            const clickedElement = getElementAtPosition(pos.x, pos.y, activeElementsRef.current);
            if (clickedElement) {
                if (clickedElement.id === appState.selectedElementId && (clickedElement.type === 'text' || clickedElement.type === 'dimension')) {
                    setAppState(s => ({ ...s, editingTextId: clickedElement.id }));
                } else {
                    let moduleIds = [clickedElement.id];
                    if (!appState.drillDown) {
                        const moduleRootId = clickedElement.parentId || clickedElement.id;
                        moduleIds = getConnectedModule(moduleRootId, activeElementsRef.current);
                        if (!moduleIds.includes(clickedElement.id)) moduleIds.push(clickedElement.id);
                    }
                    activeModuleIdsRef.current = moduleIds;

                    setAppState(s => ({ 
                        ...s, 
                        selectedElementId: clickedElement.id, 
                        dragging: !clickedElement.locked, 
                        actionStartPoint: pos,
                        editingTextId: null
                    }));
                }
            } else {
                setAppState(s => ({ 
                    ...s, 
                    selectedElementId: null, 
                    selectedElementIds: [],
                    editingTextId: null, 
                    marqueeStartPoint: pos,
                    marqueeCurrentPoint: pos
                }));
            }
        } 
        else if (appState.tool === 'eraser') {
            const clickedElement = getElementAtPosition(pos.x, pos.y, activeElementsRef.current);
            if (clickedElement && !clickedElement.locked) {
                pushHistory(elements);
                const updatedElements = activeElementsRef.current.filter(el => el.id !== clickedElement.id);
                activeElementsRef.current = updatedElements;
                setElements(updatedElements);
            }
        }
        else {
            pushHistory(elements);
            let newElement = {
                id: generateId(),
                type: appState.tool,
                color: appState.color,
                strokeWidth: appState.strokeWidth,
                rotation: 0
            };

            if (appState.tool === 'pen') {
                newElement.points = [pos];
            } else if (['rectangle', 'text', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool)) {
                newElement.x = pos.x;
                newElement.y = pos.y;
                newElement.w = appState.tool === 'text' ? 100 : 100;
                newElement.h = appState.tool === 'text' ? 30 : 100;
                newElement.text = '';
                if (appState.tool === 'text') newElement.fontSize = appState.fontSize;
            } else if (appState.tool === 'arrow' || appState.tool === 'dimension' || appState.tool === 'line' || appState.tool === 'callout') {
                if (appState.tool === 'callout') {
                    newElement.type = 'arrow';
                    newElement.callout = true;
                }
                newElement.x = pos.x;
                newElement.y = pos.y;
                newElement.endX = pos.x;
                newElement.endY = pos.y;
                newElement.text = '';
            }

            const updatedElements = [...activeElementsRef.current, newElement];
            activeElementsRef.current = updatedElements;
            setElements(updatedElements);
            setAppState(s => ({ 
                ...s, 
                selectedElementId: newElement.id, 
                dragging: true, 
                actionStartPoint: pos,
                editingTextId: appState.tool === 'text' ? newElement.id : null
            }));
            
            // Calculate module IDs ONCE when drag starts
            let moduleIds = [newElement.id];
            if (!appState.drillDown) {
                moduleIds = getConnectedModule(newElement.id, elements);
            }
            activeModuleIdsRef.current = moduleIds;
            return;
        }
    };

    const handlePointerMove = (e) => {
        if (appState.panning) {
            const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            const dx = currentX - lastPointerRef.current.x;
            const dy = currentY - lastPointerRef.current.y;
            
            activePanRef.current = { x: activePanRef.current.x + dx, y: activePanRef.current.y + dy };
            lastPointerRef.current = { x: currentX, y: currentY };
            
            syncOverlayTransform();
            
            redraw();
            return;
        }
        
        if (appState.marqueeStartPoint) {
            setAppState(s => ({ ...s, marqueeCurrentPoint: getPointerPos(e) }));
            return;
        }

        if (!appState.dragging && !appState.rotating && !appState.resizing) return;
        const pos = getPointerPos(e);

        if (appState.resizing && appState.selectedElementId) {
            activeElementsRef.current = activeElementsRef.current.map(el => {
                if (el.id !== appState.selectedElementId) return el;
                const bounds = getElementBounds(el);
                let localPos = pos;
                if (el.rotation) localPos = rotatePoint(pos, {x: bounds.cx, y: bounds.cy}, -el.rotation);

                if (el.type === 'rectangle' || el.type === 'image' || el.type === 'text' || el.type === 'circle' || el.type === 'triangle' || el.type === 'polygon' || el.type === 'rhombus' || el.type === 'parallelogram') {
                    let { x, y, w, h } = el;
                    if (appState.resizing.includes('w')) { w += x - localPos.x; x = localPos.x; }
                    if (appState.resizing.includes('e')) { w = localPos.x - x; }
                    if (appState.resizing.includes('n')) { h += y - localPos.y; y = localPos.y; }
                    if (appState.resizing.includes('s')) { h = localPos.y - y; }
                    if (w < 10) w = 10;
                    if (h < 10) h = 10;
                    return { ...el, x, y, w, h };
                }
                
                if (el.type === 'arrow' || el.type === 'dimension' || el.type === 'line') {
                    if (appState.resizing === 'start') {
                        const snap = findSnapPoint(localPos, activeElementsRef.current, el.id);
                        setAppState(s => ({ ...s, snapPoint: snap }));
                        const rawPos = snap || localPos;
                        const nextPos = e.shiftKey ? constrainAngle({ x: el.endX, y: el.endY }, rawPos) : rawPos;
                        return { ...el, x: nextPos.x, y: nextPos.y };
                    }
                    if (appState.resizing === 'end') {
                        const snap = findSnapPoint(localPos, activeElementsRef.current, el.id);
                        setAppState(s => ({ ...s, snapPoint: snap }));
                        const rawPos = snap || localPos;
                        const nextPos = e.shiftKey ? constrainAngle({ x: el.x, y: el.y }, rawPos) : rawPos;
                        return { ...el, endX: nextPos.x, endY: nextPos.y };
                    }
                }
                
                return el;
            });
            
            // Sync single overlay box if present
            if (selectionOverlayRef.current) {
                const el = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
                if (el) {
                    const bounds = getElementBounds(el);
                    const endpointHandleSize = 10 / (activeZoomRef.current || 1);
                    selectionOverlayRef.current.style.left = `${bounds.x}px`;
                    selectionOverlayRef.current.style.top = `${bounds.y}px`;
                    selectionOverlayRef.current.style.width = `${bounds.w}px`;
                    selectionOverlayRef.current.style.height = `${bounds.h}px`;
                    
                    if (startHandleRef.current) {
                        startHandleRef.current.style.left = `${el.x - bounds.x - endpointHandleSize / 2}px`;
                        startHandleRef.current.style.top = `${el.y - bounds.y - endpointHandleSize / 2}px`;
                    }
                    if (endHandleRef.current) {
                        endHandleRef.current.style.left = `${el.endX - bounds.x - endpointHandleSize / 2}px`;
                        endHandleRef.current.style.top = `${el.endY - bounds.y - endpointHandleSize / 2}px`;
                    }
                }
            }
            redraw();
            return;
        }

        if (appState.rotating && appState.selectedElementId) {
            const el = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
            if (!el) return;
            const bounds = getElementBounds(el);
            const angle = Math.atan2(pos.y - bounds.cy, pos.x - bounds.cx);
            const rotation = angle + Math.PI / 2;
            
            activeElementsRef.current = activeElementsRef.current.map(e => e.id === appState.selectedElementId ? { ...e, rotation } : e);
            redraw();
            return;
        }

        if (appState.dragging && (appState.selectedElementId || (appState.selectedElementIds && appState.selectedElementIds.length > 0))) {
            const dx = pos.x - lastActionPointRef.current.x;
            const dy = pos.y - lastActionPointRef.current.y;

            if (appState.tool === 'select' && !dragHistoryPushedRef.current && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
                pushHistory(activeElementsRef.current);
                dragHistoryPushedRef.current = true;
            }

            let moduleIds = appState.selectedElementId ? activeModuleIdsRef.current : appState.selectedElementIds;

            activeElementsRef.current = activeElementsRef.current.map(el => {
                const isMoving = moduleIds.includes(el.id) || moduleIds.includes(el.parentId);
                if (!isMoving) return el;
                if (el.locked) return el;

                if (appState.tool === 'select') {
                    if (el.type === 'pen') {
                        return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
                    } else if (el.type === 'arrow' || el.type === 'line' || el.type === 'dimension') {
                        return { ...el, x: el.x + dx, y: el.y + dy, endX: el.endX + dx, endY: el.endY + dy };
                    } else {
                        return { ...el, x: el.x + dx, y: el.y + dy };
                    }
                } 
                else if (appState.tool === 'pen') {
                    return { ...el, points: [...el.points, pos] };
                }
                else if (['rectangle', 'circle', 'image', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool)) {
                    const snap = findSnapPoint(pos, activeElementsRef.current, el.id);
                    setAppState(s => ({ ...s, snapPoint: snap }));
                    const endPos = snap || pos;
                    let w = endPos.x - el.x;
                    let h = endPos.y - el.y;
                    if (e.shiftKey && appState.tool !== 'image') {
                        const size = Math.max(Math.abs(w), Math.abs(h));
                        w = Math.sign(w || 1) * size;
                        h = Math.sign(h || 1) * size;
                    }
                    return { ...el, w, h };
                }
                else if (['arrow', 'dimension', 'line', 'callout'].includes(appState.tool)) {
                    const snap = findSnapPoint(pos, activeElementsRef.current, el.id);
                    setAppState(s => ({ ...s, snapPoint: snap }));
                    const rawEndPos = snap || pos;
                    const endPos = e.shiftKey ? constrainAngle({ x: el.x, y: el.y }, rawEndPos) : rawEndPos;
                    return { ...el, endX: endPos.x, endY: endPos.y };
                }
                return el;
            });

            // Sync overlays directly via DOM during drag to avoid React render
            if (appState.selectedElementId && selectionOverlayRef.current) {
                    const el = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
                if (el) {
                    const bounds = getElementBounds(el);
                    const endpointHandleSize = 10 / (activeZoomRef.current || 1);
                    selectionOverlayRef.current.style.left = `${bounds.x}px`;
                    selectionOverlayRef.current.style.top = `${bounds.y}px`;
                    selectionOverlayRef.current.style.width = `${bounds.w}px`;
                    selectionOverlayRef.current.style.height = `${bounds.h}px`;
                    
                    if (startHandleRef.current) {
                        startHandleRef.current.style.left = `${el.x - bounds.x - endpointHandleSize / 2}px`;
                        startHandleRef.current.style.top = `${el.y - bounds.y - endpointHandleSize / 2}px`;
                    }
                    if (endHandleRef.current) {
                        endHandleRef.current.style.left = `${el.endX - bounds.x - endpointHandleSize / 2}px`;
                        endHandleRef.current.style.top = `${el.endY - bounds.y - endpointHandleSize / 2}px`;
                    }
                }
            } else if (appState.selectedElementIds && appState.selectedElementIds.length > 0) {
                appState.selectedElementIds.forEach(id => {
                    const el = activeElementsRef.current.find(e => e.id === id);
                    if (!el) return;
                    const bounds = getElementBounds(el);
                    const elNode = document.getElementById('multi-select-' + el.id);
                    if (elNode) {
                        elNode.style.left = `${bounds.x}px`;
                        elNode.style.top = `${bounds.y}px`;
                    }
                });
            }

            redraw();
            lastActionPointRef.current = pos;
        }
    };

    const handlePointerUp = () => {
        setAppState(s => ({ ...s, snapPoint: null }));
        if (appState.panning) {
            setAppState(s => ({ ...s, panning: false, pan: { ...activePanRef.current } }));
        }

        if (appState.marqueeStartPoint && appState.marqueeCurrentPoint) {
            const x1 = Math.min(appState.marqueeStartPoint.x, appState.marqueeCurrentPoint.x);
            const y1 = Math.min(appState.marqueeStartPoint.y, appState.marqueeCurrentPoint.y);
            const x2 = Math.max(appState.marqueeStartPoint.x, appState.marqueeCurrentPoint.x);
            const y2 = Math.max(appState.marqueeStartPoint.y, appState.marqueeCurrentPoint.y);
            
            // Allow clicking empty space to deselect without tiny marquee box
            if (x2 - x1 < 5 && y2 - y1 < 5) {
                setAppState(s => ({ ...s, marqueeStartPoint: null, marqueeCurrentPoint: null, selectedElementId: null, selectedElementIds: [] }));
                return;
            }

            const selectedIds = [];
            activeElementsRef.current.forEach(el => {
                const bounds = getElementBounds(el);
                if (!bounds) return;
                // Simple intersection: if center is inside the marquee
                if (bounds.cx >= x1 && bounds.cx <= x2 && bounds.cy >= y1 && bounds.cy <= y2) {
                    selectedIds.push(el.id);
                }
            });

            if (selectedIds.length === 1) {
                setAppState(s => ({ ...s, selectedElementId: selectedIds[0], selectedElementIds: [], marqueeStartPoint: null, marqueeCurrentPoint: null }));
            } else if (selectedIds.length > 1) {
                setAppState(s => ({ ...s, selectedElementId: null, selectedElementIds: selectedIds, marqueeStartPoint: null, marqueeCurrentPoint: null }));
            } else {
                setAppState(s => ({ ...s, marqueeStartPoint: null, marqueeCurrentPoint: null, selectedElementId: null, selectedElementIds: [] }));
            }
            return;
        }

        if (appState.dragging || appState.rotating || appState.resizing) {
            setAppState(s => ({ ...s, dragging: false, rotating: false, resizing: false }));
            
            // SYNCHRONIZE BYPASS TO REACT STATE
            setElements(activeElementsRef.current);
            
            const activeEl = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
            if (activeEl && appState.tool !== 'select') {
                // If drawing a rect/arrow that is tiny, remove it
                if (['rectangle', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(activeEl.type) && Math.abs(activeEl.w) < 5 && Math.abs(activeEl.h) < 5) {
                    const filtered = activeElementsRef.current.filter(e => e.id !== activeEl.id);
                    activeElementsRef.current = filtered;
                    setElements(filtered);
                }
                else if ((activeEl.type === 'arrow' || activeEl.type === 'dimension' || activeEl.type === 'line') && Math.abs(activeEl.endX - activeEl.x) < 5 && Math.abs(activeEl.endY - activeEl.y) < 5) {
                    const filtered = activeElementsRef.current.filter(e => e.id !== activeEl.id);
                    activeElementsRef.current = filtered;
                    setElements(filtered);
                }
                else if (appState.tool === 'callout' && activeEl.callout) {
                    const textId = generateId();
                    const newText = {
                        id: textId,
                        type: 'text',
                        parentId: activeEl.id,
                        text: '',
                        color: appState.color,
                        x: activeEl.endX + 16,
                        y: activeEl.endY - 10,
                        w: 140,
                        h: Math.max(30, (appState.fontSize || 20) + 12),
                        fontSize: appState.fontSize || 20
                    };
                    const updatedElements = [...activeElementsRef.current, newText];
                    activeElementsRef.current = updatedElements;
                    setElements(updatedElements);
                    setAppState(s => ({
                        ...s,
                        tool: 'select',
                        selectedElementId: textId,
                        selectedElementIds: [],
                        editingTextId: textId
                    }));
                }
                else if (activeEl.type === 'text' || activeEl.type === 'dimension') {
                    // Auto-focus text editing
                    setAppState(s => ({ ...s, editingTextId: activeEl.id }));
                }
            }
            
            // Automatically switch back to select after drawing a shape/line
            if (appState.tool !== 'select' && appState.tool !== 'eraser') {
                setAppState(s => ({ ...s, tool: 'select' }));
            }
        }
    };

    // Save Logic
    const handleSave = async () => {
        // Remove the early return if leadId is null, since generic drawings can have null leadId
        setIsSaving(true);
        const tid = toast.loading('Gemmer skitse...');
        try {
            // 1. Generate Thumbnail Blob (small JPEG)
            let thumbUrl = null;
            if (activeElementsRef.current.length > 0) {
                try {
                    const { canvas: thumbCanvas } = await renderElementsToCanvas(activeElementsRef.current, {
                        width: 1200,
                        height: 800,
                        padding: 60,
                        imageCache: imageCache.current
                    });
                    const blob = await new Promise(resolve => thumbCanvas.toBlob(resolve, 'image/jpeg', 0.86));
                    const fileName = `thumb_${drawingId || 'new'}_${Date.now()}.jpg`;

                    const { error: uploadError } = await supabase.storage
                        .from('uploads')
                        .upload(`drawings_thumbnails/${fileName}`, blob, { contentType: 'image/jpeg' });
                        
                    if (!uploadError) {
                        const { data: urlData } = supabase.storage
                            .from('uploads')
                            .getPublicUrl(`drawings_thumbnails/${fileName}`);
                        thumbUrl = urlData.publicUrl;
                    }
                } catch (thumbErr) {
                    console.error("Kunne ikke generere thumbnail:", thumbErr);
                }
            }

            // 2. Save to Database
            if (drawingId && drawingId !== 'new') {
                const updatePayload = { 
                    document_data: activeElementsRef.current, 
                    name: drawingName,
                    updated_at: new Date().toISOString()
                };
                if (thumbUrl) updatePayload.image_url = thumbUrl;
                
                const { error } = await supabase
                    .from('drawings')
                    .update(updatePayload)
                    .eq('id', drawingId);
                if (error) throw error;
                localStorage.removeItem(`autosave_drawing_${drawingId}`);
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                
                const payload = {
                    name: drawingName,
                    document_data: activeElementsRef.current,
                    user_id: user?.id
                };
                if (thumbUrl) payload.image_url = thumbUrl;
                
                if (leadId) {
                    payload.lead_id = leadId;
                }

                const { error } = await supabase
                    .from('drawings')
                    .insert([payload]);
                if (error) throw error;
                localStorage.removeItem('autosave_drawing_new');
            }
            
            toast.success('Skitse gemt!', { id: tid });
            if (onClose) onClose();
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Fejl ved gemning: ' + error.message, { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    const drawGrid = (ctx, width, height) => {
        ctx.save();
        ctx.fillStyle = '#cbd5e1'; // Very subtle slate-300
        const gridSize = 40; // 40px grid spacing
        const zoom = activeZoomRef.current;
        const pan = activePanRef.current;
        const startX = Math.floor((-pan.x / zoom) / gridSize) * gridSize;
        const startY = Math.floor((-pan.y / zoom) / gridSize) * gridSize;
        const endX = ((width - pan.x) / zoom) + gridSize;
        const endY = ((height - pan.y) / zoom) + gridSize;

        for (let x = startX; x < endX; x += gridSize) {
            for (let y = startY; y < endY; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    };

    const handleMakeOfficial = async () => {
        setIsSaving(true);
        const tid = toast.loading('Genererer officielt dokument...');
        
        try {
            const { canvas: exportCanvas } = await renderElementsToCanvas(activeElementsRef.current, {
                width: 2480,
                height: 1754,
                padding: 140,
                imageCache: imageCache.current
            });
            const blob = await new Promise(resolve => exportCanvas.toBlob(resolve, 'image/png'));
            const fileName = `drawing_${leadId}_${Date.now()}.png`;

            const { data, error } = await supabase.storage
                .from('uploads')
                .upload(`drawings/${fileName}`, blob, { contentType: 'image/png' });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('uploads')
                .getPublicUrl(`drawings/${fileName}`);

            const publicUrl = urlData.publicUrl;

            // Save to bilag
            const { error: dbError } = await supabase
                .from('bilag')
                .insert([{
                    lead_id: leadId,
                    file_url: publicUrl,
                    file_name: drawingName || 'Officiel Tegning',
                    file_type: 'image/png',
                    type: 'Drawing'
                }]);

            if (dbError) throw dbError;

            toast.success('Gemt som officielt bilag!', { id: tid });
            
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Fejl ved eksport: ' + error.message, { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    // Image Upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                pushHistory(elements);
                const center = getViewportCenter();
                const w = img.width > 600 ? 600 : img.width;
                const h = img.width > 600 ? (img.height * (600 / img.width)) : img.height;
                // Insert at the beginning so it's drawn behind other elements
                const newElement = {
                    id: generateId(),
                    type: 'image',
                    x: center.x - w / 2,
                    y: center.y - h / 2,
                    w,
                    h,
                    rotation: 0,
                    locked: true,
                    dataUrl: event.target.result
                };
                const updatedElements = [newElement, ...activeElementsRef.current];
                activeElementsRef.current = updatedElements;
                setElements(updatedElements);
                setAppState(s => ({ ...s, tool: 'select', selectedElementId: newElement.id, selectedElementIds: [] }));
                e.target.value = '';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Selected Element Overlay
    const selectionOverlay = () => {
        if (appState.tool !== 'select') return null;
        
        const overlays = [];
        const padding = 0;
        const zoom = activeZoomRef.current || 1;
        const selectionBorderWidth = 1.5 / zoom;
        const shapeHandleSize = 9 / zoom;
        const endpointHandleSize = 10 / zoom;

        // 1. Single selection (with resize/rotate handles)
        const selectedElement = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
        if (selectedElement) {
            const bounds = getElementBounds(selectedElement);
            if (bounds) {
                overlays.push(
                    <div
                        key={'single-' + selectedElement.id}
                        ref={selectionOverlayRef}
                style={{
                    position: 'absolute',
                    left: bounds.x - padding,
                    top: bounds.y - padding,
                    width: bounds.w + padding * 2,
                    height: bounds.h + padding * 2,
                    border: `${selectionBorderWidth}px solid #2563eb`, // Thinner, sharper blue like tldraw
                    pointerEvents: 'none',
                    zIndex: 50,
                }}
            >
                {!selectedElement.locked && (
                    <>
                        {/* Rotation Handle */}
                        <div
                            style={{
                                position: 'absolute', top: -32 / zoom, left: '50%', transform: 'translateX(-50%)',
                                width: 12 / zoom, height: 12 / zoom, backgroundColor: '#ffffff', border: `${selectionBorderWidth}px solid #2563eb`,
                                borderRadius: '50%', cursor: 'grab', pointerEvents: 'auto',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                pushHistory(activeElementsRef.current);
                                setAppState(s => ({ ...s, rotating: true, resizing: false, actionStartPoint: getPointerPos(e) }));
                            }}
                        />
                        
                        {/* Connecting line for rotation */}
                        <div style={{
                            position: 'absolute', top: -20 / zoom, left: '50%', transform: 'translateX(-50%)',
                            width: 1.5 / zoom, height: 20 / zoom, backgroundColor: '#2563eb'
                        }} />
                    </>
                )}

                {/* Resize Handles (for all shapes, image, text) */}
                {!selectedElement.locked && ['rectangle', 'image', 'text', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(selectedElement.type) && ['nw', 'ne', 'sw', 'se'].map(corner => (
                    <div key={corner}
                        style={{
                            position: 'absolute', width: shapeHandleSize, height: shapeHandleSize, backgroundColor: '#ffffff', border: `${selectionBorderWidth}px solid #2563eb`,
                            top: corner.includes('n') ? -shapeHandleSize / 2 : 'auto', bottom: corner.includes('s') ? -shapeHandleSize / 2 : 'auto',
                            left: corner.includes('w') ? -shapeHandleSize / 2 : 'auto', right: corner.includes('e') ? -shapeHandleSize / 2 : 'auto',
                            cursor: `${corner}-resize`, pointerEvents: 'auto', borderRadius: '1px'
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            pushHistory(activeElementsRef.current);
                            setAppState(s => ({ ...s, resizing: corner, actionStartPoint: getPointerPos(e) }));
                        }}
                    />
                ))}

                {/* Endpoint Handles for arrows/dimensions/lines */}
                {!selectedElement.locked && ['arrow', 'dimension', 'line'].includes(selectedElement.type) && (
                    <>
                        <div
                            ref={startHandleRef}
                            style={{
                                position: 'absolute', width: endpointHandleSize, height: endpointHandleSize, backgroundColor: '#ffffff', border: `${selectionBorderWidth}px solid #2563eb`,
                                left: selectedElement.x - bounds.x + padding - endpointHandleSize / 2,
                                top: selectedElement.y - bounds.y + padding - endpointHandleSize / 2,
                                cursor: 'move', pointerEvents: 'auto', borderRadius: '50%'
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                pushHistory(activeElementsRef.current);
                                setAppState(s => ({ ...s, resizing: 'start', actionStartPoint: getPointerPos(e) }));
                            }}
                        />
                        <div
                            ref={endHandleRef}
                            style={{
                                position: 'absolute', width: endpointHandleSize, height: endpointHandleSize, backgroundColor: '#ffffff', border: `${selectionBorderWidth}px solid #2563eb`,
                                left: selectedElement.endX - bounds.x + padding - endpointHandleSize / 2,
                                top: selectedElement.endY - bounds.y + padding - endpointHandleSize / 2,
                                cursor: 'move', pointerEvents: 'auto', borderRadius: '50%'
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                pushHistory(activeElementsRef.current);
                                setAppState(s => ({ ...s, resizing: 'end', actionStartPoint: getPointerPos(e) }));
                            }}
                        />
                    </>
                )}
                {selectedElement.locked && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 6 / zoom,
                            right: 6 / zoom,
                            width: 22 / zoom,
                            height: 22 / zoom,
                            borderRadius: 7 / zoom,
                            backgroundColor: 'rgba(15, 23, 42, 0.88)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                        }}
                        title="Låst element"
                    >
                        <Lock size={13 / zoom} />
                    </div>
                )}
            </div>
                );
            }
        }

        // 2. Multiple selection (just blue borders, no handles)
        if (appState.selectedElementIds && appState.selectedElementIds.length > 0) {
            appState.selectedElementIds.forEach(id => {
                const el = activeElementsRef.current.find(e => e.id === id);
                if (!el) return;
                const bounds = getElementBounds(el);
                if (!bounds) return;
                overlays.push(
                    <div
                        id={'multi-select-' + el.id}
                        key={'multi-' + el.id}
                        style={{
                            position: 'absolute',
                            left: bounds.x - padding,
                            top: bounds.y - padding,
                            width: bounds.w + padding * 2,
                            height: bounds.h + padding * 2,
                            border: `${selectionBorderWidth}px solid #2563eb`, // Thinner, sharper blue like tldraw
                            pointerEvents: 'none',
                            zIndex: 50,
                        }}
                    />
                );
            });
        }

        return <>{overlays}</>;
    }

    // Marquee Selection Box
    const renderMarquee = () => {
        if (!appState.marqueeStartPoint || !appState.marqueeCurrentPoint) return null;
        const x1 = Math.min(appState.marqueeStartPoint.x, appState.marqueeCurrentPoint.x);
        const y1 = Math.min(appState.marqueeStartPoint.y, appState.marqueeCurrentPoint.y);
        const x2 = Math.max(appState.marqueeStartPoint.x, appState.marqueeCurrentPoint.x);
        const y2 = Math.max(appState.marqueeStartPoint.y, appState.marqueeCurrentPoint.y);
        
        return (
            <div style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: x2 - x1,
                height: y2 - y1,
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                border: `${1 / (activeZoomRef.current || 1)}px solid rgba(37, 99, 235, 0.5)`,
                pointerEvents: 'none',
                zIndex: 60
            }} />
        );
    };

    const renderSnapMarker = () => {
        if (!appState.snapPoint) return null;
        const zoom = activeZoomRef.current || 1;
        const size = 12 / zoom;
        const label = {
            endpoint: 'Ende',
            midpoint: 'Midt',
            center: 'Center',
            corner: 'Hjørne'
        }[appState.snapPoint.type] || 'Snap';

        return (
            <>
                <div style={{
                    position: 'absolute',
                    left: appState.snapPoint.x - size / 2,
                    top: appState.snapPoint.y - size / 2,
                    width: size,
                    height: size,
                    border: `${1.5 / zoom}px solid #0ea5e9`,
                    backgroundColor: 'rgba(14, 165, 233, 0.12)',
                    borderRadius: appState.snapPoint.type === 'center' ? '50%' : '2px',
                    pointerEvents: 'none',
                    zIndex: 70
                }} />
                <div style={{
                    position: 'absolute',
                    left: appState.snapPoint.x + 10 / zoom,
                    top: appState.snapPoint.y + 10 / zoom,
                    padding: `${3 / zoom}px ${6 / zoom}px`,
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    borderRadius: 4 / zoom,
                    fontSize: 11 / zoom,
                    fontWeight: 700,
                    lineHeight: 1,
                    pointerEvents: 'none',
                    zIndex: 71,
                    whiteSpace: 'nowrap'
                }}>{label}</div>
            </>
        );
    };

    const renderLockedElementBadges = () => {
        const zoom = activeZoomRef.current || 1;
        return activeElementsRef.current
            .filter(el => el.locked && el.type !== 'settings')
            .map(el => {
                const bounds = getElementBounds(el);
                const size = (el.type === 'image' ? 22 : 18) / zoom;
                return (
                    <div
                        key={`locked-${el.id}`}
                        style={{
                            position: 'absolute',
                            left: bounds.x + 8 / zoom,
                            top: bounds.y + 8 / zoom,
                            width: size,
                            height: size,
                            borderRadius: 6 / zoom,
                            backgroundColor: el.type === 'image' ? 'rgba(15, 23, 42, 0.88)' : 'rgba(15, 23, 42, 0.68)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 55,
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                        }}
                        title="Låst element"
                    >
                        <Lock size={(el.type === 'image' ? 13 : 11) / zoom} />
                    </div>
                );
            });
    };

    const renderMeasurementBadge = () => {
        if (appState.tool !== 'select') return null;
        const element = activeElementsRef.current.find(el => el.id === appState.selectedElementId);
        if (!element || !MEASURABLE_TYPES.includes(element.type)) return null;
        const metrics = getLineMetrics(element);
        if (!metrics || metrics.length < 1) return null;
        const settings = getDrawingSettings(activeElementsRef.current);
        const zoom = activeZoomRef.current || 1;

        return (
            <div style={{
                position: 'absolute',
                left: metrics.midpoint.x + 12 / zoom,
                top: metrics.midpoint.y - 34 / zoom,
                padding: `${5 / zoom}px ${8 / zoom}px`,
                borderRadius: 6 / zoom,
                background: 'rgba(15, 23, 42, 0.92)',
                color: '#ffffff',
                fontSize: 11 / zoom,
                fontWeight: 700,
                letterSpacing: 0,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 72,
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)'
            }}>
                {getMeasurementLabel(element, settings)}
            </div>
        );
    };

    // Text Editor Overlay
    let textOverlay = null;
    if (appState.editingTextId) {
        const textEl = elements.find(e => e.id === appState.editingTextId);
        if (textEl) {
            const bounds = getElementBounds(textEl);
            textOverlay = (
                <input
                    autoFocus
                    type="text"
                    defaultValue={textEl.text || ''}
                    placeholder={textEl.type === 'dimension' ? 'E.g. 250 cm' : 'Skriv note...'}
                    style={{
                        position: 'absolute',
                        top: textEl.type === 'dimension' ? bounds.cy - 12 : textEl.y,
                        left: textEl.type === 'dimension' ? bounds.cx : textEl.x,
                        transform: textEl.type === 'dimension' ? `translate(-50%, 0) rotate(${textEl.rotation || 0}rad)` : `rotate(${textEl.rotation || 0}rad)`,
                        transformOrigin: textEl.type === 'dimension' ? 'center center' : 'top left',
                        color: textEl.color,
                        fontFamily: 'Inter, sans-serif',
                        fontSize: `${textEl.fontSize || (textEl.type === 'dimension' ? 16 : 20)}px`,
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.9)',
                        border: '2px solid #3b82f6',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        outline: 'none',
                        zIndex: 1000,
                        minWidth: '150px',
                        textAlign: textEl.type === 'dimension' ? 'center' : 'left',
                        pointerEvents: 'auto'
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                        const newText = e.target.value;
                        pushHistory(elements);
                        
                        const updatedElements = activeElementsRef.current.map(el => {
                            if (el.id !== appState.editingTextId) return el;
                            
                            // Measure text width for accurate selection box later
                            const canvas = canvasRef.current;
                            if (canvas && el.type === 'text') {
                                const ctx = canvas.getContext('2d');
                                const fontSize = el.fontSize || appState.fontSize || 20;
                                ctx.font = `600 ${fontSize}px Inter, sans-serif`;
                                const width = ctx.measureText(newText).width;
                                return { ...el, text: newText, fontSize, w: Math.max(100, width + 10), h: Math.max(el.h || 0, fontSize + 12) };
                            }
                            return { ...el, text: newText };
                        });
                        
                        activeElementsRef.current = updatedElements;
                        setElements(updatedElements);
                        setAppState(s => ({ ...s, editingTextId: null }));
                        requestAnimationFrame(() => redraw());
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur();
                    }}
                />
            );
        }
    }

    const handleWheel = (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = containerRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldBeforeZoom = getPointerPos(e);
        const newZoom = Math.min(Math.max(activeZoomRef.current * zoomDelta, 0.1), 10);
        activeZoomRef.current = newZoom;
        activePanRef.current = {
            x: screenX - worldBeforeZoom.x * newZoom,
            y: screenY - worldBeforeZoom.y * newZoom
        };
        setAppState(s => ({ ...s, zoom: newZoom }));
        syncOverlayTransform();
        redraw();
    };

    const handleDoubleClick = (e) => {
        const pos = getPointerPos(e);
        const clickedElement = getElementAtPosition(pos.x, pos.y, activeElementsRef.current);
        if (clickedElement) {
            if (clickedElement.type === 'text') {
                setAppState(s => ({ ...s, editingTextId: clickedElement.id }));
                return;
            }
            if (['line', 'arrow', 'dimension', 'rectangle', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(clickedElement.type)) {
                const textId = generateId();
                pushHistory(elements);
                
                const newElement = {
                    id: textId,
                    type: 'text',
                    parentId: clickedElement.id, // For linked moving!
                    text: '',
                    color: appState.color,
                    x: pos.x,
                    y: pos.y - 25, // Offset 25px!
                    w: 100,
                    h: 30,
                    fontSize: appState.fontSize
                };
                
                const updatedElements = [...activeElementsRef.current, newElement];
                activeElementsRef.current = updatedElements;
                setElements(updatedElements);
                setAppState(s => ({ ...s, editingTextId: textId }));
            }
        }
    };

    const selectedElement = elements.find(el => el.id === appState.selectedElementId);
    const hasSelection = !!selectedElement || (appState.selectedElementIds && appState.selectedElementIds.length > 0);
    const selectedColor = selectedElement?.color || appState.color;
    const selectedStrokeWidth = selectedElement?.strokeWidth || appState.strokeWidth;
    const selectedFontSize = selectedElement?.fontSize || appState.fontSize;
    const drawingSettings = getDrawingSettings(elements);
    const metersPerUnit = drawingSettings?.measurementScale?.metersPerUnit;
    const selectedMetrics = getLineMetrics(selectedElement);
    const selectedPhysicalLength = selectedMetrics && Number.isFinite(metersPerUnit) && metersPerUnit > 0
        ? selectedMetrics.length * metersPerUnit
        : null;
    const selectedMetricLabel = selectedElement ? getMeasurementLabel(selectedElement, drawingSettings) : '';
    const selectedShapeMetrics = getShapeMetrics(selectedElement, drawingSettings);
    const selectedIdsForPanel = hasSelection ? getSelectionWithChildren() : [];
    const selectedLockableElements = elements.filter(el => selectedIdsForPanel.includes(el.id) && el.type !== 'settings');
    const selectionIsLocked = selectedLockableElements.length > 0 && selectedLockableElements.every(el => el.locked);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#f8fafc', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            
            <div 
                ref={containerRef}
                style={{ position: 'fixed', inset: 0, overflow: 'hidden', cursor: appState.tool === 'select' ? 'default' : 'crosshair', backgroundColor: '#f8fafc', touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onDoubleClick={handleDoubleClick}
                onWheel={handleWheel}
            >
                <canvas
                    ref={canvasRef}
                    style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
                />
                <div
                    ref={overlaysContainerRef}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        transform: getOverlayTransform(),
                        transformOrigin: '0 0',
                        pointerEvents: 'none'
                    }}
                >
                    {selectionOverlay()}
                    {renderLockedElementBadges()}
                    {renderMarquee()}
                    {renderSnapMarker()}
                    {renderMeasurementBadge()}
                    {textOverlay}
                </div>
            </div>

            {/* 1. TOP BAR (Header) - ORIGINAL FLOATING STYLE */}
            <div style={{ 
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '8px 12px 8px 16px',
                borderRadius: '16px',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid rgba(255,255,255,0.4)',
                zIndex: 10000,
                width: 'auto',
                minWidth: '600px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={onClose}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px 12px', borderRadius: '10px', transition: 'all 0.2s', fontWeight: 600 }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        <ChevronLeft size={18} strokeWidth={2.5} />
                        <span>Tilbage</span>
                    </button>
                    
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>
                    
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input 
                            type="text" 
                            value={drawingName}
                            onChange={(e) => setDrawingName(e.target.value)}
                            placeholder="Navngiv din skitse..."
                            style={{
                                background: 'transparent',
                                border: '1px solid transparent',
                                color: '#0f172a',
                                fontSize: '1.15rem',
                                fontWeight: 700,
                                padding: '8px 36px 8px 12px',
                                borderRadius: '10px',
                                outline: 'none',
                                width: '300px',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.background = 'rgba(59, 130, 246, 0.05)'; e.target.style.color = '#2563eb'; }}
                            onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#0f172a'; }}
                        />
                        <div style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: '#94a3b8' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={handleMakeOfficial}
                        disabled={isSaving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                            backgroundColor: 'white', color: '#3b82f6', border: '1px solid #bfdbfe',
                            borderRadius: '8px', fontWeight: 500, fontSize: '14px',
                            transition: 'all 0.2s', opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'wait' : 'pointer'
                        }}
                        onMouseOver={(e) => { if (!isSaving) { e.currentTarget.style.background = '#f0f9ff'; } }}
                        onMouseOut={(e) => { if (!isSaving) { e.currentTarget.style.background = 'white'; } }}
                    >
                        <FileImage size={18} />
                        Gør Officiel
                    </button>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                        }}
                        onMouseOver={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.3)'; } }}
                        onMouseOut={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.2)'; } }}
                    >
                        <Save size={18} />
                        {isSaving ? 'Gemmer...' : 'Gem Skitse'}
                    </button>
                </div>
            </div>

            {/* 2. RIGHT PANEL (Colors & Undo) - TLDRAW CLONE */}
            <div style={{
                position: 'absolute', top: 80, right: 16, zIndex: 10000,
                backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)',
                borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', gap: '8px',
                border: '1px solid rgba(226, 232, 240, 0.9)'
            }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => applyColor(c)}
                            style={{
                                width: 22, height: 22, borderRadius: '50%', backgroundColor: c, 
                                border: selectedColor === c ? '2.5px solid #93c5fd' : '1px solid #e2e8f0',
                                transform: selectedColor === c ? 'scale(1.15)' : 'scale(1)',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', 
                                outline: selectedColor === c ? '2px solid transparent' : 'none'
                            }}
                            title="Farve"
                        />
                    ))}
                    <button
                        onClick={() => setShowColorMenu(v => !v)}
                        className={`p-1.5 rounded-lg transition-all active:scale-95 ${showColorMenu ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}
                        title="Flere farver"
                    >
                        <Palette size={18} />
                    </button>
                    {showColorMenu && (
                        <div style={{
                            position: 'absolute',
                            right: 'calc(100% + 10px)',
                            top: 0,
                            width: 156,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)',
                            borderRadius: 12,
                            padding: 10,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 8
                        }}>
                            {EXTENDED_COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => applyColor(c)}
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: '50%',
                                        background: c,
                                        border: selectedColor === c ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                        boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #e2e8f0' : 'none'
                                    }}
                                    title={c}
                                />
                            ))}
                            <label style={{
                                gridColumn: 'span 4',
                                height: 30,
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#475569'
                            }} title="Brugerdefineret farve">
                                <Palette size={16} />
                                <input
                                    type="color"
                                    value={selectedColor}
                                    onChange={(e) => applyColor(e.target.value)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                            </label>
                        </div>
                    )}
                </div>
                <div style={{ width: 16, height: 1, backgroundColor: '#e2e8f0' }} />
                
                {/* Stroke Width Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    {[2, 4, 8].map(w => (
                        <button
                            key={w}
                            onClick={() => applyStrokeWidth(w)}
                            style={{
                                width: 24, height: 24, borderRadius: '4px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: selectedStrokeWidth === w ? '#eff6ff' : 'transparent',
                                border: selectedStrokeWidth === w ? '1px solid #bfdbfe' : '1px solid transparent',
                                transition: 'all 0.2s'
                            }}
                            title={`Tykkelse ${w}`}
                        >
                            <div style={{ width: 16, height: w, backgroundColor: selectedColor, borderRadius: '1px' }} />
                        </button>
                    ))}
                </div>

                <div style={{ width: 16, height: 1, backgroundColor: '#e2e8f0' }} />

                {selectedMetrics && (
                    <>
                        <div
                            style={{
                                width: 86,
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                color: '#334155',
                                padding: '6px 6px',
                                fontSize: 11,
                                fontWeight: 700,
                                lineHeight: 1.35,
                                textAlign: 'center'
                            }}
                            title="Længde og vinkel"
                        >
                            <div>{selectedMetricLabel.split(' · ')[0]}</div>
                            <div>{selectedMetricLabel.split(' · ')[1]}</div>
                        </div>
                        {metersPerUnit && (
                            <div
                                style={{
                                    width: 86,
                                    borderRadius: 8,
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    padding: '5px 6px',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    lineHeight: 1.2,
                                    textAlign: 'center'
                                }}
                                title="Aktiv målestok"
                            >
                                Skala aktiv
                            </div>
                        )}
                        <div style={{ width: 16, height: 1, backgroundColor: '#e2e8f0' }} />
                    </>
                )}

                {selectedShapeMetrics && (
                    <>
                        <div
                            style={{
                                width: 86,
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                color: '#334155',
                                padding: '6px 6px',
                                fontSize: 11,
                                fontWeight: 700,
                                lineHeight: 1.35,
                                textAlign: 'center'
                            }}
                            title="Bredde og højde"
                        >
                            <div>B {selectedShapeMetrics.widthLabel}</div>
                            <div>H {selectedShapeMetrics.heightLabel}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, width: 78 }}>
                            <button
                                onClick={() => addDimensionForSelectedShape('width')}
                                className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                                style={{ height: 26, fontSize: 11, fontWeight: 800 }}
                                title="Tilføj bredde-mål"
                            >
                                B mål
                            </button>
                            <button
                                onClick={() => addDimensionForSelectedShape('height')}
                                className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                                style={{ height: 26, fontSize: 11, fontWeight: 800 }}
                                title="Tilføj højde-mål"
                            >
                                H mål
                            </button>
                        </div>
                        <div style={{ width: 16, height: 1, backgroundColor: '#e2e8f0' }} />
                    </>
                )}

                {(selectedElement?.type === 'text' || selectedElement?.type === 'dimension' || appState.tool === 'text') && (
                    <>
                        <button
                            onClick={() => applyFontSize(Math.max(10, selectedFontSize - 2))}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                            title="Mindre tekst"
                        >
                            <Type size={14} />
                        </button>
                        <input
                            type="range"
                            min="10"
                            max="48"
                            value={selectedFontSize}
                            onChange={(e) => applyFontSize(Number(e.target.value))}
                            style={{ width: 46, accentColor: '#2563eb' }}
                            title="Tekststørrelse"
                        />
                        <button
                            onClick={() => applyFontSize(Math.min(48, selectedFontSize + 2))}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                            title="Større tekst"
                        >
                            <Type size={20} />
                        </button>
                        <div style={{ width: 16, height: 1, backgroundColor: '#e2e8f0' }} />
                    </>
                )}

                {selectedElement?.type === 'dimension' && (
                    <>
                        <input
                            key={`dimension-text-${selectedElement.id}-${selectedElement.text || ''}`}
                            defaultValue={selectedElement.text || ''}
                            placeholder="Mål"
                            onBlur={(e) => updateSelectedDimensionText(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                                if (e.key === 'Escape') e.currentTarget.blur();
                            }}
                            style={{
                                width: 78,
                                height: 30,
                                border: '1px solid #cbd5e1',
                                borderRadius: 8,
                                padding: '0 8px',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#0f172a',
                                outline: 'none',
                                textAlign: 'center',
                                background: '#ffffff'
                            }}
                            title="Måltekst"
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, width: 78 }}>
                            {[
                                { label: 'Tal', suffix: '' },
                                { label: 'cm', suffix: ' cm' },
                                { label: 'm', suffix: ' m' }
                            ].map(option => (
                                <button
                                    key={option.label}
                                    onClick={() => {
                                        const baseValue = option.suffix === ' cm' && selectedPhysicalLength
                                            ? selectedPhysicalLength * 100
                                            : option.suffix === ' m' && selectedPhysicalLength
                                                ? selectedPhysicalLength
                                                : selectedMetrics?.length || 0;
                                        updateSelectedDimensionText(`${formatMeasurementNumber(baseValue)}${option.suffix}`);
                                    }}
                                    className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                                    style={{ height: 24, fontSize: 11, fontWeight: 800 }}
                                    title={`Brug mål som ${option.label}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={calibrateFromSelectedDimension}
                            className="px-2 py-1 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all active:scale-95"
                            style={{ width: 78, fontSize: 11, fontWeight: 800 }}
                            title="Brug denne mållinje som målestok"
                        >
                            Kalibrer
                        </button>
                        <div style={{ width: 16, height: 1, backgroundColor: '#e2e8f0' }} />
                    </>
                )}

                {hasSelection && (
                    <>
                        <button
                            onClick={() => transformSelectedElements('rotate90')}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                            title="Roter 90 grader"
                        >
                            <RotateCw size={18} />
                        </button>
                        <button
                            onClick={() => transformSelectedElements('flipH')}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                            title="Spejl vandret"
                        >
                            <FlipHorizontal2 size={18} />
                        </button>
                        <button
                            onClick={() => transformSelectedElements('flipV')}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                            title="Spejl lodret"
                        >
                            <FlipVertical2 size={18} />
                        </button>
                        <div style={{ width: 16, height: 1, backgroundColor: '#e2e8f0' }} />
                        <button
                            onClick={duplicateSelectedElements}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                            title="Dupliker"
                        >
                            <Copy size={18} />
                        </button>
                        <button
                            onClick={() => moveSelectedLayer('front')}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                            title="Send frem"
                        >
                            <Layers size={18} />
                        </button>
                        <button
                            onClick={() => moveSelectedLayer('back')}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                            title="Send bagud"
                        >
                            <Layers size={18} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <button
                            onClick={toggleSelectedLock}
                            className={`p-1.5 rounded-lg transition-all active:scale-95 ${selectionIsLocked ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}
                            title={selectionIsLocked ? 'Lås op' : 'Lås valgte elementer'}
                        >
                            {selectionIsLocked ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                        <div style={{ width: 16, height: 1, backgroundColor: '#e2e8f0' }} />
                    </>
                )}

                <button
                    onClick={() => fitDrawingToView()}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                    title="Vis hele tegningen"
                >
                    <Maximize2 size={18} />
                </button>

                <button
                    onClick={() => setAppState(s => ({ ...s, showGrid: !s.showGrid }))}
                    className={`p-1.5 rounded-lg transition-all active:scale-95 ${appState.showGrid ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}
                    title={appState.showGrid ? 'Skjul hjælpegrid' : 'Vis hjælpegrid'}
                >
                    <Grid3X3 size={18} />
                </button>

                <button 
                    onClick={handleUndo} 
                    disabled={history.length === 0} 
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-95" 
                    title="Fortryd (Undo)"
                >
                    <Undo size={18} />
                </button>
            </div>

            {/* 3. BOTTOM TOOLBAR (Drawing Tools) - TLDRAW CLONE */}
            <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
                backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)',
                borderRadius: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.03)',
                display: 'flex', alignItems: 'center', padding: '6px', gap: '2px',
                border: '1px solid rgba(226, 232, 240, 0.9)'
            }}>
                {[
                    { id: 'select', icon: MousePointer2, title: 'Markør' },
                    { id: 'pen', icon: PenTool, title: 'Fritegning' },
                    { id: 'line', icon: Minus, title: 'Lige Streg' },
                    { id: 'arrow', icon: ArrowRight, title: 'Pil' }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setAppState(s => ({ ...s, tool: t.id, selectedElementId: null }));
                            setShowShapesMenu(false);
                            setShowSymbolsMenu(false);
                        }}
                        className={`p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center
                            ${appState.tool === t.id 
                                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        style={{ width: '36px', height: '36px' }}
                        title={t.title}
                    >
                        <t.icon size={18} strokeWidth={appState.tool === t.id ? 2.5 : 2} />
                    </button>
                ))}

                {/* Shapes Menu Toggle */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => {
                            setShowShapesMenu(!showShapesMenu);
                            setShowSymbolsMenu(false);
                        }}
                        className={`p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center
                            ${['rectangle', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool) 
                                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        style={{ width: '36px', height: '36px' }}
                        title="Figurer"
                    >
                        <Shapes size={18} strokeWidth={['rectangle', 'circle', 'triangle', 'polygon', 'rhombus', 'parallelogram'].includes(appState.tool) ? 2.5 : 2} />
                    </button>
                    {showShapesMenu && (
                        <div style={{
                            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px',
                            backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(226, 232, 240, 1)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px'
                        }}>
                            {[
                                { id: 'rectangle', icon: Square, title: 'Firkant' },
                                { id: 'circle', icon: Circle, title: 'Cirkel' },
                                { id: 'triangle', icon: Triangle, title: 'Trekant' },
                                { id: 'polygon', icon: Hexagon, title: 'Polygon' },
                                { id: 'rhombus', icon: Diamond, title: 'Rombe' },
                                { id: 'parallelogram', icon: Square, title: 'Parallelogram' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setAppState(s => ({ ...s, tool: t.id, selectedElementId: null }));
                                        setShowShapesMenu(false);
                                        setShowSymbolsMenu(false);
                                    }}
                                    className={`p-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center
                                        ${appState.tool === t.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                                    style={{ width: '32px', height: '32px' }}
                                    title={t.title}
                                >
                                    <t.icon size={16} strokeWidth={2} style={t.id === 'parallelogram' ? { transform: 'skewX(-20deg)' } : {}} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Carpenter Symbols Menu Toggle */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => {
                            setShowSymbolsMenu(!showSymbolsMenu);
                            setShowShapesMenu(false);
                        }}
                        className={`p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center
                            ${appState.tool.startsWith(SYMBOL_TOOL_PREFIX)
                                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        style={{ width: '36px', height: '36px' }}
                        title="Tømrer-symboler"
                    >
                        <LibraryBig size={18} strokeWidth={appState.tool.startsWith(SYMBOL_TOOL_PREFIX) ? 2.5 : 2} />
                    </button>
                    {showSymbolsMenu && (
                        <div style={{
                            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px',
                            backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(226, 232, 240, 1)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px'
                        }}>
                            {CARPENTER_SYMBOLS.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setAppState(s => ({ ...s, tool: `${SYMBOL_TOOL_PREFIX}${t.id}`, selectedElementId: null, selectedElementIds: [] }));
                                        setShowSymbolsMenu(false);
                                    }}
                                    className={`p-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center
                                        ${appState.tool === `${SYMBOL_TOOL_PREFIX}${t.id}` ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                                    style={{ width: '32px', height: '32px' }}
                                    title={t.title}
                                >
                                    <t.icon size={16} strokeWidth={2} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {[
                    { id: 'dimension', icon: Ruler, title: 'Målebånd' },
                    { id: 'callout', icon: AlertTriangle, title: 'OBS-note' },
                    { id: 'text', icon: Type, title: 'Tekst' },
                    { id: 'eraser', icon: Eraser, title: 'Viskelæder' }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setAppState(s => ({ ...s, tool: t.id, selectedElementId: null }));
                            setShowShapesMenu(false);
                            setShowSymbolsMenu(false);
                        }}
                        className={`p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center
                            ${appState.tool === t.id 
                                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        style={{ width: '36px', height: '36px' }}
                        title={t.title}
                    >
                        <t.icon size={18} strokeWidth={appState.tool === t.id ? 2.5 : 2} />
                    </button>
                ))}
                
                <div style={{ width: 1, height: 24, backgroundColor: '#e2e8f0', margin: '0 6px' }} />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all duration-200 active:scale-95 flex items-center justify-center"
                    style={{ width: '36px', height: '36px' }}
                    title="Indsæt Baggrundsbillede"
                >
                    <ImagePlus size={18} />
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                    />
                </button>
            </div>
            

        </div>
    );
};

export default DrawingBoard;
