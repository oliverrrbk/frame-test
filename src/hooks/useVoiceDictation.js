// Genbrugelig stemme-diktering: optager mikrofon og sender til /api/process-voice
// (mode 'transcribe'), og leverer den transskriberede tekst via onTranscript.
//
// Samme flow som CustomProjectCreator's toggleRecording, men pakket ind så det
// kan genbruges (fx i log-modalen "Skriv status fra pladsen").
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

// options:
//   mode: 'transcribe' (standard) → onResult kaldes med den rene tekst (string).
//         'aftaleseddel'          → onResult kaldes med hele det strukturerede
//                                   svar-objekt ({ title, description, priceType, amount }).
//   processingMessage / successMessage: valgfrie toast-tekster.
export function useVoiceDictation(onResult, options = {}) {
    const { mode = 'transcribe', processingMessage, successMessage } = options;
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const toggle = async () => {
        // Stop optagelse → transskribér
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            setIsProcessing(true);
            toast(processingMessage || 'Skriver det ned...', { icon: '⚙️' });
            return;
        }

        // Start optagelse
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop()); // frigiv mikrofonen
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('audio', audioBlob, 'voice.webm');
                formData.append('mode', mode);

                try {
                    const response = await fetch('/api/process-voice', { method: 'POST', body: formData });
                    if (!response.ok) throw new Error('Netværksfejl ved transskribering');
                    const result = await response.json();
                    if (result.error) throw new Error(result.error);
                    if (typeof onResult === 'function') {
                        if (mode === 'transcribe') {
                            if (result.transcription) onResult(result.transcription);
                        } else {
                            onResult(result);
                        }
                    }
                    toast.success(successMessage || 'Tale indsat!');
                } catch (error) {
                    console.error('Voice dictation error:', error);
                    toast.error('Kunne ikke behandle tale: ' + error.message);
                } finally {
                    setIsProcessing(false);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            toast('Optager... (snak nu)', { icon: '🎙️' });
        } catch (err) {
            console.error('Mikrofon fejl:', err);
            toast.error('Kunne ikke få adgang til mikrofonen. Tjek tilladelser.');
        }
    };

    return { isRecording, isProcessing, toggle };
}
