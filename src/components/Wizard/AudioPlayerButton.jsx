import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square } from 'lucide-react';
import { speakText, stopSpeaking } from '../../utils/speech';

let buttonIdCounter = 0;

/**
 * Premium glassmorphic højttalerknap, der læser den tilhørende tekst højt, når der klikkes.
 * Understøtter mikro-animationer, puls-effekt og automatisk afbrydelse af andre aktive TTS knapper.
 * 
 * @param {string} text - Teksten der skal læses højt
 * @param {string} title - Overskrift eller label til tooltip / aria-label
 * @param {object} style - Ekstra styles til knappen
 */
const AudioPlayerButton = ({ text, title = "Læs op", style = {} }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const buttonIdRef = useRef(`bison-tts-${++buttonIdCounter}`);

    const handleTogglePlay = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isPlaying) {
            stopSpeaking();
            setIsPlaying(false);
        } else {
            // Udsend en global event så alle andre TTS knapper ved, de skal stoppe deres lokale visual state
            const event = new CustomEvent('bison-tts-play', { detail: { id: buttonIdRef.current } });
            window.dispatchEvent(event);

            setIsPlaying(true);
            speakText(
                text,
                () => {
                    // onStart
                    setIsPlaying(true);
                },
                () => {
                    // onEnd / onCancel
                    setIsPlaying(false);
                }
            );
        }
    };

    useEffect(() => {
        const handleGlobalPlay = (e) => {
            if (e.detail && e.detail.id !== buttonIdRef.current) {
                setIsPlaying(false);
            }
        };

        window.addEventListener('bison-tts-play', handleGlobalPlay);
        
        return () => {
            window.removeEventListener('bison-tts-play', handleGlobalPlay);
            // Hvis knappen unmountes mens den afspiller, så stop lyden
            if (isPlaying) {
                stopSpeaking();
            }
        };
    }, [isPlaying]);

    return (
        <button
            type="button"
            onClick={handleTogglePlay}
            className={`tts-button ${isPlaying ? 'speaking' : ''}`}
            style={{
                background: isPlaying ? 'var(--accent, #3b82f6)' : 'rgba(255, 255, 255, 0.8)',
                color: isPlaying ? '#ffffff' : '#64748b',
                border: '1px solid var(--border, #cbd5e1)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                boxShadow: isPlaying 
                    ? '0 0 12px rgba(59, 130, 246, 0.4)' 
                    : '0 2px 4px rgba(0,0,0,0.03)',
                padding: 0,
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
                ...style
            }}
            title={isPlaying ? "Stop oplæsning" : title}
            aria-label={isPlaying ? "Stop oplæsning" : title}
        >
            {/* Subtile baggrundsbølger når der afspilles */}
            {isPlaying && (
                <span 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.4)',
                        animation: 'tts-pulse 1.5s infinite ease-in-out',
                        pointerEvents: 'none'
                    }} 
                />
            )}
            
            {isPlaying ? (
                <Square size={14} fill="#ffffff" stroke="#ffffff" style={{ animation: 'tts-bounce 0.3s ease' }} />
            ) : (
                <Volume2 size={16} style={{ transition: 'transform 0.2s ease' }} className="tts-icon" />
            )}

            {/* Custom CSS til mikro-animationer */}
            <style>{`
                .tts-button:hover:not(.speaking) {
                    background: #f1f5f9 !important;
                    color: var(--text-primary, #0f172a) !important;
                    transform: scale(1.05);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                }
                .tts-button:hover .tts-icon {
                    transform: scale(1.1);
                }
                .tts-button:active {
                    transform: scale(0.95);
                }
                @keyframes tts-pulse {
                    0% {
                        transform: scale(0.8);
                        opacity: 0.8;
                    }
                    100% {
                        transform: scale(1.5);
                        opacity: 0;
                    }
                }
                @keyframes tts-bounce {
                    0% { transform: scale(0.7); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </button>
    );
};

export default AudioPlayerButton;
