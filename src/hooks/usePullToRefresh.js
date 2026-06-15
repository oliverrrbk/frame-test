import { useState, useEffect, useCallback } from 'react';

export function usePullToRefresh(onRefresh) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullProgress, setPullProgress] = useState(0);

    const handleTouchStart = useCallback((e) => {
        if (window.scrollY > 5) return; // Kun tillad pull hvis vi er i toppen
        const touch = e.touches[0];
        window.pullStartY = touch.clientY;
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (window.scrollY > 5 || !window.pullStartY) return;
        
        const touch = e.touches[0];
        const pullDistance = touch.clientY - window.pullStartY;
        
        if (pullDistance > 0) {
            // max progress er 100px ned
            const progress = Math.min(pullDistance / 100, 1);
            setPullProgress(progress);
        }
    }, []);

    const handleTouchEnd = useCallback(async () => {
        if (pullProgress > 0.8 && !isRefreshing) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullProgress(0);
            }
        } else {
            setPullProgress(0);
        }
        window.pullStartY = null;
    }, [pullProgress, isRefreshing, onRefresh]);

    useEffect(() => {
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);
        
        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return { isRefreshing, pullProgress };
}
