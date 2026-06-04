const fs = require('fs');
const file = 'src/components/Dashboard/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<button 
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        if ('speechSynthesis' in window) {
                                                                            window.speechSynthesis.cancel();
                                                                            const utterance = new SpeechSynthesisUtterance(summaryBullets.join('. '));
                                                                            utterance.lang = 'da-DK';
                                                                            window.speechSynthesis.speak(utterance);
                                                                            toast.success('Læser op...');
                                                                        } else {
                                                                            toast.error('Oplæsning understøttes desværre ikke i din browser.');
                                                                        }
                                                                    }}
                                                                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d8b4fe', background: '#faf5ff', color: '#7e22ce', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '12px' }}
                                                                >
                                                                    🔊 Læs højt
                                                                </button>`;

const replacement = `<button 
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        if ('speechSynthesis' in window) {
                                                                            const synth = window.speechSynthesis;
                                                                            const btn = e.currentTarget;
                                                                            if (synth.speaking || synth.pending) {
                                                                                synth.cancel();
                                                                                btn.innerHTML = '🔊 Læs højt';
                                                                                btn.style.background = '#faf5ff';
                                                                                btn.style.color = '#7e22ce';
                                                                                btn.style.borderColor = '#d8b4fe';
                                                                            } else {
                                                                                synth.cancel();
                                                                                const utterance = new SpeechSynthesisUtterance(summaryBullets.join('. '));
                                                                                utterance.lang = 'da-DK';
                                                                                utterance.onend = () => {
                                                                                    btn.innerHTML = '🔊 Læs højt';
                                                                                    btn.style.background = '#faf5ff';
                                                                                    btn.style.color = '#7e22ce';
                                                                                    btn.style.borderColor = '#d8b4fe';
                                                                                };
                                                                                utterance.onerror = utterance.onend;
                                                                                synth.speak(utterance);
                                                                                btn.innerHTML = '🛑 Stop Oplæsning';
                                                                                btn.style.background = '#fef2f2';
                                                                                btn.style.color = '#ef4444';
                                                                                btn.style.borderColor = '#fecaca';
                                                                            }
                                                                        } else {
                                                                            toast.error('Oplæsning understøttes desværre ikke i din browser.');
                                                                        }
                                                                    }}
                                                                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d8b4fe', background: '#faf5ff', color: '#7e22ce', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '12px' }}
                                                                >
                                                                    🔊 Læs højt
                                                                </button>`;

if (content.includes(target)) {
    fs.writeFileSync(file, content.replace(target, replacement));
    console.log("TTS patch success");
} else {
    console.log("TTS target not found");
}
