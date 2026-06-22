import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { ChevronLeft, Save, ImagePlus, Type, Square, ArrowRight, Eraser, PenTool, MousePointer2, Undo, Ruler, FileImage, Minus, Circle, CircleDashed, Shapes, Triangle, Hexagon, Diamond, Maximize2, Grid3X3, Palette, Copy, Lock, Unlock, Layers, AlertTriangle, LibraryBig, DoorOpen, Columns3, Rows3, Hammer, RotateCw, FlipHorizontal2, FlipVertical2, Group, Ungroup, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween, Magnet, House, Waves, SlidersHorizontal, ArrowDownWideNarrow, LayoutTemplate, Trash2, ClipboardList, Share } from 'lucide-react';
import { getElementBounds, getElementAtPosition, rotatePoint, findSnapPoint, getConnectedModule } from './engineUtils';
import { getDrawingBounds, renderElementsToCanvas } from './renderUtils';

const COLORS = ['#0f172a', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];
const EXTENDED_COLORS = ['#0f172a', '#475569', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#ffffff'];
const MEASURABLE_TYPES = ['line', 'arrow', 'dimension'];
const SHAPE_DIMENSION_TYPES = ['rectangle', 'image', 'circle', 'semicircle', 'triangle', 'polygon', 'rhombus', 'parallelogram', 'trapezoid'];
const DRAWING_SHAPE_TOOLS = ['rectangle', 'circle', 'semicircle', 'triangle', 'polygon', 'rhombus', 'parallelogram', 'trapezoid'];
const SETTINGS_ELEMENT_ID = '__drawing_settings__';
const CUSTOM_TEMPLATE_STORAGE_KEY = 'bison_frame_custom_drawing_templates_v1';

const generateId = () => Math.random().toString(36).substr(2, 9);

const SYMBOL_TOOL_PREFIX = 'symbol:';
const TEMPLATE_TOOL_PREFIX = 'template:';
const CUSTOM_TEMPLATE_PREFIX = 'custom:';
const CARPENTER_SYMBOLS = [
    { id: 'door', icon: DoorOpen, title: 'Dør' },
    { id: 'window', icon: Columns3, title: 'Vindue' },
    { id: 'stairs', icon: Rows3, title: 'Trappe' },
    { id: 'post', icon: Square, title: 'Stolpe' },
    { id: 'beam', icon: Hammer, title: 'Bjælke' },
    { id: 'wall', icon: SlidersHorizontal, title: 'Væg' },
    { id: 'roof', icon: House, title: 'Tagflade' },
    { id: 'rafter', icon: Triangle, title: 'Spær' },
    { id: 'opening', icon: Diamond, title: 'Åbning' },
    { id: 'insulation', icon: Waves, title: 'Isolering' },
    { id: 'fall', icon: ArrowDownWideNarrow, title: 'Faldpil' }
];

const CARPENTER_TEMPLATES = [
    { id: 'facade', icon: House, title: 'Facade' },
    { id: 'roofPlan', icon: Triangle, title: 'Tagplan' },
    { id: 'deck', icon: Rows3, title: 'Terrasse' },
    { id: 'stairsPlan', icon: Rows3, title: 'Trappeplan' },
    { id: 'wallOpenings', icon: LayoutTemplate, title: 'Væg m. åbninger' }
];

const TOOLTIP_DESCRIPTIONS = {
    'Farve': 'Skifter farve på valgt element eller næste element du tegner.',
    'Flere farver': 'Åbner flere farver og brugerdefineret farvevælger.',
    'Tykkelse 2': 'Tynd streg til lette hjælpelinjer og detaljer.',
    'Tykkelse 4': 'Normal streg til de fleste skitser.',
    'Tykkelse 8': 'Kraftig streg til vigtige kanter eller markeringer.',
    'Præcis længde': 'Skriv en længde direkte. Brug cm/m efter kalibrering.',
    'Præcis vinkel': 'Skriv vinklen direkte i grader.',
    'B præcis størrelse': 'Sæt bredden på den valgte figur.',
    'H præcis størrelse': 'Sæt højden på den valgte figur.',
    'Tilføj bredde-mål': 'Laver en mållinje for bredden.',
    'Tilføj højde-mål': 'Laver en mållinje for højden.',
    'Tilføj bredde og højde': 'Laver både bredde- og højdemål på én gang.',
    'Mindre tekst': 'Gør valgt tekst eller måltekst mindre.',
    'Større tekst': 'Gør valgt tekst eller måltekst større.',
    'Tekststørrelse': 'Justerer tekststørrelsen for valgt tekst eller nye tekster.',
    'Måltekst': 'Teksten der vises på den valgte mållinje.',
    'Brug mål som Tal': 'Sætter målteksten til tegningens rå enheder.',
    'Brug mål som cm': 'Sætter målteksten til centimeter, hvis målestok er sat.',
    'Brug mål som m': 'Sætter målteksten til meter, hvis målestok er sat.',
    'Brug denne mållinje som målestok': 'Fortæl systemet hvor lang denne mållinje er i virkeligheden.',
    'Målsæt markeringens bredde': 'Laver et breddemål for hele markeringen.',
    'Målsæt markeringens højde': 'Laver et højdemål for hele markeringen.',
    'Målsæt bredde og højde': 'Laver begge mål for hele markeringen.',
    'Ret venstre': 'Lægger valgte elementer på samme venstre kant.',
    'Ret lodret center': 'Centrerer valgte elementer lodret i forhold til hinanden.',
    'Ret højre': 'Lægger valgte elementer på samme højre kant.',
    'Ret top': 'Lægger valgte elementer på samme topkant.',
    'Ret vandret center': 'Centrerer valgte elementer vandret i forhold til hinanden.',
    'Ret bund': 'Lægger valgte elementer på samme bundkant.',
    'Fordel vandret': 'Fordeler valgte elementer med lige afstand vandret.',
    'Fordel lodret': 'Fordeler valgte elementer med lige afstand lodret.',
    'Roter 90 grader': 'Roterer markeringen 90 grader.',
    'Spejl vandret': 'Spejler markeringen fra venstre mod højre.',
    'Spejl lodret': 'Spejler markeringen op og ned.',
    'Gem valgte som skabelon': 'Gemmer markeringen lokalt under Skabeloner -> Egne.',
    'Indsæt materialenote': 'Laver en lille note med mål, areal og antal elementer.',
    'Dupliker': 'Kopierer markeringen og lægger kopien lidt ved siden af.',
    'Gruppér valgte': 'Samler flere elementer, så de kan flyttes som én ting.',
    'Opløs gruppe': 'Skiller en gruppe ad igen.',
    'Send frem': 'Lægger markeringen oven på andre elementer.',
    'Send bagud': 'Lægger markeringen bag andre elementer.',
    'Lås op': 'Gør låste elementer flytbare igen.',
    'Lås valgte elementer': 'Forhindrer at markeringen flyttes ved en fejl.',
    'Vis avancerede værktøjer': 'Åbner gruppering, lag, spejling, fordeling og andre power-user værktøjer.',
    'Skjul avancerede værktøjer': 'Skjuler de tunge værktøjer, så panelet bliver mere roligt.',
    'Indsæt A4 titelblok': 'Indsætter en print-ramme og titelblok på tegningen.',
    'Kontroller tegning': 'Tjekker mål, målestok, titelblok og andre afleveringspunkter.',
    'Vis hele tegningen': 'Zoomer ud så hele tegningen er synlig.',
    'Skjul hjælpegrid': 'Slår baggrundsgitteret fra.',
    'Vis hjælpegrid': 'Slår baggrundsgitteret til.',
    'Slå snap fra': 'Slår automatisk fangst af punkter fra.',
    'Slå snap til': 'Slår automatisk fangst af punkter til.',
    'Fortryd (Undo)': 'Fortryder seneste ændring.'
};

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

const createArrowElement = ({ id, parentId, x, y, endX, endY, color, strokeWidth }) => ({
    id,
    parentId,
    type: 'arrow',
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
    const arrow = (coords, parentId = rootId) => createArrowElement({ id: generateId(), parentId, color, strokeWidth, ...coords });
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

    if (symbolId === 'wall') {
        const root = createRectElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 64,
            y: y - 14,
            w: 128,
            h: 28,
            text: ''
        });
        const hatch = [];
        for (let i = -56; i <= 48; i += 16) {
            hatch.push(line({ x: x + i, y: y + 14, endX: x + i + 16, endY: y - 14 }));
        }
        return [root, ...hatch];
    }

    if (symbolId === 'roof') {
        const root = createLineElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 64,
            y: y + 34,
            endX: x,
            endY: y - 38,
            text: ''
        });
        return [
            root,
            line({ x, y: y - 38, endX: x + 64, endY: y + 34 }),
            line({ x: x - 64, y: y + 34, endX: x + 64, endY: y + 34 }),
            line({ x: x - 34, y: y + 34, endX: x, endY: y - 4 }),
            line({ x, y: y - 4, endX: x + 34, endY: y + 34 })
        ];
    }

    if (symbolId === 'rafter') {
        const root = createLineElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 62,
            y: y + 36,
            endX: x,
            endY: y - 36,
            text: ''
        });
        return [
            root,
            line({ x, y: y - 36, endX: x + 62, endY: y + 36 }),
            line({ x: x - 46, y: y + 18, endX: x + 46, endY: y + 18 }),
            line({ x: x - 28, y: y - 2, endX: x + 28, endY: y - 2 }),
            line({ x: x - 12, y: y - 20, endX: x + 12, endY: y - 20 })
        ];
    }

    if (symbolId === 'opening') {
        const root = createLineElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 58,
            y: y - 28,
            endX: x - 22,
            endY: y - 28,
            text: ''
        });
        return [
            root,
            line({ x: x + 22, y: y - 28, endX: x + 58, endY: y - 28 }),
            line({ x: x - 58, y: y + 28, endX: x - 22, endY: y + 28 }),
            line({ x: x + 22, y: y + 28, endX: x + 58, endY: y + 28 }),
            line({ x: x - 22, y: y - 38, endX: x - 22, endY: y + 38 }),
            line({ x: x + 22, y: y - 38, endX: x + 22, endY: y + 38 }),
            line({ x: x - 14, y: y - 14, endX: x + 14, endY: y + 14 }),
            line({ x: x + 14, y: y - 14, endX: x - 14, endY: y + 14 })
        ];
    }

    if (symbolId === 'insulation') {
        const root = createRectElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 64,
            y: y - 28,
            w: 128,
            h: 56,
            text: ''
        });
        const waves = [];
        for (let row = -14; row <= 14; row += 14) {
            for (let i = -52; i < 52; i += 26) {
                waves.push(line({ x: x + i, y: y + row, endX: x + i + 13, endY: y + row - 8 }));
                waves.push(line({ x: x + i + 13, y: y + row - 8, endX: x + i + 26, endY: y + row }));
            }
        }
        return [root, ...waves];
    }

    if (symbolId === 'fall') {
        const root = createArrowElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 54,
            y: y - 28,
            endX: x + 54,
            endY: y + 28,
            text: ''
        });
        return [
            root,
            line({ x: x - 40, y: y + 22, endX: x + 52, endY: y + 22 }),
            line({ x: x - 26, y: y + 34, endX: x + 52, endY: y + 34 })
        ];
    }

    return [];
};

const createTemplateElements = (templateId, origin, color, strokeWidth) => {
    const rootId = generateId();
    const line = (coords, parentId = rootId) => createLineElement({ id: generateId(), parentId, color, strokeWidth, ...coords });
    const arrow = (coords, parentId = rootId) => createArrowElement({ id: generateId(), parentId, color, strokeWidth, ...coords });
    const rect = (coords, parentId = rootId) => createRectElement({ id: generateId(), parentId, color, strokeWidth, ...coords });
    const x = origin.x;
    const y = origin.y;

    if (templateId === 'facade') {
        const root = createRectElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 120,
            y: y - 20,
            w: 240,
            h: 130,
            text: ''
        });
        return [
            root,
            line({ x: x - 150, y: y - 20, endX: x, endY: y - 120 }),
            line({ x, y: y - 120, endX: x + 150, endY: y - 20 }),
            line({ x: x - 150, y: y - 20, endX: x + 150, endY: y - 20 }),
            rect({ x: x - 24, y: y + 42, w: 48, h: 68 }),
            line({ x: x + 14, y: y + 76, endX: x + 18, endY: y + 76 }),
            rect({ x: x - 92, y: y + 20, w: 44, h: 36 }),
            line({ x: x - 70, y: y + 20, endX: x - 70, endY: y + 56 }),
            line({ x: x - 92, y: y + 38, endX: x - 48, endY: y + 38 }),
            rect({ x: x + 48, y: y + 20, w: 44, h: 36 }),
            line({ x: x + 70, y: y + 20, endX: x + 70, endY: y + 56 }),
            line({ x: x + 48, y: y + 38, endX: x + 92, endY: y + 38 })
        ];
    }

    if (templateId === 'roofPlan') {
        const root = createLineElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 150,
            y,
            endX: x + 150,
            endY: y,
            text: ''
        });
        const rafters = [];
        for (let i = -120; i <= 120; i += 40) {
            rafters.push(line({ x: x + i, y, endX: x + i - 26, endY: y - 82 }));
            rafters.push(line({ x: x + i, y, endX: x + i + 26, endY: y + 82 }));
        }
        return [
            root,
            line({ x: x - 176, y: y - 82, endX: x + 124, endY: y - 82 }),
            line({ x: x - 124, y: y + 82, endX: x + 176, endY: y + 82 }),
            line({ x: x - 176, y: y - 82, endX: x - 150, endY: y }),
            line({ x: x + 124, y: y - 82, endX: x + 150, endY: y }),
            line({ x: x - 124, y: y + 82, endX: x - 150, endY: y }),
            line({ x: x + 176, y: y + 82, endX: x + 150, endY: y }),
            ...rafters
        ];
    }

    if (templateId === 'deck') {
        const root = createRectElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 150,
            y: y - 80,
            w: 300,
            h: 160,
            text: ''
        });
        const boards = [];
        for (let i = -120; i <= 120; i += 30) {
            boards.push(line({ x: x + i, y: y - 80, endX: x + i, endY: y + 80 }));
        }
        return [
            root,
            ...boards,
            line({ x: x - 150, y: y - 26, endX: x + 150, endY: y - 26 }),
            line({ x: x - 150, y: y + 26, endX: x + 150, endY: y + 26 }),
            rect({ x: x - 166, y: y - 96, w: 24, h: 24 }),
            rect({ x: x + 142, y: y - 96, w: 24, h: 24 }),
            rect({ x: x - 166, y: y + 72, w: 24, h: 24 }),
            rect({ x: x + 142, y: y + 72, w: 24, h: 24 })
        ];
    }

    if (templateId === 'stairsPlan') {
        const root = createRectElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 130,
            y: y - 58,
            w: 260,
            h: 116,
            text: ''
        });
        const steps = [];
        for (let i = 1; i < 10; i++) {
            const stepX = x - 130 + i * 26;
            steps.push(line({ x: stepX, y: y - 58, endX: stepX, endY: y + 58 }));
        }
        return [
            root,
            ...steps,
            arrow({ x: x - 106, y, endX: x + 106, endY: y }),
            line({ x: x - 118, y: y - 70, endX: x - 118, endY: y - 58 }),
            line({ x: x + 118, y: y + 58, endX: x + 118, endY: y + 70 })
        ];
    }

    if (templateId === 'wallOpenings') {
        const root = createRectElement({
            id: rootId,
            color,
            strokeWidth,
            rotation: 0,
            x: x - 170,
            y: y - 22,
            w: 340,
            h: 44,
            text: ''
        });
        const hatch = [];
        for (let i = -154; i <= 138; i += 28) {
            hatch.push(line({ x: x + i, y: y + 22, endX: x + i + 20, endY: y - 22 }));
        }
        return [
            root,
            ...hatch,
            rect({ x: x - 112, y: y - 34, w: 54, h: 68 }),
            line({ x: x - 85, y: y - 34, endX: x - 85, endY: y + 34 }),
            line({ x: x - 112, y, endX: x - 58, endY: y }),
            rect({ x: x + 36, y: y - 44, w: 72, h: 88 }),
            line({ x: x + 36, y: y + 44, endX: x + 108, endY: y - 44 })
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

const formatAreaWithSettings = (drawingArea, settings = null) => {
    const scale = settings?.measurementScale?.metersPerUnit;
    if (!Number.isFinite(scale) || scale <= 0) return `${formatMeasurementNumber(drawingArea)} enheder`;
    const area = drawingArea * scale * scale;
    if (area >= 1) return `${formatMeasurementNumber(area)} m2`;
    return `${formatMeasurementNumber(area * 10000)} cm2`;
};

const getMeasurementLabel = (element, settings = null) => {
    const metrics = getLineMetrics(element);
    if (!metrics) return '';
    return `L ${formatLengthWithSettings(metrics.length, settings)} · ${Math.round(metrics.angle)}°`;
};

const getLineNoteAnchorId = (element) => element?.attachedToId || element?.parentId || null;

const isLineNoteElement = (element, elements = []) => {
    if (!element || element.type !== 'text') return false;
    if (element.isLineNote || element.attachedToId) return true;
    if (!element.parentId) return false;
    const parent = elements.find(el => el.id === element.parentId);
    return !!parent && MEASURABLE_TYPES.includes(parent.type);
};

const getLineNotePosition = (lineElement, point, fontSize = 20) => {
    const metrics = getLineMetrics(lineElement);
    if (!metrics || metrics.length < 1) {
        return { x: point.x, y: point.y - 25 };
    }
    const dx = lineElement.endX - lineElement.x;
    const dy = lineElement.endY - lineElement.y;
    let nx = -dy / metrics.length;
    let ny = dx / metrics.length;
    if (ny > 0) {
        nx *= -1;
        ny *= -1;
    }
    const offset = 22;
    return {
        x: point.x + nx * offset,
        y: point.y + ny * offset - fontSize / 2
    };
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

const parseLengthInputToDrawingUnits = (value, settings = null) => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const physicalMeters = parseMeasurementText(raw);
    if (physicalMeters) {
        const scale = settings?.measurementScale?.metersPerUnit;
        if (!Number.isFinite(scale) || scale <= 0) return { error: 'Kalibrer målestok før du bruger cm/m.' };
        return { value: physicalMeters / scale };
    }

    const numericValue = Number(raw.replace(',', '.').replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
    return { value: numericValue };
};

const parseAngleInput = (value) => {
    const numericValue = Number(String(value || '').trim().replace(',', '.').replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(numericValue)) return null;
    return numericValue;
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

const translateElement = (element, dx, dy) => {
    if (element.type === 'pen' || element.type === 'freehand') {
        return {
            ...element,
            points: (element.points || []).map(p => ({ x: p.x + dx, y: p.y + dy }))
        };
    }

    if (element.type === 'line' || element.type === 'arrow' || element.type === 'dimension') {
        return {
            ...element,
            x: element.x + dx,
            y: element.y + dy,
            endX: element.endX + dx,
            endY: element.endY + dy
        };
    }

    if (['rectangle', 'image', 'text', ...DRAWING_SHAPE_TOOLS.filter(type => type !== 'rectangle')].includes(element.type)) {
        return { ...element, x: element.x + dx, y: element.y + dy };
    }

    return element;
};

const normalizeElementsForCustomTemplate = (selectedElements, bounds) => {
    if (!bounds) return [];
    return selectedElements
        .filter(el => el.type !== 'settings')
        .map(el => {
            const clone = JSON.parse(JSON.stringify(el));
            delete clone.locked;

            if (clone.type === 'pen' || clone.type === 'freehand') {
                clone.points = (clone.points || []).map(p => ({ x: p.x - bounds.cx, y: p.y - bounds.cy }));
            } else if (clone.type === 'line' || clone.type === 'arrow' || clone.type === 'dimension') {
                clone.x -= bounds.cx;
                clone.y -= bounds.cy;
                clone.endX -= bounds.cx;
                clone.endY -= bounds.cy;
            } else if (['rectangle', 'image', 'text', ...DRAWING_SHAPE_TOOLS.filter(type => type !== 'rectangle')].includes(clone.type)) {
                clone.x -= bounds.cx;
                clone.y -= bounds.cy;
            }

            return clone;
        });
};

const createCustomTemplateElements = (template, origin) => {
    if (!template?.elements?.length) return [];

    const idMap = new Map(template.elements.map(el => [el.id, generateId()]));
    return template.elements.map(el => {
        const clone = JSON.parse(JSON.stringify(el));
        const originalId = clone.id;
        const originalParentId = clone.parentId;
        clone.id = idMap.get(originalId);
        clone.locked = false;

        if (originalParentId && idMap.has(originalParentId)) {
            clone.parentId = idMap.get(originalParentId);
        } else {
            delete clone.parentId;
        }

        return translateElement(clone, origin.x, origin.y);
    });
};

const getTemplateSelectionRootId = (templateElements) => {
    const insertedIds = new Set(templateElements.map(el => el.id));
    return templateElements.find(el => !el.parentId || !insertedIds.has(el.parentId))?.id || templateElements[0]?.id || null;
};

const showChecklistToast = (variant, title, summary, items = [], duration = 6000) => {
    const content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.25 }}>
            <strong>{title}</strong>
            {summary && <span style={{ opacity: 0.82 }}>{summary}</span>}
            {items.map(item => (
                <span key={item}>{item}</span>
            ))}
        </div>
    );

    toast[variant](content, { duration });
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
        rotationStartAngle: 0,
        zoom: 1,
        selectedElementIds: [],
        marqueeStartPoint: null,
        marqueeCurrentPoint: null,
        isSpaceDown: false,
        showGrid: false,
        snapEnabled: true,
        fontSize: 20,
        snapPoint: null,
        dragGuide: null
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
    const activeTouchPointersRef = useRef(new Map());
    const pinchRef = useRef(null);
    const [showShapesMenu, setShowShapesMenu] = useState(false);
    const [showColorMenu, setShowColorMenu] = useState(false);
    const [showSymbolsMenu, setShowSymbolsMenu] = useState(false);
    const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
    const [templateSaveDraft, setTemplateSaveDraft] = useState(null);
    const [panelTooltip, setPanelTooltip] = useState(null);
    const [showAdvancedTools, setShowAdvancedTools] = useState(false);
    const [showMobileRightPanel, setShowMobileRightPanel] = useState(false);
    const [templateCategory, setTemplateCategory] = useState('standard');
    const [customTemplates, setCustomTemplates] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY) || '[]');
            return Array.isArray(saved) ? saved.filter(t => t?.id && t?.name && Array.isArray(t.elements)) : [];
        } catch (err) {
            return [];
        }
    });

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

    const syncSelectionOverlayBox = useCallback((el) => {
        if (!selectionOverlayRef.current || !el) return;
        const bounds = getElementBounds(el);
        selectionOverlayRef.current.style.left = `${bounds.x}px`;
        selectionOverlayRef.current.style.top = `${bounds.y}px`;
        selectionOverlayRef.current.style.width = `${bounds.w}px`;
        selectionOverlayRef.current.style.height = `${bounds.h}px`;
        selectionOverlayRef.current.style.transform = `rotate(${el.rotation || 0}rad)`;
        selectionOverlayRef.current.style.transformOrigin = 'center center';
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
            if (selectedSet.has(el.id) && el.parentId && !isLineNoteElement(el, activeElementsRef.current)) selectedSet.add(el.parentId);
        });

        let added = true;

        while (added) {
            added = false;
            activeElementsRef.current.forEach(el => {
                if (el.parentId && selectedSet.has(el.parentId) && !selectedSet.has(el.id)) {
                    selectedSet.add(el.id);
                    added = true;
                }
                if (el.attachedToId && selectedSet.has(el.attachedToId) && !selectedSet.has(el.id)) {
                    selectedSet.add(el.id);
                    added = true;
                }
            });
        }

        return Array.from(selectedSet);
    }, [getSelectedIds]);

    const expandMoveIdsWithAttachedNotes = useCallback((ids = [], sourceElements = activeElementsRef.current) => {
        const moveSet = new Set(ids);
        sourceElements.forEach(el => {
            if (!isLineNoteElement(el, sourceElements)) return;
            const anchorId = getLineNoteAnchorId(el);
            if (anchorId && moveSet.has(anchorId)) moveSet.add(el.id);
        });
        return Array.from(moveSet);
    }, []);

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

    const groupSelectedElements = useCallback(() => {
        const directSelectedIds = appState.selectedElementIds?.length > 1
            ? appState.selectedElementIds
            : getSelectedIds();

        if (directSelectedIds.length < 2) {
            toast.error('Vælg mindst to elementer for at gruppere.');
            return;
        }

        const selectedIds = getSelectionWithChildren(directSelectedIds);
        const firstElement = activeElementsRef.current.find(el => el.id === directSelectedIds[0]);
        const rootId = firstElement?.parentId || firstElement?.id;
        if (!rootId) return;

        pushHistory(activeElementsRef.current);
        const selectedSet = new Set(selectedIds);
        const updatedElements = activeElementsRef.current.map(el => {
            if (!selectedSet.has(el.id) || el.id === rootId || el.type === 'settings') return el;
            return { ...el, parentId: rootId };
        });

        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({
            ...s,
            tool: 'select',
            selectedElementId: rootId,
            selectedElementIds: [],
            editingTextId: null
        }));
    }, [appState.selectedElementIds, getSelectedIds, getSelectionWithChildren, pushHistory]);

    const ungroupSelectedElements = useCallback(() => {
        const selectedIds = getSelectionWithChildren();
        if (selectedIds.length === 0) return;

        const selectedSet = new Set(selectedIds);
        const hasGroupLinks = activeElementsRef.current.some(el => selectedSet.has(el.id) && el.parentId && selectedSet.has(el.parentId));
        if (!hasGroupLinks) {
            toast.error('Der er ikke en gruppe at opløse.');
            return;
        }

        pushHistory(activeElementsRef.current);
        const updatedElements = activeElementsRef.current.map(el => {
            if (selectedSet.has(el.id) && el.parentId && selectedSet.has(el.parentId)) {
                const { parentId, ...rest } = el;
                return rest;
            }
            return el;
        });

        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({
            ...s,
            tool: 'select',
            selectedElementId: null,
            selectedElementIds: selectedIds.filter(id => id !== SETTINGS_ELEMENT_ID),
            editingTextId: null
        }));
    }, [getSelectionWithChildren, pushHistory]);

    const alignSelectedElements = useCallback((mode) => {
        const selectedIds = getSelectionWithChildren();
        if (selectedIds.length < 2) return;

        const selectedSet = new Set(selectedIds);
        const unitRootIds = selectedIds.filter(id => {
            const el = activeElementsRef.current.find(item => item.id === id);
            if (!el || el.type === 'settings') return false;
            return !el.parentId || !selectedSet.has(el.parentId);
        });

        const units = unitRootIds.map(rootId => {
            const unitElements = activeElementsRef.current.filter(el => (
                el.id === rootId || el.parentId === rootId
            ));
            return {
                rootId,
                elementIds: unitElements.map(el => el.id),
                bounds: getDrawingBounds(unitElements),
                locked: unitElements.some(el => el.locked)
            };
        }).filter(unit => unit.bounds);

        if (units.length < 2) return;

        const overallBounds = getDrawingBounds(units.flatMap(unit => (
            activeElementsRef.current.filter(el => unit.elementIds.includes(el.id))
        )));
        if (!overallBounds) return;

        const getDelta = (bounds) => {
            if (mode === 'left') return { dx: overallBounds.x - bounds.x, dy: 0 };
            if (mode === 'centerX') return { dx: overallBounds.cx - bounds.cx, dy: 0 };
            if (mode === 'right') return { dx: (overallBounds.x + overallBounds.w) - (bounds.x + bounds.w), dy: 0 };
            if (mode === 'top') return { dx: 0, dy: overallBounds.y - bounds.y };
            if (mode === 'centerY') return { dx: 0, dy: overallBounds.cy - bounds.cy };
            if (mode === 'bottom') return { dx: 0, dy: (overallBounds.y + overallBounds.h) - (bounds.y + bounds.h) };
            return { dx: 0, dy: 0 };
        };

        const moveMap = new Map();
        units.forEach(unit => {
            if (unit.locked) return;
            const delta = getDelta(unit.bounds);
            unit.elementIds.forEach(id => moveMap.set(id, delta));
        });

        if (moveMap.size === 0) return;

        pushHistory(activeElementsRef.current);
        const updatedElements = activeElementsRef.current.map(el => {
            const delta = moveMap.get(el.id);
            if (!delta || el.locked || el.type === 'settings') return el;
            return translateElement(el, delta.dx, delta.dy);
        });

        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({ ...s, tool: 'select', editingTextId: null }));
    }, [getSelectionWithChildren, pushHistory]);

    const distributeSelectedElements = useCallback((axis) => {
        const selectedIds = getSelectionWithChildren();
        if (selectedIds.length < 3) return;

        const selectedSet = new Set(selectedIds);
        const unitRootIds = selectedIds.filter(id => {
            const el = activeElementsRef.current.find(item => item.id === id);
            if (!el || el.type === 'settings') return false;
            return !el.parentId || !selectedSet.has(el.parentId);
        });

        const units = unitRootIds.map(rootId => {
            const unitElements = activeElementsRef.current.filter(el => (
                el.id === rootId || el.parentId === rootId
            ));
            return {
                rootId,
                elementIds: unitElements.map(el => el.id),
                bounds: getDrawingBounds(unitElements),
                locked: unitElements.some(el => el.locked)
            };
        }).filter(unit => unit.bounds);

        if (units.length < 3) return;

        const isHorizontal = axis === 'horizontal';
        const sortedUnits = [...units].sort((a, b) => (
            isHorizontal ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y
        ));
        const first = sortedUnits[0];
        const last = sortedUnits[sortedUnits.length - 1];
        const totalSize = sortedUnits.reduce((sum, unit) => sum + (isHorizontal ? unit.bounds.w : unit.bounds.h), 0);
        const start = isHorizontal ? first.bounds.x : first.bounds.y;
        const end = isHorizontal ? last.bounds.x + last.bounds.w : last.bounds.y + last.bounds.h;
        const availableGap = end - start - totalSize;
        const gap = availableGap / (sortedUnits.length - 1);

        const moveMap = new Map();
        let cursor = start;
        sortedUnits.forEach(unit => {
            const currentStart = isHorizontal ? unit.bounds.x : unit.bounds.y;
            const deltaValue = cursor - currentStart;
            if (!unit.locked) {
                unit.elementIds.forEach(id => moveMap.set(id, {
                    dx: isHorizontal ? deltaValue : 0,
                    dy: isHorizontal ? 0 : deltaValue
                }));
            }
            cursor += (isHorizontal ? unit.bounds.w : unit.bounds.h) + gap;
        });

        if (moveMap.size === 0) return;

        pushHistory(activeElementsRef.current);
        const updatedElements = activeElementsRef.current.map(el => {
            const delta = moveMap.get(el.id);
            if (!delta || el.locked || el.type === 'settings') return el;
            return translateElement(el, delta.dx, delta.dy);
        });

        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({ ...s, tool: 'select', editingTextId: null }));
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

            if (['rectangle', 'image', 'text', ...DRAWING_SHAPE_TOOLS.filter(type => type !== 'rectangle')].includes(el.type)) {
                return transformBoxElement(el, transformPoint, mode);
            }

            return el;
        });

        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({ ...s, tool: 'select', editingTextId: null }));
    }, [getSelectionWithChildren, pushHistory]);

    const persistCustomTemplates = useCallback((nextTemplates) => {
        const safeTemplates = nextTemplates.slice(0, 30);
        setCustomTemplates(safeTemplates);
        try {
            localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(safeTemplates));
        } catch (err) {
            toast.error('Kunne ikke gemme skabelonen lokalt.');
        }
    }, []);

    const saveSelectionAsTemplate = useCallback(() => {
        const selectedIds = getSelectionWithChildren();
        const selectedSet = new Set(selectedIds);
        const selectedElements = activeElementsRef.current.filter(el => selectedSet.has(el.id) && el.type !== 'settings');
        const bounds = getDrawingBounds(selectedElements);

        if (selectedElements.length === 0 || !bounds) {
            toast.error('Vælg noget på tegningen først.');
            return;
        }

        const defaultName = `Skabelon ${customTemplates.length + 1}`;
        setTemplateSaveDraft({
            name: defaultName,
            elementCount: selectedElements.length,
            bounds,
            elements: normalizeElementsForCustomTemplate(selectedElements, bounds)
        });
        setShowTemplatesMenu(false);
    }, [customTemplates, getSelectionWithChildren]);

    const confirmSaveTemplate = useCallback(() => {
        const name = templateSaveDraft?.name?.trim();
        if (!name) return;

        const template = {
            id: generateId(),
            name: name.slice(0, 42),
            createdAt: new Date().toISOString(),
            elementCount: templateSaveDraft.elementCount,
            elements: templateSaveDraft.elements
        };

        persistCustomTemplates([template, ...customTemplates]);
        setTemplateSaveDraft(null);
        setTemplateCategory('custom');
        toast.success('Skabelonen er gemt.');
    }, [customTemplates, persistCustomTemplates, templateSaveDraft]);

    const deleteCustomTemplate = useCallback((templateId) => {
        const nextTemplates = customTemplates.filter(t => t.id !== templateId);
        persistCustomTemplates(nextTemplates);
        setAppState(s => (
            s.tool === `${TEMPLATE_TOOL_PREFIX}${CUSTOM_TEMPLATE_PREFIX}${templateId}`
                ? { ...s, tool: 'select' }
                : s
        ));
        toast.success('Skabelonen er slettet.');
    }, [customTemplates, persistCustomTemplates]);

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

    const insertTemplate = useCallback((templateId, pos) => {
        const customTemplateId = templateId.startsWith(CUSTOM_TEMPLATE_PREFIX)
            ? templateId.replace(CUSTOM_TEMPLATE_PREFIX, '')
            : null;
        const customTemplate = customTemplateId
            ? customTemplates.find(t => t.id === customTemplateId)
            : null;
        const templateElements = customTemplate
            ? createCustomTemplateElements(customTemplate, pos)
            : createTemplateElements(templateId, pos, appState.color, appState.strokeWidth);
        if (templateElements.length === 0) return;

        pushHistory(activeElementsRef.current);
        const updatedElements = [...activeElementsRef.current, ...templateElements];
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setShowTemplatesMenu(false);
        setAppState(s => ({
            ...s,
            tool: 'select',
            selectedElementId: getTemplateSelectionRootId(templateElements),
            selectedElementIds: [],
            editingTextId: null,
            dragging: false
        }));
    }, [appState.color, appState.strokeWidth, customTemplates, pushHistory]);

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

    const addDimensionForSelectedShape = useCallback((axisInput) => {
        const axes = Array.isArray(axisInput) ? axisInput : [axisInput];
        const selectedIds = getSelectionWithChildren();
        const selectedSet = new Set(selectedIds);
        const selectedElements = activeElementsRef.current.filter(el => selectedSet.has(el.id) && el.type !== 'settings');
        const settings = getDrawingSettings(activeElementsRef.current);
        const bounds = getDrawingBounds(selectedElements);

        if (selectedElements.length === 0 || !bounds) {
            toast.error('Vælg noget at målsætte først.');
            return;
        }

        const parentCandidates = selectedElements.filter(el => !el.parentId || !selectedSet.has(el.parentId));
        const parentId = parentCandidates.length === 1 ? parentCandidates[0].id : null;
        const firstElement = parentCandidates[0] || selectedElements[0];
        const offset = 28;
        const dimensions = axes.map(axis => {
            const isHorizontal = axis === 'width';
            return {
                id: generateId(),
                type: 'dimension',
                ...(parentId ? { parentId } : {}),
                color: firstElement.color || appState.color,
                strokeWidth: firstElement.strokeWidth || appState.strokeWidth,
                rotation: 0,
                x: isHorizontal ? bounds.x : bounds.x + bounds.w + offset,
                y: isHorizontal ? bounds.y + bounds.h + offset : bounds.y,
                endX: isHorizontal ? bounds.x + bounds.w : bounds.x + bounds.w + offset,
                endY: isHorizontal ? bounds.y + bounds.h + offset : bounds.y + bounds.h,
                text: isHorizontal
                    ? formatLengthWithSettings(bounds.w, settings)
                    : formatLengthWithSettings(bounds.h, settings),
                fontSize: appState.fontSize || 16
            };
        });

        pushHistory(activeElementsRef.current);
        const updatedElements = [...activeElementsRef.current, ...dimensions];
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({
            ...s,
            tool: 'select',
            selectedElementId: dimensions.length === 1 ? dimensions[0].id : null,
            selectedElementIds: dimensions.length > 1 ? dimensions.map(d => d.id) : [],
            editingTextId: null
        }));
    }, [appState.color, appState.fontSize, appState.strokeWidth, getSelectionWithChildren, pushHistory]);

    const insertPrintTitleBlock = useCallback(() => {
        const contentElements = activeElementsRef.current.filter(el => el.type !== 'settings' && !el.printFrame);
        const contentBounds = getDrawingBounds(contentElements);
        const center = contentBounds ? { x: contentBounds.cx, y: contentBounds.cy } : getViewportCenter();
        const contentW = Math.max(contentBounds?.w || 520, 520);
        const contentH = Math.max(contentBounds?.h || 280, 280);
        const margin = 70;
        const titleBlockH = 70;
        const aspect = 297 / 210;
        let frameW = Math.max(760, contentW + margin * 2);
        let frameH = Math.max(540, contentH + margin * 2 + titleBlockH);

        if (frameW / frameH < aspect) {
            frameW = frameH * aspect;
        } else {
            frameH = frameW / aspect;
        }

        const rootId = generateId();
        const x = center.x - frameW / 2;
        const y = center.y - frameH / 2;
        const titleY = y + frameH - titleBlockH;
        const color = '#0f172a';
        const strokeWidth = 2;
        const line = (coords, parentId = rootId) => ({
            ...createLineElement({ id: generateId(), parentId, color, strokeWidth, ...coords }),
            printFrame: true
        });
        const text = ({ x: textX, y: textY, w, h, value, fontSize = 14, parentId = rootId }) => ({
            id: generateId(),
            parentId,
            type: 'text',
            color,
            strokeWidth,
            rotation: 0,
            x: textX,
            y: textY,
            w,
            h,
            text: value,
            fontSize,
            printFrame: true
        });

        const root = {
            ...createRectElement({ id: rootId, color, strokeWidth, x, y, w: frameW, h: frameH }),
            printFrame: true
        };
        const dateText = new Date().toLocaleDateString('da-DK');
        const titleBlockElements = [
            root,
            line({ x, y: titleY, endX: x + frameW, endY: titleY }),
            line({ x: x + frameW * 0.48, y: titleY, endX: x + frameW * 0.48, endY: y + frameH }),
            line({ x: x + frameW * 0.68, y: titleY, endX: x + frameW * 0.68, endY: y + frameH }),
            line({ x: x + frameW * 0.84, y: titleY, endX: x + frameW * 0.84, endY: y + frameH }),
            line({ x: x + frameW * 0.68, y: titleY + titleBlockH / 2, endX: x + frameW, endY: titleY + titleBlockH / 2 }),
            text({ x: x + 18, y: titleY + 14, w: frameW * 0.45, h: 26, value: drawingName || 'Ny skitse', fontSize: 20 }),
            text({ x: x + frameW * 0.49, y: titleY + 12, w: frameW * 0.17, h: 20, value: 'Sag / kunde', fontSize: 13 }),
            text({ x: x + frameW * 0.49, y: titleY + 40, w: frameW * 0.17, h: 20, value: 'Bison Frame', fontSize: 13 }),
            text({ x: x + frameW * 0.69, y: titleY + 12, w: frameW * 0.13, h: 20, value: `Dato ${dateText}`, fontSize: 13 }),
            text({ x: x + frameW * 0.69, y: titleY + 40, w: frameW * 0.13, h: 20, value: 'Målestok', fontSize: 13 }),
            text({ x: x + frameW * 0.85, y: titleY + 12, w: frameW * 0.12, h: 20, value: 'Rev.', fontSize: 13 }),
            text({ x: x + frameW * 0.85, y: titleY + 40, w: frameW * 0.12, h: 20, value: 'Side 1/1', fontSize: 13 })
        ];

        pushHistory(activeElementsRef.current);
        const updatedElements = [...activeElementsRef.current, ...titleBlockElements];
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({
            ...s,
            tool: 'select',
            selectedElementId: rootId,
            selectedElementIds: [],
            editingTextId: null
        }));
        toast.success('A4 titelblok er indsat.');
    }, [drawingName, getViewportCenter, pushHistory]);

    const insertMaterialNoteFromSelection = useCallback(() => {
        const selectedIds = getSelectionWithChildren();
        const selectedSet = new Set(selectedIds);
        const selectedElements = activeElementsRef.current.filter(el => (
            selectedSet.has(el.id) && el.type !== 'settings' && !el.printFrame && !el.materialNote
        ));
        const bounds = getDrawingBounds(selectedElements);

        if (selectedElements.length === 0 || !bounds) {
            toast.error('Vælg almindelige tegneelementer først.');
            return;
        }

        const settings = getDrawingSettings(activeElementsRef.current);
        const lineTypes = new Set(['line', 'arrow', 'dimension']);
        const boxTypes = new Set(['image', ...DRAWING_SHAPE_TOOLS]);
        const lineCount = selectedElements.filter(el => lineTypes.has(el.type)).length;
        const shapeCount = selectedElements.filter(el => boxTypes.has(el.type)).length;
        const textCount = selectedElements.filter(el => el.type === 'text').length;
        const totalLineLength = selectedElements.reduce((sum, el) => {
            const metrics = getLineMetrics(el);
            return sum + (metrics?.length || 0);
        }, 0);

        const rootId = generateId();
        const noteX = bounds.x + bounds.w + 46;
        const noteY = bounds.y;
        const noteW = 250;
        const rowH = 22;
        const lines = [
            'Materialenote',
            `Elementer: ${selectedElements.length}`,
            `B: ${formatLengthWithSettings(bounds.w, settings)}  H: ${formatLengthWithSettings(bounds.h, settings)}`,
            `Areal ca.: ${formatAreaWithSettings(bounds.w * bounds.h, settings)}`,
            `Linjelængde: ${formatLengthWithSettings(totalLineLength, settings)}`,
            `Figurer: ${shapeCount}  Linjer: ${lineCount}  Tekst: ${textCount}`
        ];
        const noteH = 24 + lines.length * rowH;
        const color = '#0f172a';
        const strokeWidth = 2;
        const root = {
            ...createRectElement({ id: rootId, color, strokeWidth, x: noteX, y: noteY, w: noteW, h: noteH }),
            materialNote: true
        };
        const textElements = lines.map((line, index) => ({
            id: generateId(),
            parentId: rootId,
            type: 'text',
            color,
            strokeWidth,
            rotation: 0,
            x: noteX + 12,
            y: noteY + 10 + index * rowH,
            w: noteW - 24,
            h: rowH,
            text: line,
            fontSize: index === 0 ? 16 : 13,
            materialNote: true
        }));

        pushHistory(activeElementsRef.current);
        const updatedElements = [...activeElementsRef.current, root, ...textElements];
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({
            ...s,
            tool: 'select',
            selectedElementId: rootId,
            selectedElementIds: [],
            editingTextId: null
        }));
        toast.success('Materialenote er indsat.');
    }, [getSelectionWithChildren, pushHistory]);

    const runDrawingPreflight = useCallback(() => {
        const drawingElements = activeElementsRef.current.filter(el => el.type !== 'settings');
        if (drawingElements.length === 0) {
            toast.error('Tegningen er tom.');
            return;
        }

        const settings = getDrawingSettings(activeElementsRef.current);
        const dimensions = drawingElements.filter(el => el.type === 'dimension');
        const emptyTextCount = drawingElements.filter(el => (
            (el.type === 'text' || el.type === 'dimension') && !String(el.text || '').trim()
        )).length;
        const unlockedImageCount = drawingElements.filter(el => el.type === 'image' && !el.locked).length;
        const hasTitleBlock = drawingElements.some(el => el.printFrame);
        const hasMaterialNote = drawingElements.some(el => el.materialNote);
        const issues = [];

        if (!settings?.measurementScale?.metersPerUnit) issues.push('Målestok er ikke kalibreret.');
        if (dimensions.length === 0) issues.push('Der er ingen mållinjer.');
        if (emptyTextCount > 0) issues.push(`${emptyTextCount} tekst-/målfelt er tomt.`);
        if (unlockedImageCount > 0) issues.push(`${unlockedImageCount} billede(r) er ikke låst.`);
        if (!hasTitleBlock) issues.push('A4 titelblok mangler.');
        if (!hasMaterialNote) issues.push('Materialenote mangler.');

        const summary = `${drawingElements.length} elementer · ${dimensions.length} mål`;
        if (issues.length === 0) {
            showChecklistToast('success', 'Tegningskontrol OK', summary, [], 5000);
            return;
        }

        const visibleIssues = issues.slice(0, 5);
        if (issues.length > 5) visibleIssues.push(`+${issues.length - 5} mere`);
        showChecklistToast('error', 'Tegningskontrol', summary, visibleIssues, 7000);
    }, []);

    const updateSelectedShapeSize = useCallback((axis, rawValue) => {
        const shapeId = appState.selectedElementId;
        const shapeElement = activeElementsRef.current.find(el => el.id === shapeId);
        const settings = getDrawingSettings(activeElementsRef.current);
        const parsed = parseLengthInputToDrawingUnits(rawValue, settings);

        if (!shapeElement || !SHAPE_DIMENSION_TYPES.includes(shapeElement.type)) return;
        if (shapeElement.locked) {
            toast.error('Elementet er låst.');
            return;
        }
        if (!parsed || !parsed.value) return;
        if (parsed.error) {
            toast.error(parsed.error);
            return;
        }

        const bounds = getElementBounds(shapeElement);
        const nextValue = Math.max(1, parsed.value);

        pushHistory(activeElementsRef.current);
        const updatedElements = activeElementsRef.current.map(el => {
            if (el.id !== shapeId) return el;
            return {
                ...el,
                x: bounds.x,
                y: bounds.y,
                w: axis === 'width' ? nextValue : bounds.w,
                h: axis === 'height' ? nextValue : bounds.h
            };
        });

        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({ ...s, tool: 'select', editingTextId: null }));
    }, [appState.selectedElementId, pushHistory]);

    const updateSelectedLineMetric = useCallback((metric, rawValue) => {
        const lineId = appState.selectedElementId;
        const lineElement = activeElementsRef.current.find(el => el.id === lineId);
        const settings = getDrawingSettings(activeElementsRef.current);
        const currentMetrics = getLineMetrics(lineElement);

        if (!lineElement || !currentMetrics) return;
        if (lineElement.locked) {
            toast.error('Elementet er låst.');
            return;
        }

        let nextLength = currentMetrics.length;
        let nextAngle = currentMetrics.angle;

        if (metric === 'length') {
            const parsed = parseLengthInputToDrawingUnits(rawValue, settings);
            if (!parsed || !parsed.value) return;
            if (parsed.error) {
                toast.error(parsed.error);
                return;
            }
            nextLength = Math.max(1, parsed.value);
        }

        if (metric === 'angle') {
            const parsedAngle = parseAngleInput(rawValue);
            if (parsedAngle === null) return;
            nextAngle = parsedAngle;
        }

        const angleRad = nextAngle * Math.PI / 180;
        pushHistory(activeElementsRef.current);
        const updatedElements = activeElementsRef.current.map(el => {
            if (el.id !== lineId) return el;
            return {
                ...el,
                endX: el.x + Math.cos(angleRad) * nextLength,
                endY: el.y + Math.sin(angleRad) * nextLength
            };
        });

        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
        setAppState(s => ({ ...s, tool: 'select', editingTextId: null, snapPoint: null }));
    }, [appState.selectedElementId, pushHistory]);

    const addNoteToSelectedLine = useCallback(() => {
        const lineId = appState.selectedElementId;
        const lineElement = activeElementsRef.current.find(el => el.id === lineId);
        const metrics = getLineMetrics(lineElement);
        if (!lineElement || !metrics) return;
        if (lineElement.locked) {
            toast.error('Elementet er låst.');
            return;
        }

        const fontSize = appState.fontSize || 20;
        const notePos = getLineNotePosition(lineElement, metrics.midpoint, fontSize);
        const textId = generateId();
        const newText = {
            id: textId,
            type: 'text',
            attachedToId: lineElement.id,
            isLineNote: true,
            text: '',
            color: appState.color,
            x: notePos.x,
            y: notePos.y,
            w: 120,
            h: Math.max(30, fontSize + 12),
            fontSize
        };

        pushHistory(activeElementsRef.current);
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
    }, [appState.color, appState.fontSize, appState.selectedElementId, pushHistory]);

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
        const selectedSet = new Set(expandMoveIdsWithAttachedNotes(selectedIds));
        const updatedElements = activeElementsRef.current.map(el => {
            const isMoving = selectedSet.has(el.id) || selectedSet.has(el.parentId) || selectedSet.has(el.attachedToId);
            if (!isMoving || el.locked) return el;
            return translateElement(el, dx, dy);
        });
        activeElementsRef.current = updatedElements;
        setElements(updatedElements);
    }, [expandMoveIdsWithAttachedNotes, getSelectedIds, pushHistory]);

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
            } else if (el.type === 'semicircle') {
                ctx.beginPath();
                ctx.moveTo(bounds.x, bounds.y + bounds.h);
                ctx.ellipse(bounds.cx, bounds.y + bounds.h, bounds.w / 2, bounds.h, 0, Math.PI, Math.PI * 2);
                ctx.lineTo(bounds.x, bounds.y + bounds.h);
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
                    const fontSize = el.fontSize || 20;
                    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
                    ctx.textBaseline = 'top';
                    if (isLineNoteElement(el, elementsToDraw)) {
                        const textWidth = ctx.measureText(el.text).width;
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(el.x - 5, el.y - 3, textWidth + 10, fontSize + 8);
                    }
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
    }, [appState.editingTextId, appState.showGrid, appState.snapEnabled, redraw]);

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

    const getTouchPair = () => Array.from(activeTouchPointersRef.current.values()).slice(0, 2);

    const getTouchGesture = (points) => {
        if (points.length < 2) return null;
        const [a, b] = points;
        const center = {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
        };
        return {
            center,
            distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
        };
    };

    // Pointer Events
    const handlePointerDown = (e) => {
        if (e.pointerType === 'touch') {
            activeTouchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (activeTouchPointersRef.current.size >= 2) {
                const gesture = getTouchGesture(getTouchPair());
                if (gesture) {
                    if (appState.dragging && appState.tool !== 'select' && appState.selectedElementId) {
                        const cleanedElements = activeElementsRef.current.filter(el => el.id !== appState.selectedElementId);
                        activeElementsRef.current = cleanedElements;
                        setElements(cleanedElements);
                    }
                    pinchRef.current = {
                        startDistance: gesture.distance,
                        startZoom: activeZoomRef.current,
                        startPan: { ...activePanRef.current },
                        startCenter: gesture.center
                    };
                    setAppState(s => ({
                        ...s,
                        dragging: false,
                        rotating: false,
                        resizing: false,
                        panning: false,
                        marqueeStartPoint: null,
                        marqueeCurrentPoint: null,
                        snapPoint: null,
                        dragGuide: null
                    }));
                }
                return;
            }
        }

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

        if (appState.tool.startsWith(TEMPLATE_TOOL_PREFIX)) {
            insertTemplate(appState.tool.replace(TEMPLATE_TOOL_PREFIX, ''), pos);
            return;
        }
        
        if (appState.tool === 'select') {
            const clickedElement = getElementAtPosition(pos.x, pos.y, activeElementsRef.current);
            if (clickedElement) {
                if (clickedElement.id === appState.selectedElementId && (clickedElement.type === 'text' || clickedElement.type === 'dimension')) {
                    setAppState(s => ({ ...s, editingTextId: clickedElement.id }));
                } else {
                    let moduleIds = [clickedElement.id];
                    const clickedLineNote = isLineNoteElement(clickedElement, activeElementsRef.current);
                    if (!appState.drillDown && !clickedLineNote) {
                        const moduleRootId = clickedElement.parentId || clickedElement.id;
                        moduleIds = getConnectedModule(moduleRootId, activeElementsRef.current);
                        if (!moduleIds.includes(clickedElement.id)) moduleIds.push(clickedElement.id);
                    }
                    moduleIds = clickedLineNote ? moduleIds : expandMoveIdsWithAttachedNotes(moduleIds);
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
                const deleteIds = getSelectionWithChildren([clickedElement.id]);
                const updatedElements = activeElementsRef.current.filter(el => el.locked || !deleteIds.includes(el.id));
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
            } else if (['text', ...DRAWING_SHAPE_TOOLS].includes(appState.tool)) {
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
        if (e.pointerType === 'touch' && activeTouchPointersRef.current.has(e.pointerId)) {
            activeTouchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        if (pinchRef.current && activeTouchPointersRef.current.size >= 2) {
            const gesture = getTouchGesture(getTouchPair());
            if (!gesture) return;
            const rect = containerRef.current.getBoundingClientRect();
            const screenX = gesture.center.x - rect.left;
            const screenY = gesture.center.y - rect.top;
            const start = pinchRef.current;
            const worldAtStartCenter = {
                x: (start.startCenter.x - rect.left - start.startPan.x) / start.startZoom,
                y: (start.startCenter.y - rect.top - start.startPan.y) / start.startZoom
            };
            const nextZoom = Math.min(Math.max(start.startZoom * (gesture.distance / start.startDistance), 0.1), 10);

            activeZoomRef.current = nextZoom;
            activePanRef.current = {
                x: screenX - worldAtStartCenter.x * nextZoom,
                y: screenY - worldAtStartCenter.y * nextZoom
            };
            setAppState(s => ({ ...s, zoom: nextZoom }));
            syncOverlayTransform();
            redraw();
            return;
        }

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

                if (el.type === 'image' || el.type === 'text' || DRAWING_SHAPE_TOOLS.includes(el.type)) {
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
                        const snap = appState.snapEnabled && !e.altKey ? findSnapPoint(localPos, activeElementsRef.current, el.id) : null;
                        setAppState(s => ({ ...s, snapPoint: snap }));
                        const rawPos = snap || localPos;
                        const nextPos = e.shiftKey ? constrainAngle({ x: el.endX, y: el.endY }, rawPos) : rawPos;
                        return { ...el, x: nextPos.x, y: nextPos.y };
                    }
                    if (appState.resizing === 'end') {
                        const snap = appState.snapEnabled && !e.altKey ? findSnapPoint(localPos, activeElementsRef.current, el.id) : null;
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
                    syncSelectionOverlayBox(el);
                    
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
            const rotation = (appState.initialRotation || 0) + (angle - (appState.rotationStartAngle || 0));
            
            activeElementsRef.current = activeElementsRef.current.map(e => e.id === appState.selectedElementId ? { ...e, rotation } : e);
            syncSelectionOverlayBox({ ...el, rotation });
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
                const isMoving = moduleIds.includes(el.id) || moduleIds.includes(el.parentId) || moduleIds.includes(el.attachedToId);
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
                else if (['image', ...DRAWING_SHAPE_TOOLS].includes(appState.tool)) {
                    const snap = appState.snapEnabled && !e.altKey ? findSnapPoint(pos, activeElementsRef.current, el.id) : null;
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
                    const snap = appState.snapEnabled && !e.altKey ? findSnapPoint(pos, activeElementsRef.current, el.id) : null;
                    setAppState(s => ({ ...s, snapPoint: snap }));
                    const rawEndPos = snap || pos;
                    const endPos = e.shiftKey ? constrainAngle({ x: el.x, y: el.y }, rawEndPos) : rawEndPos;
                    return { ...el, endX: endPos.x, endY: endPos.y };
                }
                return el;
            });

            if (appState.tool === 'select' && moduleIds?.length > 0) {
                const movingSet = new Set(moduleIds);
                const movingElements = activeElementsRef.current.filter(el => (
                    movingSet.has(el.id) || (el.parentId && movingSet.has(el.parentId)) || (el.attachedToId && movingSet.has(el.attachedToId))
                ));
                const movingBounds = getDrawingBounds(movingElements);
                const totalDx = pos.x - (appState.actionStartPoint?.x || pos.x);
                const totalDy = pos.y - (appState.actionStartPoint?.y || pos.y);
                if (movingBounds) {
                    setAppState(s => ({
                        ...s,
                        dragGuide: {
                            x: movingBounds.cx,
                            y: movingBounds.y - 18,
                            dx: totalDx,
                            dy: totalDy
                        }
                    }));
                }
            }

            // Sync overlays directly via DOM during drag to avoid React render
            if (appState.selectedElementId && selectionOverlayRef.current) {
                    const el = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
                if (el) {
                    const bounds = getElementBounds(el);
                    const endpointHandleSize = 10 / (activeZoomRef.current || 1);
                    syncSelectionOverlayBox(el);
                    
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

    const handlePointerUp = (e) => {
        if (e?.pointerType === 'touch') {
            activeTouchPointersRef.current.delete(e.pointerId);
            if (activeTouchPointersRef.current.size < 2) {
                pinchRef.current = null;
            }
        }

        setAppState(s => ({ ...s, snapPoint: null, dragGuide: null }));
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
            setAppState(s => ({ ...s, dragging: false, rotating: false, resizing: false, rotationStartAngle: 0 }));
            
            // SYNCHRONIZE BYPASS TO REACT STATE
            setElements(activeElementsRef.current);
            
            const activeEl = activeElementsRef.current.find(e => e.id === appState.selectedElementId);
            if (activeEl && appState.tool !== 'select') {
                // If drawing a rect/arrow that is tiny, remove it
                if (DRAWING_SHAPE_TOOLS.includes(activeEl.type) && Math.abs(activeEl.w) < 5 && Math.abs(activeEl.h) < 5) {
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
                    const notePos = getLineNotePosition(activeEl, { x: activeEl.endX, y: activeEl.endY }, appState.fontSize || 20);
                    const newText = {
                        id: textId,
                        type: 'text',
                        attachedToId: activeEl.id,
                        isLineNote: true,
                        text: '',
                        color: appState.color,
                        x: notePos.x,
                        y: notePos.y,
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
                    transform: `rotate(${selectedElement.rotation || 0}rad)`,
                    transformOrigin: 'center center',
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
                                const pointer = getPointerPos(e);
                                const startAngle = Math.atan2(pointer.y - bounds.cy, pointer.x - bounds.cx);
                                setAppState(s => ({
                                    ...s,
                                    rotating: true,
                                    resizing: false,
                                    dragging: false,
                                    actionStartPoint: pointer,
                                    initialRotation: selectedElement.rotation || 0,
                                    rotationStartAngle: startAngle
                                }));
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
                {!selectedElement.locked && ['image', 'text', ...DRAWING_SHAPE_TOOLS].includes(selectedElement.type) && ['nw', 'ne', 'sw', 'se'].map(corner => (
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
        const physicalLength = settings?.measurementScale?.metersPerUnit
            ? metrics.length * settings.measurementScale.metersPerUnit
            : null;

        return (
            <div style={{
                position: 'absolute',
                left: metrics.midpoint.x + 12 / zoom,
                top: metrics.midpoint.y - 34 / zoom,
                padding: `${6 / zoom}px ${7 / zoom}px`,
                borderRadius: 6 / zoom,
                background: 'rgba(255, 255, 255, 0.96)',
                color: '#0f172a',
                fontSize: 11 / zoom,
                fontWeight: 700,
                letterSpacing: 0,
                whiteSpace: 'nowrap',
                pointerEvents: 'auto',
                zIndex: 72,
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.14)',
                border: `${1 / zoom}px solid rgba(37, 99, 235, 0.22)`,
                display: 'grid',
                gridTemplateColumns: `${14 / zoom}px ${74 / zoom}px`,
                gap: `${4 / zoom}px`,
                alignItems: 'center'
            }}>
                {[
                    {
                        metric: 'length',
                        label: 'L',
                        value: physicalLength ? formatPhysicalLength(physicalLength) : formatMeasurementNumber(metrics.length)
                    },
                    {
                        metric: 'angle',
                        label: '°',
                        value: `${Math.round(metrics.angle)}°`
                    }
                ].map(item => (
                    <React.Fragment key={item.metric}>
                        <span style={{ color: '#64748b', fontSize: 10 / zoom, textAlign: 'center' }}>{item.label}</span>
                        <input
                            key={`${element.id}-${item.metric}-${item.value}`}
                            defaultValue={item.value}
                            disabled={element.locked}
                            onPointerDown={(e) => e.stopPropagation()}
                            onBlur={(e) => updateSelectedLineMetric(item.metric, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                                if (e.key === 'Escape') e.currentTarget.blur();
                            }}
                            style={{
                                width: 74 / zoom,
                                height: 20 / zoom,
                                border: `${1 / zoom}px solid #cbd5e1`,
                                borderRadius: 5 / zoom,
                                padding: `0 ${5 / zoom}px`,
                                fontSize: 10 / zoom,
                                fontWeight: 800,
                                color: '#0f172a',
                                outline: 'none',
                                background: element.locked ? '#f1f5f9' : '#ffffff'
                            }}
                            title={item.metric === 'length' ? 'Præcis længde' : 'Præcis vinkel'}
                        />
                    </React.Fragment>
                ))}
            </div>
        );
    };

    const renderDragGuide = () => {
        if (!appState.dragGuide || appState.tool !== 'select') return null;
        const zoom = activeZoomRef.current || 1;
        const settings = getDrawingSettings(activeElementsRef.current);
        const formatSigned = (value) => {
            const prefix = value >= 0 ? '+' : '-';
            return `${prefix}${formatLengthWithSettings(Math.abs(value), settings)}`;
        };

        return (
            <div style={{
                position: 'absolute',
                left: appState.dragGuide.x,
                top: appState.dragGuide.y,
                transform: 'translate(-50%, -100%)',
                padding: `${5 / zoom}px ${8 / zoom}px`,
                borderRadius: 6 / zoom,
                background: 'rgba(37, 99, 235, 0.95)',
                color: '#ffffff',
                fontSize: 11 / zoom,
                fontWeight: 800,
                letterSpacing: 0,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 73,
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.24)'
            }}>
                X {formatSigned(appState.dragGuide.dx)} · Y {formatSigned(appState.dragGuide.dy)}
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
                    className="drawing-text-editor"
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
            if (['line', 'arrow', 'dimension', ...DRAWING_SHAPE_TOOLS].includes(clickedElement.type)) {
                if (MEASURABLE_TYPES.includes(clickedElement.type)) {
                    setAppState(s => ({ ...s, selectedElementId: clickedElement.id, selectedElementIds: [], editingTextId: null }));
                    return;
                }
                const textId = generateId();
                pushHistory(elements);
                const notePos = getLineNotePosition(clickedElement, pos, appState.fontSize || 20);
                
                const newElement = {
                    id: textId,
                    type: 'text',
                    parentId: clickedElement.id,
                    text: '',
                    color: appState.color,
                    x: notePos.x,
                    y: notePos.y,
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
    const canGroupSelection = appState.selectedElementIds?.length > 1;
    const canUngroupSelection = selectedLockableElements.some(el => el.parentId && selectedIdsForPanel.includes(el.parentId));
    const canAlignSelection = selectedLockableElements.length > 1;
    const canDistributeSelection = selectedLockableElements.length > 2;
    const activeToolTitle = (() => {
        if (appState.tool.startsWith(SYMBOL_TOOL_PREFIX)) {
            const symbol = CARPENTER_SYMBOLS.find(item => `${SYMBOL_TOOL_PREFIX}${item.id}` === appState.tool);
            return symbol ? `Symbol: ${symbol.title}` : 'Symbol';
        }
        if (appState.tool.startsWith(TEMPLATE_TOOL_PREFIX)) return 'Skabelon';
        const tool = [
            { id: 'select', title: 'Markør' },
            { id: 'pen', title: 'Fritegning' },
            { id: 'line', title: 'Lige streg' },
            { id: 'arrow', title: 'Pil' },
            { id: 'dimension', title: 'Målebånd' },
            { id: 'callout', title: 'OBS-note' },
            { id: 'text', title: 'Tekst' },
            { id: 'eraser', title: 'Viskelæder' },
            ...DRAWING_SHAPE_TOOLS.map(id => ({
                id,
                title: ({
                    rectangle: 'Firkant',
                    circle: 'Cirkel',
                    semicircle: 'Halvcirkel',
                    triangle: 'Trekant',
                    polygon: 'Polygon',
                    rhombus: 'Rombe',
                    parallelogram: 'Parallelogram',
                    trapezoid: 'Trapez'
                })[id] || id
            }))
        ].find(item => item.id === appState.tool);
        return tool?.title || 'Værktøj';
    })();
    const handlePanelTooltipMove = (e) => {
        const target = e.target.closest('[title], [data-tooltip-title]');
        if (!target) {
            setPanelTooltip(null);
            return;
        }

        const title = target.getAttribute('data-tooltip-title') || target.getAttribute('title');
        if (!title) {
            setPanelTooltip(null);
            return;
        }

        if (target.hasAttribute('title')) {
            target.setAttribute('data-tooltip-title', title);
            target.removeAttribute('title');
        }

        setPanelTooltip({
            title,
            description: TOOLTIP_DESCRIPTIONS[title] || '',
            x: Math.max(16, e.clientX - 250),
            y: Math.min(window.innerHeight - 120, Math.max(16, e.clientY - 18))
        });
    };
    const clearPanelTooltip = () => setPanelTooltip(null);
    const PanelLabel = ({ children }) => (
        <div style={{
            width: 86,
            color: '#94a3b8',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            textAlign: 'center',
            paddingTop: 2
        }}>
            {children}
        </div>
    );
    const PanelRule = () => <div style={{ width: 20, height: 1, backgroundColor: '#e2e8f0' }} />;
    const panelTooltipElement = panelTooltip && (
        <div style={{
            position: 'fixed',
            left: panelTooltip.x,
            top: panelTooltip.y,
            width: 218,
            zIndex: 30000,
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.96)',
            color: '#ffffff',
            borderRadius: 10,
            padding: '9px 10px',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.24)',
            border: '1px solid rgba(255,255,255,0.08)'
        }}>
            <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.2 }}>{panelTooltip.title}</div>
            {panelTooltip.description && (
                <div style={{ marginTop: 4, fontSize: 11, fontWeight: 650, lineHeight: 1.35, color: '#cbd5e1' }}>
                    {panelTooltip.description}
                </div>
            )}
        </div>
    );
    const templateSaveModal = templateSaveDraft && (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 20000,
                background: 'rgba(15, 23, 42, 0.34)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
            }}
            onPointerDown={() => setTemplateSaveDraft(null)}
        >
            <div
                style={{
                    width: 'min(420px, calc(100vw - 32px))',
                    background: 'rgba(255, 255, 255, 0.96)',
                    border: '1px solid rgba(226, 232, 240, 0.95)',
                    borderRadius: 16,
                    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22), 0 4px 18px rgba(15, 23, 42, 0.08)',
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                }}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <LayoutTemplate size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Gem som skabelon</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginTop: 2 }}>
                            {templateSaveDraft.elementCount} elementer gemmes til hurtig genbrug.
                        </div>
                    </div>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>Navn på skabelon</span>
                    <input
                        autoFocus
                        value={templateSaveDraft.name}
                        onChange={(e) => setTemplateSaveDraft(draft => ({ ...draft, name: e.target.value }))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmSaveTemplate();
                            if (e.key === 'Escape') setTemplateSaveDraft(null);
                        }}
                        style={{
                            height: 42,
                            borderRadius: 10,
                            border: '1px solid #bfdbfe',
                            background: '#ffffff',
                            color: '#0f172a',
                            padding: '0 12px',
                            outline: 'none',
                            fontSize: 14,
                            fontWeight: 800,
                            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.08)'
                        }}
                    />
                </label>

                <div style={{
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '10px 12px',
                    color: '#475569',
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1.45
                }}>
                    Skabelonen bliver ikke downloadet. Den gemmes i denne browser under <strong>Skabeloner → Egne</strong>, hvor du kan indsætte den igen på andre skitser.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                        onClick={() => setTemplateSaveDraft(null)}
                        className="rounded-lg text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                        style={{ height: 38, padding: '0 14px', fontSize: 13, fontWeight: 800 }}
                    >
                        Annuller
                    </button>
                    <button
                        onClick={confirmSaveTemplate}
                        disabled={!templateSaveDraft.name.trim()}
                        className="rounded-lg text-white transition-all active:scale-95 disabled:opacity-40"
                        style={{
                            height: 38,
                            padding: '0 16px',
                            fontSize: 13,
                            fontWeight: 800,
                            background: '#0f172a',
                            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.18)'
                        }}
                    >
                        Gem skabelon
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000000, backgroundColor: '#f8fafc', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            
            <div 
                ref={containerRef}
                style={{ position: 'fixed', inset: 0, overflow: 'hidden', cursor: appState.tool === 'select' ? 'default' : 'crosshair', backgroundColor: '#f8fafc', touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
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
                    {renderDragGuide()}
                    {textOverlay}
                </div>
            </div>
            {templateSaveModal}
            <div className="drawing-mobile-tool-chip">
                <span>{activeToolTitle}</span>
                {appState.snapEnabled && <span className="drawing-mobile-tool-chip-dot">Snap</span>}
            </div>
            {appState.editingTextId && (
                <button
                    type="button"
                    className="drawing-mobile-done-button"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        document.activeElement?.blur?.();
                    }}
                >
                    Færdig
                </button>
            )}

            {/* 1. TOP BAR (Header) - ORIGINAL FLOATING STYLE */}
            <div className="drawing-board-header" style={{ 
                position: 'absolute',
                top: 'calc(max(env(safe-area-inset-top), 20px) + 12px)',
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
                        <span className="drawing-desktop-text">Tilbage</span>
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
                        <Share size={18} />
                        <span className="drawing-desktop-text">Gem som PDF</span>
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
                        <span className="drawing-desktop-text">{isSaving ? 'Gemmer...' : 'Gem Skitse'}</span>
                    </button>
                </div>
            </div>

            {/* 2. RIGHT PANEL (Colors & Undo) - TLDRAW CLONE */}
            {/* MOBILE TOGGLE BUTTON */}
            <div className="drawing-mobile-toggle" style={{ position: 'absolute', top: 'calc(max(env(safe-area-inset-top), 20px) + 76px)', right: 16, zIndex: 10001 }}>
                <button 
                    onClick={() => setShowMobileRightPanel(!showMobileRightPanel)}
                    style={{
                        width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(16px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(226, 232, 240, 0.9)',
                        color: showMobileRightPanel ? '#2563eb' : '#64748b'
                    }}
                >
                    <SlidersHorizontal size={20} />
                </button>
            </div>

            <div className={`drawing-right-panel ${showMobileRightPanel ? 'open' : ''}`} style={{
                position: 'absolute', top: 'calc(max(env(safe-area-inset-top), 20px) + 76px)', right: 16, zIndex: 10000,
                backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)',
                borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', gap: '8px',
                border: '1px solid rgba(226, 232, 240, 0.9)'
            }}
                onMouseMove={handlePanelTooltipMove}
                onMouseLeave={clearPanelTooltip}
            >
                <PanelLabel>Stil</PanelLabel>
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
                        <div className="drawing-mobile-popover drawing-color-popover" style={{
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
                <PanelRule />
                
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

                <PanelRule />

                {selectedMetrics && (
                    <>
                        <PanelLabel>Mål</PanelLabel>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 4, width: 86, alignItems: 'center' }}>
                            {[
                                {
                                    metric: 'length',
                                    label: 'L',
                                    value: selectedPhysicalLength ? formatPhysicalLength(selectedPhysicalLength) : formatMeasurementNumber(selectedMetrics.length)
                                },
                                {
                                    metric: 'angle',
                                    label: '°',
                                    value: `${Math.round(selectedMetrics.angle)}°`
                                }
                            ].map(item => (
                                <React.Fragment key={item.metric}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textAlign: 'center' }}>{item.label}</span>
                                    <input
                                        key={`${selectedElement.id}-${item.metric}-${item.value}`}
                                        defaultValue={item.value}
                                        disabled={selectedElement.locked}
                                        onBlur={(e) => updateSelectedLineMetric(item.metric, e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') e.currentTarget.blur();
                                        }}
                                        style={{
                                            width: '100%',
                                            height: 25,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 7,
                                            padding: '0 6px',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            outline: 'none',
                                            background: selectedElement.locked ? '#f1f5f9' : '#ffffff'
                                        }}
                                        title={item.metric === 'length' ? 'Præcis længde' : 'Præcis vinkel'}
                                    />
                                </React.Fragment>
                            ))}
                        </div>
                        <button
                            onClick={addNoteToSelectedLine}
                            disabled={selectedElement.locked}
                            className="rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center gap-1"
                            style={{ width: 86, height: 27, fontSize: 11, fontWeight: 800 }}
                            title="Tilføj note til linje"
                        >
                            <AlertTriangle size={13} />
                            Note
                        </button>
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
                        <PanelRule />
                    </>
                )}

                {selectedShapeMetrics && (
                    <>
                        <PanelLabel>Størrelse</PanelLabel>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 4, width: 86, alignItems: 'center' }}>
                            {[
                                { axis: 'width', label: 'B', value: selectedShapeMetrics.widthLabel },
                                { axis: 'height', label: 'H', value: selectedShapeMetrics.heightLabel }
                            ].map(item => (
                                <React.Fragment key={item.axis}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textAlign: 'center' }}>{item.label}</span>
                                    <input
                                        key={`${selectedElement.id}-${item.axis}-${item.value}`}
                                        defaultValue={item.value}
                                        disabled={selectedElement.locked}
                                        onBlur={(e) => updateSelectedShapeSize(item.axis, e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') e.currentTarget.blur();
                                        }}
                                        style={{
                                            width: '100%',
                                            height: 25,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 7,
                                            padding: '0 6px',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            outline: 'none',
                                            background: selectedElement.locked ? '#f1f5f9' : '#ffffff'
                                        }}
                                        title={`${item.label} præcis størrelse`}
                                    />
                                </React.Fragment>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, width: 86 }}>
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
                            <button
                                onClick={() => addDimensionForSelectedShape(['width', 'height'])}
                                className="rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all active:scale-95"
                                style={{ height: 26, fontSize: 11, fontWeight: 800 }}
                                title="Tilføj bredde og højde"
                            >
                                B/H
                            </button>
                        </div>
                        <PanelRule />
                    </>
                )}

                {(selectedElement?.type === 'text' || selectedElement?.type === 'dimension' || appState.tool === 'text') && (
                    <>
                        <PanelLabel>Tekst</PanelLabel>
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
                        <PanelRule />
                    </>
                )}

                {selectedElement?.type === 'dimension' && (
                    <>
                        <PanelLabel>Måltekst</PanelLabel>
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
                        <PanelRule />
                    </>
                )}

                {hasSelection && (
                    <>
                        <PanelLabel>Markering</PanelLabel>
                        {!selectedShapeMetrics && !selectedMetrics && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, width: 86 }}>
                                    <button
                                        onClick={() => addDimensionForSelectedShape('width')}
                                        className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                                        style={{ height: 26, fontSize: 11, fontWeight: 800 }}
                                        title="Målsæt markeringens bredde"
                                    >
                                        B
                                    </button>
                                    <button
                                        onClick={() => addDimensionForSelectedShape('height')}
                                        className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                                        style={{ height: 26, fontSize: 11, fontWeight: 800 }}
                                        title="Målsæt markeringens højde"
                                    >
                                        H
                                    </button>
                                    <button
                                        onClick={() => addDimensionForSelectedShape(['width', 'height'])}
                                        className="rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all active:scale-95"
                                        style={{ height: 26, fontSize: 11, fontWeight: 800 }}
                                        title="Målsæt bredde og højde"
                                    >
                                        B/H
                                    </button>
                                </div>
                            </>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, width: 86 }}>
                            <button
                                onClick={saveSelectionAsTemplate}
                                className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                style={{ height: 28 }}
                                title="Gem valgte som skabelon"
                            >
                                <LayoutTemplate size={15} />
                            </button>
                            <button
                                onClick={insertMaterialNoteFromSelection}
                                className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                style={{ height: 28 }}
                                title="Indsæt materialenote"
                            >
                                <ClipboardList size={15} />
                            </button>
                            <button
                                onClick={toggleSelectedLock}
                                className={`rounded-md transition-all active:scale-95 flex items-center justify-center ${selectionIsLocked ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-100'}`}
                                style={{ height: 28 }}
                                title={selectionIsLocked ? 'Lås op' : 'Lås valgte elementer'}
                            >
                                {selectionIsLocked ? <Lock size={15} /> : <Unlock size={15} />}
                            </button>
                        </div>
                        <button
                            onClick={() => setShowAdvancedTools(v => !v)}
                            className={`rounded-lg transition-all active:scale-95 ${showAdvancedTools ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:bg-slate-100'}`}
                            style={{ width: 86, height: 30, fontSize: 11, fontWeight: 900 }}
                            title={showAdvancedTools ? 'Skjul avancerede værktøjer' : 'Vis avancerede værktøjer'}
                        >
                            {showAdvancedTools ? 'Skjul' : 'Mere'}
                        </button>
                        {showAdvancedTools && (
                            <>
                                <PanelLabel>Avanceret</PanelLabel>
                                {canAlignSelection && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, width: 78 }}>
                                            {[
                                                { mode: 'left', icon: AlignHorizontalJustifyStart, title: 'Ret venstre' },
                                                { mode: 'centerX', icon: AlignHorizontalJustifyCenter, title: 'Ret lodret center' },
                                                { mode: 'right', icon: AlignHorizontalJustifyEnd, title: 'Ret højre' },
                                                { mode: 'top', icon: AlignVerticalJustifyStart, title: 'Ret top' },
                                                { mode: 'centerY', icon: AlignVerticalJustifyCenter, title: 'Ret vandret center' },
                                                { mode: 'bottom', icon: AlignVerticalJustifyEnd, title: 'Ret bund' }
                                            ].map(item => (
                                                <button
                                                    key={item.mode}
                                                    onClick={() => alignSelectedElements(item.mode)}
                                                    className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                                    style={{ width: 23, height: 23 }}
                                                    title={item.title}
                                                >
                                                    <item.icon size={14} />
                                                </button>
                                            ))}
                                        </div>
                                        {canDistributeSelection && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, width: 78, marginTop: 4 }}>
                                                <button
                                                    onClick={() => distributeSelectedElements('horizontal')}
                                                    className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                                    style={{ height: 24 }}
                                                    title="Fordel vandret"
                                                >
                                                    <AlignHorizontalSpaceBetween size={14} />
                                                </button>
                                                <button
                                                    onClick={() => distributeSelectedElements('vertical')}
                                                    className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                                    style={{ height: 24 }}
                                                    title="Fordel lodret"
                                                >
                                                    <AlignVerticalSpaceBetween size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, width: 86 }}>
                                    <button
                                        onClick={() => transformSelectedElements('rotate90')}
                                        className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                        style={{ height: 28 }}
                                        title="Roter 90 grader"
                                    >
                                        <RotateCw size={15} />
                                    </button>
                                    <button
                                        onClick={() => transformSelectedElements('flipH')}
                                        className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                        style={{ height: 28 }}
                                        title="Spejl vandret"
                                    >
                                        <FlipHorizontal2 size={15} />
                                    </button>
                                    <button
                                        onClick={() => transformSelectedElements('flipV')}
                                        className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                        style={{ height: 28 }}
                                        title="Spejl lodret"
                                    >
                                        <FlipVertical2 size={15} />
                                    </button>
                                    <button
                                        onClick={duplicateSelectedElements}
                                        className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                        style={{ height: 28 }}
                                        title="Dupliker"
                                    >
                                        <Copy size={15} />
                                    </button>
                                    <button
                                        onClick={groupSelectedElements}
                                        disabled={!canGroupSelection}
                                        className="rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center"
                                        style={{ height: 28 }}
                                        title="Gruppér valgte"
                                    >
                                        <Group size={15} />
                                    </button>
                                    <button
                                        onClick={ungroupSelectedElements}
                                        disabled={!canUngroupSelection}
                                        className="rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center"
                                        style={{ height: 28 }}
                                        title="Opløs gruppe"
                                    >
                                        <Ungroup size={15} />
                                    </button>
                                    <button
                                        onClick={() => moveSelectedLayer('front')}
                                        className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                        style={{ height: 28 }}
                                        title="Send frem"
                                    >
                                        <Layers size={15} />
                                    </button>
                                    <button
                                        onClick={() => moveSelectedLayer('back')}
                                        className="rounded-md text-slate-600 hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center"
                                        style={{ height: 28 }}
                                        title="Send bagud"
                                    >
                                        <Layers size={15} style={{ transform: 'rotate(180deg)' }} />
                                    </button>
                                </div>
                            </>
                        )}
                        <PanelRule />
                    </>
                )}

                <PanelLabel>Output</PanelLabel>
                <button
                    onClick={insertPrintTitleBlock}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                    title="Indsæt A4 titelblok"
                >
                    <FileImage size={18} />
                </button>

                <button
                    onClick={runDrawingPreflight}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                    title="Kontroller tegning"
                >
                    <AlertTriangle size={18} />
                </button>

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
                    onClick={() => setAppState(s => ({ ...s, snapEnabled: !s.snapEnabled, snapPoint: null }))}
                    className={`p-1.5 rounded-lg transition-all active:scale-95 ${appState.snapEnabled ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}
                    title={appState.snapEnabled ? 'Slå snap fra' : 'Slå snap til'}
                >
                    <Magnet size={18} />
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
            {panelTooltipElement}

            {/* 3. BOTTOM TOOLBAR (Drawing Tools) - TLDRAW CLONE */}
            <div className="drawing-bottom-panel" style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 16000,
                backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)',
                borderRadius: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.03)',
                display: 'flex', alignItems: 'center', padding: '6px', gap: '2px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                maxWidth: 'calc(100vw - 24px)',
                overflow: 'visible',
                scrollbarWidth: 'none'
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
                            setShowTemplatesMenu(false);
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
                            setShowTemplatesMenu(false);
                        }}
                        className={`p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center
                            ${DRAWING_SHAPE_TOOLS.includes(appState.tool) 
                                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        style={{ width: '36px', height: '36px' }}
                        title="Figurer"
                    >
                        <Shapes size={18} strokeWidth={DRAWING_SHAPE_TOOLS.includes(appState.tool) ? 2.5 : 2} />
                    </button>
                    {showShapesMenu && (
                        <div className="drawing-mobile-popover drawing-shapes-popover" style={{
                            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px',
                            backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(226, 232, 240, 1)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px',
                            zIndex: 17000
                        }}>
                            {[
                                { id: 'rectangle', icon: Square, title: 'Firkant' },
                                { id: 'circle', icon: Circle, title: 'Cirkel' },
                                { id: 'semicircle', icon: CircleDashed, title: 'Halvcirkel / bue' },
                                { id: 'triangle', icon: Triangle, title: 'Trekant' },
                                { id: 'polygon', icon: Hexagon, title: 'Polygon' },
                                { id: 'rhombus', icon: Diamond, title: 'Rombe' },
                                { id: 'parallelogram', icon: Square, title: 'Parallelogram' },
                                { id: 'trapezoid', icon: Square, title: 'Trapez' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setAppState(s => ({ ...s, tool: t.id, selectedElementId: null }));
                                        setShowShapesMenu(false);
                                        setShowSymbolsMenu(false);
                                        setShowTemplatesMenu(false);
                                    }}
                                    className={`p-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center
                                        ${appState.tool === t.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                                    style={{ width: '32px', height: '32px' }}
                                    title={t.title}
                                >
                                    <t.icon
                                        size={16}
                                        strokeWidth={2}
                                        style={
                                            t.id === 'parallelogram'
                                                ? { transform: 'skewX(-20deg)' }
                                                : t.id === 'semicircle'
                                                    ? { clipPath: 'inset(0 0 45% 0)' }
                                                    : t.id === 'trapezoid'
                                                        ? { transform: 'perspective(18px) rotateX(12deg)' }
                                                        : {}
                                        }
                                    />
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
                            setShowTemplatesMenu(false);
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
                        <div className="drawing-mobile-popover drawing-symbols-popover" style={{
                            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px',
                            backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(226, 232, 240, 1)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px',
                            zIndex: 17000
                        }}>
                            {CARPENTER_SYMBOLS.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setAppState(s => ({ ...s, tool: `${SYMBOL_TOOL_PREFIX}${t.id}`, selectedElementId: null, selectedElementIds: [] }));
                                        setShowSymbolsMenu(false);
                                        setShowTemplatesMenu(false);
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

                {/* Carpenter Templates Menu Toggle */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => {
                            setShowTemplatesMenu(!showTemplatesMenu);
                            setShowShapesMenu(false);
                            setShowSymbolsMenu(false);
                        }}
                        className={`p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center
                            ${appState.tool.startsWith(TEMPLATE_TOOL_PREFIX)
                                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        style={{ width: '36px', height: '36px' }}
                        title="Skabeloner"
                    >
                        <LayoutTemplate size={18} strokeWidth={appState.tool.startsWith(TEMPLATE_TOOL_PREFIX) ? 2.5 : 2} />
                    </button>
                    {showTemplatesMenu && (
                        <div className="drawing-mobile-popover drawing-templates-popover" style={{
                            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px',
                            backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(226, 232, 240, 1)', width: 244, display: 'flex', flexDirection: 'column', gap: '8px',
                            zIndex: 17000
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 4,
                                background: '#f8fafc',
                                borderRadius: 9,
                                padding: 3
                            }}>
                                {[
                                    { id: 'standard', label: 'Standard' },
                                    { id: 'custom', label: 'Egne' }
                                ].map(category => (
                                    <button
                                        key={category.id}
                                        onClick={() => setTemplateCategory(category.id)}
                                        className={`rounded-md transition-all active:scale-95 ${templateCategory === category.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                        style={{ height: 28, fontSize: 12, fontWeight: 800 }}
                                    >
                                        {category.label}
                                    </button>
                                ))}
                            </div>

                            {templateCategory === 'standard' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                                    {CARPENTER_TEMPLATES.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                setAppState(s => ({ ...s, tool: `${TEMPLATE_TOOL_PREFIX}${t.id}`, selectedElementId: null, selectedElementIds: [] }));
                                                setShowTemplatesMenu(false);
                                            }}
                                            className={`p-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center
                                                ${appState.tool === `${TEMPLATE_TOOL_PREFIX}${t.id}` ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                                            style={{ width: '32px', height: '32px' }}
                                            title={t.title}
                                        >
                                            <t.icon size={16} strokeWidth={2} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {templateCategory === 'custom' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <button
                                        onClick={saveSelectionAsTemplate}
                                        disabled={!hasSelection}
                                        className="rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:hover:bg-blue-50 transition-all active:scale-95"
                                        style={{ height: 30, fontSize: 12, fontWeight: 800 }}
                                        title="Gem valgte som skabelon"
                                    >
                                        Gem markerede
                                    </button>

                                    {customTemplates.length === 0 ? (
                                        <div style={{
                                            minHeight: 44,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#94a3b8',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            border: '1px dashed #cbd5e1',
                                            borderRadius: 9
                                        }}>
                                            Ingen egne endnu
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                                            {customTemplates.map(t => (
                                                <div
                                                    key={t.id}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '1fr 30px',
                                                        gap: 4,
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setAppState(s => ({ ...s, tool: `${TEMPLATE_TOOL_PREFIX}${CUSTOM_TEMPLATE_PREFIX}${t.id}`, selectedElementId: null, selectedElementIds: [] }));
                                                            setShowTemplatesMenu(false);
                                                        }}
                                                        className={`rounded-lg transition-all active:scale-95 text-left
                                                            ${appState.tool === `${TEMPLATE_TOOL_PREFIX}${CUSTOM_TEMPLATE_PREFIX}${t.id}` ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                                                        style={{
                                                            height: 30,
                                                            padding: '0 9px',
                                                            fontSize: 12,
                                                            fontWeight: 800,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        title={t.name}
                                                    >
                                                        {t.name}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteCustomTemplate(t.id);
                                                        }}
                                                        className="rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center"
                                                        style={{ height: 30 }}
                                                        title="Slet skabelon"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
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
                            setShowTemplatesMenu(false);
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
                
                <div className="drawing-toolbar-divider" style={{ width: 1, height: 24, backgroundColor: '#e2e8f0', margin: '0 6px' }} />

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
