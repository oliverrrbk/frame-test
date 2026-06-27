// ============================================================================
// SectionTour.jsx — genbrugelig, spring-bar flertrins-rundtur.
// Peger på elementer via CSS-selektor (data-tour="…"), ét stop ad gangen med
// spotlight. Springer et stop over hvis målet ikke findes (fx skjult for rollen).
// Genbruger Coachmark (Frame-stil) + coachmarks.js (set én gang). Kun desktop.
// Additivt: rører intet design.
//
// Brug:  {shouldShowCoach('cases_tour') && <SectionTour tourKey="cases_tour" steps={STEPS} onDone={...} />}
//   steps: [{ sel, placement, eyebrow, title, body, last? }]
// ============================================================================
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import Coachmark from './Coachmark';
import { markCoachSeen } from './coachmarks';

export default function SectionTour({ steps = [], tourKey, onDone, onStepChange, zBase = 100040 }) {
    const [idx, setIdx] = useState(0);
    const anchorRef = useRef(null);
    const [ready, setReady] = useState(false);

    // Lad forælderen reagere på trin-skift (fx åbne/lukke en eksempel-sag),
    // så det rigtige mål er i DOM'en før vi forsøger at finde det.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { onStepChange && onStepChange(idx); }, [idx]);

    const finish = (skipped = false) => { if (tourKey) markCoachSeen(tourKey); onDone && onDone(skipped); };

    useLayoutEffect(() => {
        if (!steps.length) return;
        let tries = 0;
        let raf;
        const resolve = () => {
            const el = document.querySelector(steps[idx].sel);
            if (el) {
                anchorRef.current = el;
                // Sørg for at det fremhævede element er i syne (fx i en scrollende kolonne).
                try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch { /* ignore */ }
                setReady(true);
                return;
            }
            // Målet findes ikke (endnu) — vent på (evt. lazy-loadet) indhold før vi
            // springer stoppet over. ~150 frames ≈ 2,5s dækker lazy-chunks.
            if (++tries > 150) {
                if (idx < steps.length - 1) setIdx(i => i + 1);
                else finish();
                return;
            }
            raf = requestAnimationFrame(resolve);
        };
        setReady(false);
        resolve();
        return () => { if (raf) cancelAnimationFrame(raf); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, steps]);

    if (!ready || !steps.length) return null;
    const s = steps[idx];
    const isLast = idx === steps.length - 1;
    const total = steps.filter(x => !x.last).length;
    const next = () => { if (idx < steps.length - 1) setIdx(i => i + 1); else finish(); };
    // Per-guide: "Spring denne guide over" markerer KUN denne guide som set —
    // alle andre guides dukker stadig op på deres steder.
    const skip = () => finish(true);

    return (
        <Coachmark
            key={idx}
            anchorRef={anchorRef}
            placement={s.placement || 'bottom'}
            spotlight
            zBase={zBase}
            step={s.last ? null : `${idx + 1} / ${total}`}
            eyebrow={s.eyebrow}
            title={s.title}
            body={s.body}
            primaryLabel={isLast ? 'Kom i gang' : 'Næste'}
            onPrimary={next}
            onSkip={isLast ? null : skip}
            onClose={finish}
        />
    );
}
