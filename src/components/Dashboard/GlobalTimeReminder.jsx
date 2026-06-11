import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, PlusCircle } from 'lucide-react';
import { isWeekend, isSameDay, getHours, format } from 'date-fns';

export default function GlobalTimeReminder({ leadsData, profile, setActiveTab }) {
    const [showDailyReminder, setShowDailyReminder] = useState(false);

    // Saml alle tidsregistreringer (både sager og internt)
    const allEntries = useMemo(() => {
        let entries = [];
        (leadsData || []).forEach(lead => {
            const leadEntries = lead.raw_data?.time_entries || [];
            leadEntries.forEach(t => {
                if (t.employeeId === profile?.id) {
                    entries.push({ ...t, source: 'lead' });
                }
            });
        });

        const profileEntries = profile?.raw_data?.time_entries || [];
        profileEntries.forEach(t => {
            entries.push({ ...t, source: 'profile' });
        });

        return entries;
    }, [leadsData, profile]);

    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            // Tjekker kun på hverdage, efter kl. 15
            if (isWeekend(now) || getHours(now) < 15) return;

            const todayHasTime = allEntries.some(entry => isSameDay(new Date(entry.date), now) && Number(entry.hours || 0) > 0);
            
            if (!todayHasTime) {
                // Tjek om vi allerede har vist den i dag via localStorage
                const todayStr = format(now, 'yyyy-MM-dd');
                const lastShown = localStorage.getItem('bison_last_time_reminder');
                
                if (lastShown !== todayStr) {
                    setShowDailyReminder(true);
                }
            }
        };

        // Kør tjek med det samme, og derefter hvert 5. minut
        checkTime();
        const interval = setInterval(checkTime, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [allEntries]);

    const dismissDailyReminder = () => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        localStorage.setItem('bison_last_time_reminder', todayStr);
        setShowDailyReminder(false);
    };

    if (!showDailyReminder) return null;

    return createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
                <button onClick={dismissDailyReminder} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={24} />
                </button>
                
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)' }}>
                    <Clock size={40} color="#fff" />
                </div>
                
                <h2 style={{ margin: '0 0 12px 0', fontSize: '1.6rem', color: '#0f172a', fontWeight: '800' }}>
                    Det er ved at være fyraften! 🛠️
                </h2>
                <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '1.05rem', lineHeight: '1.5' }}>
                    Husk at registrere dine timer for i dag, inden du smækker døren og holder fri.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <button 
                        onClick={() => {
                            dismissDailyReminder();
                            if(setActiveTab) setActiveTab('worker_timesheet');
                        }}
                        style={{ width: '100%', padding: '16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <PlusCircle size={20} /> Registrér Timer Nu
                    </button>
                    <button 
                        onClick={() => {
                            dismissDailyReminder();
                            // If they want to log sick/vacation, they can go to the timesheet or the overview
                            if(setActiveTab) setActiveTab('overview');
                            // Actually it's best to send them to overview, where they can click the bottom-right corner to report absence
                        }}
                        style={{ width: '100%', padding: '16px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                    >
                        Meld Syg / Fravær
                    </button>
                    <button 
                        onClick={dismissDailyReminder}
                        style={{ width: '100%', padding: '12px', background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '0.95rem', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Påmind mig igen i morgen
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
