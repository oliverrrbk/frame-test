import { useEffect } from 'react';

// Luk en menu/popover når man klikker (eller tapper) udenfor den — eller trykker Escape.
// Bruger en document-lytter, så det virker uafhængigt af z-index/stacking, og touchstart
// så det også er pålideligt i webappen på mobil.
//
// ref:     ref der omslutter BÅDE knappen der åbner og selve menuen (så klik på knappen
//          ikke straks lukker igen).
// onClose: kaldes når der klikkes udenfor / trykkes Escape.
// active:  kun aktiv når menuen er åben (typisk din open-state).
export function useClickOutside(ref, onClose, active = true) {
    useEffect(() => {
        if (!active) return;

        const handlePointer = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                onClose();
            }
        };
        const handleKey = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('touchstart', handlePointer, { passive: true });
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('touchstart', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [ref, onClose, active]);
}
