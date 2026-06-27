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
import React, { useState, useRef, useLayoutEffect } from 'react';
import Coachmark from './Coachmark';
import { markCoachSeen, skipAllCoach } from './coachmarks';

export default function SectionTour({ steps = [], tourKey, onDone, zBase = 100040 }) {
    const [idx, setIdx] = useState(0);
    const anchorRef = useRef(null);
    const [ready, setReady] = useState(false);

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
            // Målet findes ikke (endnu) — prøv kort, ellers spring stoppet over.
            if (++tries > 10) {
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
    const total = steps.filter(x => !x.last).length;
    const next = () => { if (idx < steps.length - 1) setIdx(i => i + 1); else finish(); };
    const skip = () => { skipAllCoach(); finish(true); };

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
            primaryLabel={s.last ? 'Kom i gang' : 'Næste'}
            onPrimary={next}
            onSkip={s.last ? null : skip}
            onClose={finish}
        />
    );
}
