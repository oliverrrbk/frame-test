/**
 * Letvægts klientside Text-to-Speech (TTS) hjælper til browserens indbyggede SpeechSynthesis.
 * Håndterer dansk sprog, stemmevalg og forhindrer at flere stemmer taler i munden på hinanden.
 */

let currentUtterance = null;
let activeOnEndCallback = null;

/**
 * Stopper enhver igangværende oplæsning og rydder op.
 */
export const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (activeOnEndCallback) {
        activeOnEndCallback();
        activeOnEndCallback = null;
    }
    currentUtterance = null;
};

/**
 * Læser en tekst højt på dansk ved hjælp af browserens bedste tilgængelige stemme.
 * 
 * @param {string} text - Teksten der skal læses højt
 * @param {Function} onStart - Callback når oplæsningen starter
 * @param {Function} onEnd - Callback når oplæsningen slutter eller afbrydes
 */
export const speakText = (text, onStart = null, onEnd = null) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn("Speech Synthesis understøttes ikke i denne browser.");
        if (onEnd) onEnd();
        return;
    }

    // Stop eksisterende tale før vi starter en ny
    stopSpeaking();

    // Rens teksten for eventuelle HTML-tags eller overflødige specialtegn
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "").trim();
    if (!cleanText) {
        if (onEnd) onEnd();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'da-DK';
    
    // Find den bedste danske stemme
    const voices = window.speechSynthesis.getVoices();
    const danishVoice = voices.find(voice => voice.lang.includes('da') || voice.lang.includes('DA'));
    if (danishVoice) {
        utterance.voice = danishVoice;
    }
    
    // Tilpas hastighed (rate) og pitch for at få en mere naturlig og behagelig oplæsning (0.95 er lidt mere tålmodig og let-forståelig)
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    activeOnEndCallback = onEnd;
    currentUtterance = utterance;

    utterance.onstart = () => {
        if (onStart) onStart();
    };

    utterance.onend = () => {
        if (activeOnEndCallback === onEnd) {
            activeOnEndCallback = null;
        }
        if (onEnd) onEnd();
        currentUtterance = null;
    };

    utterance.onerror = (event) => {
        // Ignorer cancel/interrupted fejl pga bevidst stop
        if (event.error !== 'interrupted') {
            console.error("Speech Synthesis fejl:", event);
        }
        if (activeOnEndCallback === onEnd) {
            activeOnEndCallback = null;
        }
        if (onEnd) onEnd();
        currentUtterance = null;
    };

    window.speechSynthesis.speak(utterance);

    // Chrome bug-fix: Nogle gange stopper speechSynthesis uventet efter 15 sekunder på lange tekster.
    // Vi kalder periodisk resume for at holde motoren i live, hvis der afspilles.
    const keepAliveInterval = setInterval(() => {
        if (currentUtterance === utterance && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
        } else {
            clearInterval(keepAliveInterval);
        }
    }, 10000);
};

/**
 * Returnerer sand, hvis browseren i øjeblikket læser noget højt.
 */
export const isSpeaking = () => {
    return typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking;
};

// macOS / Chrome indlæser stemmer asynkront. 
// Vi kalder getVoices tidligt for at trigger indlæsning i baggrunden, så de er klar ved første klik.
if (typeof window !== 'undefined' && window.speechSynthesis) {
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
    window.speechSynthesis.getVoices();
}
