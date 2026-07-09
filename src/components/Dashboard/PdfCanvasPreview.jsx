import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { FileText, Maximize2 } from 'lucide-react';

// Selv-hostet worker (CSP: worker-src 'self' blob:). Sat én gang.
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * PDF-preview der renderer til <canvas> med PDF.js i stedet for en <iframe> med
 * browserens indbyggede PDF-viewer. Safari viser meget upålideligt blob:-PDF'er
 * i en iframe (ofte helt hvidt) — canvas-rendering ser ens ud i ALLE browsere
 * (Safari, Chrome, in-app-browsere/WebViews).
 *
 * Tilbuds-PDF'en er altid én (høj) side, så vi renderer kun side 1.
 * Gammel side beholdes synlig indtil den nye er tegnet → ingen hvid flash.
 */
export default function PdfCanvasPreview({ blob, openUrl, dark = false }) {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);
    const blobRef = useRef(null);
    const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

    useEffect(() => {
        blobRef.current = blob;
        if (!blob) { setStatus('loading'); return; }
        let cancelled = false;
        let renderTask = null;
        let debounce = null;

        const render = async () => {
            const blobNow = blobRef.current;
            const wrap = wrapRef.current;
            const canvas = canvasRef.current;
            if (!blobNow || !wrap || !canvas) return;
            const cssWidth = Math.floor(wrap.clientWidth);
            if (cssWidth <= 0) return;
            try {
                const buf = await blobNow.arrayBuffer();
                if (cancelled || blobRef.current !== blobNow) return;
                const doc = await pdfjs.getDocument({ data: buf }).promise;
                if (cancelled || blobRef.current !== blobNow) { doc.destroy(); return; }
                const page = await doc.getPage(1);
                const base = page.getViewport({ scale: 1 });
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const scale = (cssWidth / base.width) * dpr;
                const viewport = page.getViewport({ scale });

                // Tegn offscreen og kopiér over i ét hug, så den synlige canvas aldrig blinker hvid.
                const off = document.createElement('canvas');
                off.width = Math.floor(viewport.width);
                off.height = Math.floor(viewport.height);
                renderTask = page.render({ canvasContext: off.getContext('2d'), viewport });
                await renderTask.promise;
                if (cancelled || blobRef.current !== blobNow) { doc.destroy(); return; }

                canvas.width = off.width;
                canvas.height = off.height;
                canvas.style.width = '100%';
                canvas.style.height = 'auto';
                canvas.getContext('2d').drawImage(off, 0, 0);
                doc.destroy();
                setStatus('ready');
            } catch (e) {
                if (e?.name === 'RenderingCancelledException') return;
                if (!cancelled) setStatus('error');
            }
        };

        render();

        // Gen-render responsivt når rammen ændrer bredde (fx "Forstør PDF").
        const ro = new ResizeObserver(() => {
            clearTimeout(debounce);
            debounce = setTimeout(render, 150);
        });
        if (wrapRef.current) ro.observe(wrapRef.current);

        return () => {
            cancelled = true;
            try { renderTask?.cancel?.(); } catch { /* noop */ }
            ro.disconnect();
            clearTimeout(debounce);
        };
    }, [blob]);

    const muted = dark ? '#94a3b8' : '#94a3b8';

    return (
        <div ref={wrapRef} style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', borderRadius: '14px', background: '#fff', border: '1px solid #e2e8f0' }}>
            {/* Canvas'en fylder bredden; højden følger PDF-siden så man kan scrolle. */}
            <canvas ref={canvasRef} style={{ display: status === 'ready' ? 'block' : 'none', width: '100%', height: 'auto' }} />

            {status === 'loading' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, gap: '9px' }}>
                    <span className="qqb-spin" style={{ width: '15px', height: '15px', border: '2px solid rgba(148,163,184,0.35)', borderTopColor: '#64748b', borderRadius: '50%', display: 'inline-block' }} />
                    Genererer…
                </div>
            )}

            {status === 'error' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', textAlign: 'center', padding: '24px', background: '#f1f5f9' }}>
                    <FileText size={34} color="#94a3b8" />
                    <div style={{ color: '#475569', fontSize: '0.9rem', maxWidth: '300px', lineHeight: 1.5 }}>
                        Kunne ikke vise PDF'en her. Tilbuddet er dannet og klar — åbn det i en ny fane.
                    </div>
                    {openUrl && (
                        <a href={openUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '999px', background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
                            <Maximize2 size={15} /> Åbn PDF i ny fane
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
