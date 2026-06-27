// ============================================================================
// Coachmark.jsx — én lille "kom-i-gang"-boble der peger på et element.
// Additivt overlay i Frame-stil (Inter, hvid popup, near-black knap).
// Lægges OVENPÅ eksisterende UI — ændrer intet design.
//
// Positionen synkroniseres KONTINUERLIGT (requestAnimationFrame, direkte DOM)
// til ankerets aktuelle position, så boblen altid sidder limet til målet —
// også under page-transitions, scroll og indre scroll-containere. Ingen lag.
//
// placement: 'bottom' | 'top' | 'right'
// spotlight:  dæmp resten af skærmen og lys målet op (til rundtur). Blokerer
//             baggrundsklik via et gennemsigtigt lag, så man kun bruger boblen.
// ============================================================================
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const BUBBLE_W = 300;

export default function Coachmark({
    anchorRef,
    placement = 'bottom',
    eyebrow,
    step,
    title,
    body,
    primaryLabel = 'Forstået',
    onPrimary,
    secondaryLabel,
    onSecondary,
    onSkip,
    onClose,
    spotlight = false,
    zBase = 100040,   // hæves når touren kører oven på en modal (fx Hurtigt tilbud = z 100050+)
}) {
    const bubbleRef = useRef(null);
    const arrowRef = useRef(null);
    const holeRef = useRef(null);

    useEffect(() => {
        let raf;
        const sync = () => {
            const el = anchorRef?.current;
            const bubble = bubbleRef.current;
            if (el && bubble) {
                const r = el.getBoundingClientRect();
                const vw = window.innerWidth, vh = window.innerHeight;
                const bh = bubble.offsetHeight || 150;

                // Spotlight-hul følger målet
                if (holeRef.current) {
                    const h = holeRef.current;
                    h.style.top = `${Math.round(r.top - 6)}px`;
                    h.style.left = `${Math.round(r.left - 6)}px`;
                    h.style.width = `${Math.round(r.width + 12)}px`;
                    h.style.height = `${Math.round(r.height + 12)}px`;
                }

                let place = placement;
                if (place === 'bottom' && r.bottom + bh + 22 > vh) place = 'top';
                if (place === 'top' && r.top - bh - 22 < 0) place = 'bottom';
                if (place === 'right' && r.right + BUBBLE_W + 26 > vw) place = 'bottom';

                let top, left, arrowCss;
                if (place === 'right') {
                    top = Math.max(12, Math.min(r.top + r.height / 2 - bh / 2, vh - bh - 12));
                    left = r.right + 16;
                    const aTop = Math.min(Math.max(r.top + r.height / 2 - top - 7, 14), bh - 28);
                    arrowCss = `position:absolute;width:14px;height:14px;background:#fff;transform:rotate(45deg);left:-7px;top:${aTop}px;border-left:1px solid rgba(0,0,0,.07);border-bottom:1px solid rgba(0,0,0,.07)`;
                } else {
                    top = place === 'bottom' ? r.bottom + 14 : r.top - bh - 14;
                    left = Math.max(12, Math.min(r.left + r.width / 2 - 46, vw - BUBBLE_W - 12));
                    const aLeft = Math.min(Math.max(r.left + r.width / 2 - left - 7, 16), BUBBLE_W - 28);
                    if (place === 'top') {
                        arrowCss = `position:absolute;width:14px;height:14px;background:#fff;transform:rotate(45deg);left:${aLeft}px;bottom:-8px;border-right:1px solid rgba(0,0,0,.07);border-bottom:1px solid rgba(0,0,0,.07)`;
                    } else {
                        arrowCss = `position:absolute;width:14px;height:14px;background:#fff;transform:rotate(45deg);left:${aLeft}px;top:-8px;border-left:1px solid rgba(0,0,0,.07);border-top:1px solid rgba(0,0,0,.07)`;
                    }
                }
                bubble.style.top = `${Math.round(top)}px`;
                bubble.style.left = `${Math.round(left)}px`;
                bubble.style.opacity = '1';
                if (arrowRef.current) arrowRef.current.style.cssText = arrowCss;
            }
            raf = requestAnimationFrame(sync);
        };
        raf = requestAnimationFrame(sync);
        return () => cancelAnimationFrame(raf);
    }, [anchorRef, placement]);

    const dismiss = () => { onClose && onClose(); };
    const handlePrimary = () => { onPrimary ? onPrimary() : dismiss(); };

    return createPortal(
        <>
            {spotlight && (
                <>
                    {/* Gennemsigtigt lag der blokerer baggrundsklik under rundturen */}
                    <div style={{ position: 'fixed', inset: 0, zIndex: zBase - 1 }} />
                    {/* Spotlight-hul: dæmper alt udenom målet */}
                    <div ref={holeRef} style={{ position: 'fixed', top: -9999, left: -9999, borderRadius: 14, zIndex: zBase, pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(15,23,42,0.6), 0 0 0 2px rgba(255,255,255,0.95), 0 0 26px 6px rgba(59,130,246,0.55)', transition: 'all .18s ease' }} />
                </>
            )}
            <div
                ref={bubbleRef}
                role="dialog"
                style={{
                    position: 'fixed', top: -9999, left: -9999, opacity: 0,
                    width: BUBBLE_W, maxWidth: 'calc(100vw - 24px)',
                    background: '#fff', border: '1px solid rgba(0,0,0,.07)', borderRadius: 20,
                    padding: '18px 18px 15px', zIndex: zBase + 10,
                    boxShadow: '0 24px 64px rgba(0,0,0,.18)',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                    transition: 'opacity .2s ease',
                }}
            >
                <span ref={arrowRef} style={{ position: 'absolute', width: 14, height: 14, background: '#fff', top: -8, left: 34, transform: 'rotate(45deg)', borderLeft: '1px solid rgba(0,0,0,.07)', borderTop: '1px solid rgba(0,0,0,.07)' }} />
                {step && <div style={{ fontSize: 11, color: '#8a8a8a', fontWeight: 700, marginBottom: 6 }}>{step}</div>}
                {eyebrow && <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: '#007aff', marginBottom: 7 }}>{eyebrow}</div>}
                {title && <h3 style={{ margin: '0 0 5px', fontSize: 16, fontWeight: 700, letterSpacing: '-.02em', color: '#1a1a1a' }}>{title}</h3>}
                {body && <p style={{ margin: 0, fontSize: 13.5, color: '#5e5e5e', lineHeight: 1.55 }}>{body}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 15 }}>
                    <button onClick={handlePrimary} style={{
                        background: '#111', color: '#fff', border: 'none', borderRadius: 12,
                        padding: '9px 16px', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                        fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(0,0,0,.15)',
                    }}>{primaryLabel}</button>
                    {secondaryLabel && (
                        <button onClick={() => (onSecondary ? onSecondary() : dismiss())} style={{
                            background: 'none', border: 'none', color: '#8a8a8a', fontSize: 13.5,
                            fontWeight: 600, cursor: 'pointer', padding: '6px 8px', fontFamily: 'inherit',
                        }}>{secondaryLabel}</button>
                    )}
                    {onSkip && (
                        <button onClick={onSkip} style={{
                            marginLeft: 'auto', background: 'none', border: 'none', color: '#8a8a8a',
                            fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline',
                            textUnderlineOffset: 2, fontFamily: 'inherit',
                        }}>Spring denne guide over</button>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}
