// ============================================================================
// DashboardTour.jsx — kort, spring-bar velkomstrundtur efter onboarding.
// Peger på menuen + den blå "Lav et tilbud"-knap, ét stop ad gangen (spotlight).
// Genbruger Coachmark (Frame-stil) + coachmarks.js (set én gang). Kun desktop.
// Additivt: rører intet design. Mål findes via data-tour="…"-attributter.
// ============================================================================
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Coachmark from './Coachmark';
import { markCoachSeen } from './coachmarks';

const STEPS = [
    { sel: '[data-tour="overview-kpi"]', placement: 'bottom', eyebrow: 'Velkommen til Frame', title: 'Det her er dit overblik', body: 'Omsætning, aktive sager og nye forespørgsler — ét sted, opdateret live.' },
    { sel: '[data-tour="create-quote"]', placement: 'bottom', eyebrow: 'Kom i gang', title: 'Lav et tilbud her', body: 'Når du vil sende et tilbud, starter du her. Prøv det — det tager et minut.' },
    { sel: '[data-tour="nav-leads"]', placement: 'right', eyebrow: 'Menuen', title: 'Kunder & Leads', body: 'Her lander alle forespørgsler og tilbud. Klik en kunde for at åbne sagen.' },
    { sel: '[data-tour="nav-cases"]', placement: 'right', eyebrow: 'Menuen', title: 'Sager & Ordrestyring', body: 'Når et tilbud bliver til en opgave, styrer du den her — fra bekræftet til faktureret.' },
    { sel: '[data-tour="nav-calendar"]', placement: 'right', eyebrow: 'Menuen', title: 'Kalender', body: 'Planlæg dine sager og hold styr på hvem der er hvor.' },
    { sel: '[data-tour="nav-finance"]', placement: 'right', eyebrow: 'Menuen', title: 'Økonomi & Faktura', body: 'Her fakturerer du dine sager og overfører til dit regnskab — det hænger sammen med ordrestyringen.' },
    { sel: '[data-tour="nav-timesheet"]', placement: 'right', eyebrow: 'Menuen', title: 'Løn & Timer', body: 'Se, redigér og eksportér medarbejdernes timer — og kør løn direkte herfra.' },
    { sel: '[data-tour="create-quote"]', placement: 'bottom', eyebrow: 'Så er du klar', title: 'Klar til at gå i gang', body: 'Det var det — du finder selv rundt. Og "Lav et tilbud" er altid lige her.', last: true },
];

export default function DashboardTour({ onDone }) {
    const [idx, setIdx] = useState(0);
    const anchorRef = useRef(null);
    const [ready, setReady] = useState(false);

    // Rundturen erstatter den separate helte-prik — markér den som set, så vi ikke får to bobler.
    useEffect(() => { markCoachSeen('hero_quote'); }, []);

    // Find målet for det aktuelle stop. Spring stop over hvis målet ikke findes (fx skjult for rollen).
    useLayoutEffect(() => {
        let tries = 0;
        const resolve = () => {
            const el = document.querySelector(STEPS[idx].sel);
            if (el) { anchorRef.current = el; setReady(true); return; }
            // mål mangler endnu — prøv kort, ellers spring frem
            if (++tries > 8) {
                if (idx < STEPS.length - 1) setIdx(i => i + 1);
                else finish();
                return;
            }
            requestAnimationFrame(resolve);
        };
        setReady(false);
        resolve();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx]);

    const finish = () => { markCoachSeen('dashboard_tour'); onDone && onDone(); };
    const next = () => { if (idx < STEPS.length - 1) setIdx(i => i + 1); else finish(); };
    const skip = () => finish();   // per-guide: markér kun denne (overblik) som set

    if (!ready) return null;
    const s = STEPS[idx];

    return (
        <Coachmark
            key={idx}
            anchorRef={anchorRef}
            placement={s.placement}
            spotlight
            step={s.last ? null : `${idx + 1} / ${STEPS.length - 1}`}
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
