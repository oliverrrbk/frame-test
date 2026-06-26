// ============================================================================
// Coachmark.jsx — én lille "kom-i-gang"-boble der peger på et element.
// Additivt overlay i Frame-stil (Inter, hvid popup, near-black knap, blødt halo).
// Lægges OVENPÅ eksisterende UI — ændrer intet design.
//
// Brug:
//   const ref = useRef(null);
//   <button ref={ref}>…</button>
//   {show && <Coachmark anchorRef={ref} title="…" body="…"
//             primaryLabel="Vis mig" onPrimary={fn} onClose={fn} onSkip={fn} />}
//
// Vis kun på desktop (kalderen styrer det via shouldShowCoach()).
// ============================================================================
import React, { useState, useLayoutEffect, useEffect, useRef, useCallback } from 'react';
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
    halo = true,
}) {
    const bubbleRef = useRef(null);
    const [pos, setPos] = useState(null); // {top,left,arrowLeft,place}
    const [ring, setRing] = useState(null); // {top,left,w,h}

    const compute = useCallback(() => {
        const el = anchorRef?.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        const bh = bubbleRef.current?.offsetHeight || 150;

        let place = placement;
        if (place === 'bottom' && r.bottom + bh + 22 > vh) place = 'top';
        if (place === 'top' && r.top - bh - 22 < 0) place = 'bottom';

        const top = place === 'bottom' ? r.bottom + 14 : r.top - bh - 14;
        let left = r.left + r.width / 2 - 46;
        left = Math.max(12, Math.min(left, vw - BUBBLE_W - 12));
        const arrowLeft = Math.min(Math.max(r.left + r.width / 2 - left - 7, 16), BUBBLE_W - 28);

        setPos({ top, left, arrowLeft, place });
        setRing({ top: r.top - 5, left: r.left - 5, w: r.width + 10, h: r.height + 10 });
    }, [anchorRef, placement]);

    useLayoutEffect(() => {
        compute();
        const id = requestAnimationFrame(compute); // 2. pass når boblen er målt
        return () => cancelAnimationFrame(id);
    }, [compute, title, body, step]);

    useEffect(() => {
        const h = () => compute();
        window.addEventListener('resize', h);
        window.addEventListener('scroll', h, true);
        return () => { window.removeEventListener('resize', h); window.removeEventListener('scroll', h, true); };
    }, [compute]);

    const dismiss = () => { onClose && onClose(); };
    const handlePrimary = () => { onPrimary ? onPrimary() : dismiss(); };

    const arrowStyle = {
        position: 'absolute', width: 14, height: 14, background: '#fff',
        left: pos?.arrowLeft ?? 34, transform: 'rotate(45deg)',
        ...(pos?.place === 'top'
            ? { bottom: -8, borderRight: '1px solid rgba(0,0,0,.07)', borderBottom: '1px solid rgba(0,0,0,.07)' }
            : { top: -8, borderLeft: '1px solid rgba(0,0,0,.07)', borderTop: '1px solid rgba(0,0,0,.07)' }),
    };

    return createPortal(
        <>
            {halo && ring && (
                <div style={{
                    position: 'fixed', top: ring.top, left: ring.left, width: ring.w, height: ring.h,
                    borderRadius: 16, pointerEvents: 'none', zIndex: 100049,
                    boxShadow: '0 0 0 6px rgba(255,255,255,0.92), 0 10px 34px rgba(0,0,0,0.22)',
                    transition: 'all .2s ease',
                }} />
            )}
            <div
                ref={bubbleRef}
                role="dialog"
                style={{
                    position: 'fixed',
                    top: pos?.top ?? -9999, left: pos?.left ?? -9999,
                    width: BUBBLE_W, maxWidth: 'calc(100vw - 24px)',
                    background: '#fff', border: '1px solid rgba(0,0,0,.07)', borderRadius: 20,
                    padding: '18px 18px 15px', zIndex: 100050,
                    boxShadow: '0 24px 64px rgba(0,0,0,.16)',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                    opacity: pos ? 1 : 0, transition: 'opacity .2s ease, top .18s ease, left .18s ease',
                }}
            >
                <span style={arrowStyle} />
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
                        }}>Spring guiden over</button>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}
