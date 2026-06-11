import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    AlertCircle, CheckCircle2, Clock, CalendarDays, 
    X, PlusCircle, Activity
} from 'lucide-react';
import { 
    isWeekend, subDays, eachDayOfInterval, 
    format, isSameDay, isToday, getHours 
} from 'date-fns';
import { da } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

export default function TimeRegistrationReminder({ leadsData, myProfile, setActiveTab }) {
    const [showMissingModal, setShowMissingModal] = useState(false);
    const [selectedMissingDate, setSelectedMissingDate] = useState(null);
    const [absenceType, setAbsenceType] = useState('Syg');
    const [absenceHours, setAbsenceHours] = useState('7.5');
    
    // Smart Notification State
    const [showDailyReminder, setShowDailyReminder] = useState(false);

    // Kun til mobil-styling (ændrer ingen logik)
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Saml alle tidsregistreringer (både sager og internt)
    const allEntries = useMemo(() => {
        let entries = [];
        (leadsData || []).forEach(lead => {
            const leadEntries = lead.raw_data?.time_entries || [];
            leadEntries.forEach(t => {
                if (t.employeeId === myProfile?.id) {
                    entries.push({ ...t, source: 'lead' });
                }
            });
        });

        const profileEntries = myProfile?.raw_data?.time_entries || [];
        profileEntries.forEach(t => {
            entries.push({ ...t, source: 'profile' });
        });

        return entries;
    }, [leadsData, myProfile]);

    // Find de seneste 5 hverdage
    const recentWorkDays = useMemo(() => {
        const today = new Date();
        const pastDays = eachDayOfInterval({
            start: subDays(today, 10), // Kig 10 dage tilbage for at være sikker på at ramme 5 hverdage
            end: today
        });
        
        // Filtrer weekender fra og tag de seneste 5
        const workDays = pastDays.filter(d => !isWeekend(d)).slice(-5);
        
        return workDays.map(date => {
            // Har medarbejderen registreret tid denne dag?
            const hasTime = allEntries.some(entry => isSameDay(new Date(entry.date), date) && Number(entry.hours || 0) > 0);
            return {
                date,
                hasTime,
                isToday: isToday(date),
                label: isToday(date) ? 'I dag' : format(date, 'EEEE', { locale: da })
            };
        });
    }, [allEntries]);

    const hasMissingPastDays = recentWorkDays.some(d => !d.hasTime && !d.isToday);

    // "Smart 15:00" Notifikation Logik
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

    const handleLogAbsence = async () => {
        if (!selectedMissingDate || !absenceHours || isNaN(absenceHours)) {
            toast.error('Udfyld venligst timer');
            return;
        }

        const newEntry = {
            id: `absence-${Date.now()}`,
            date: format(selectedMissingDate, 'yyyy-MM-dd'),
            hours: parseFloat(absenceHours),
            desc: `Internt: ${absenceType}`,
            absenceType: absenceType,
            employeeId: myProfile?.id,
            employeeName: myProfile?.owner_name || myProfile?.company_name || 'Medarbejder',
            startTime: '07:00',
            endTime: '15:00' // Placeholder
        };

        const currentProfileEntries = myProfile?.raw_data?.time_entries || [];
        const updatedEntries = [newEntry, ...currentProfileEntries];
        
        const newRawData = { ...(myProfile?.raw_data || {}), time_entries: updatedEntries };

        const { error } = await supabase
            .from('carpenters')
            .update({ raw_data: newRawData })
            .eq('id', myProfile.id);

        if (error) {
            toast.error('Kunne ikke gemme fravær');
        } else {
            toast.success(`${absenceType} er registreret!`);
            setShowMissingModal(false);
            setSelectedMissingDate(null);
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    return (
        <div style={{ marginBottom: '24px' }}>
            {/* Visuel Advarsel for Manglende Timer (Seneste 5 hverdage) */}
            <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px', borderRadius: isMobile ? '20px' : '16px', background: hasMissingPastDays ? 'linear-gradient(to right, #fff1f2, #ffffff)' : '#ffffff', border: hasMissingPastDays ? '1px solid #fecdd3' : '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '16px' }}>
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        {hasMissingPastDays ? (
                            <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '12px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AlertCircle size={24} />
                            </div>
                        ) : (
                            <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle2 size={24} />
                            </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                            <h3 style={{ margin: '0 0 4px', fontSize: isMobile ? '1.02rem' : '1.15rem', lineHeight: 1.25, color: hasMissingPastDays ? '#9f1239' : '#065f46', fontWeight: 'bold' }}>
                                {hasMissingPastDays ? (isMobile ? 'Du mangler timer' : 'Hov! Du mangler at registrere timer') : 'Timeregistrering i top!'}
                            </h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: isMobile ? '0.82rem' : '0.9rem' }}>
                                {hasMissingPastDays ? (isMobile ? 'Hold ugen grøn' : 'Sørg for at ugen er helt grøn for at holde regnskabet skarpt.') : (isMobile ? 'Ugen er grøn!' : 'Du har registreret timer for alle de seneste hverdage.')}
                            </p>
                        </div>
                    </div>
                    {hasMissingPastDays && (
                        <button
                            onClick={() => { if(setActiveTab) setActiveTab('worker_timesheet'); }}
                            style={{ padding: isMobile ? '14px 16px' : '8px 16px', width: isMobile ? '100%' : 'auto', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: isMobile ? '12px' : '8px', fontSize: isMobile ? '0.95rem' : '0.9rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(239,68,68,0.2)' }}
                        >
                            {isMobile ? <><Clock size={18} /> Registrér timer</> : 'Gå til tidsregistrering'}
                        </button>
                    )}
                </div>

                {/* Grid med hverdage */}
                <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px', overflowX: isMobile ? 'visible' : 'auto', paddingBottom: isMobile ? 0 : '4px' }}>
                    {recentWorkDays.map((day, idx) => {
                        const isRed = !day.hasTime && !day.isToday;
                        const isGreen = day.hasTime;
                        const isNeutral = !day.hasTime && day.isToday;
                        const dayLabel = (isMobile && !day.isToday) ? day.label.slice(0, 3) : day.label;

                        return (
                            <div
                                key={idx}
                                style={{
                                    flex: '1',
                                    minWidth: isMobile ? 0 : '80px',
                                    padding: isMobile ? '10px 4px' : '12px 8px',
                                    borderRadius: isMobile ? '14px' : '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: isMobile ? '6px' : '8px',
                                    background: isGreen ? '#ecfdf5' : isRed ? '#fef2f2' : '#f8fafc',
                                    border: `1px solid ${isGreen ? '#a7f3d0' : isRed ? '#fecaca' : '#e2e8f0'}`,
                                    cursor: isRed ? 'pointer' : 'default',
                                    transition: 'transform 0.2s'
                                }}
                                onClick={() => {
                                    if (isRed) {
                                        setSelectedMissingDate(day.date);
                                        setShowMissingModal(true);
                                    }
                                }}
                                onMouseEnter={(e) => { if (isRed) e.currentTarget.style.transform = 'scale(1.05)' }}
                                onMouseLeave={(e) => { if (isRed) e.currentTarget.style.transform = 'scale(1)' }}
                                title={isRed ? "Klik for at melde fravær" : ""}
                            >
                                <span style={{ fontSize: isMobile ? '0.65rem' : '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: isMobile ? '0.02em' : 'normal', color: isGreen ? '#059669' : isRed ? '#dc2626' : '#64748b' }}>
                                    {dayLabel}
                                </span>
                                {isGreen ? (
                                    <CheckCircle2 size={isMobile ? 20 : 24} color="#10b981" />
                                ) : isRed ? (
                                    <AlertCircle size={isMobile ? 20 : 24} color="#ef4444" />
                                ) : (
                                    <Clock size={isMobile ? 20 : 24} color="#94a3b8" />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Smart 15:00 Daily Reminder Pop-up */}
            {showDailyReminder && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
                        <button onClick={dismissDailyReminder} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                            <X size={24} />
                        </button>
                        
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)' }}>
                            <Clock size={40} color="#fff" />
                        </div>
                        
                        <h2 style={{ margin: '0 0 12px 0', fontSize: '1.6rem', color: '#0f172a', fontWeight: '800' }}>
                            Det er ved at være fyraften!
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
                                    setSelectedMissingDate(new Date());
                                    setShowDailyReminder(false);
                                    setShowMissingModal(true);
                                }}
                                style={{ width: '100%', padding: '16px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                            >
                                Meld Syg / Ferie
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
            )}

            {/* Modal til at melde fravær på en specifik dag */}
            {showMissingModal && selectedMissingDate && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', color: '#0f172a', fontWeight: '800' }}>Registrér Fravær</h3>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>For {format(selectedMissingDate, 'EEEE d. MMMM', { locale: da })}</p>
                            </div>
                            <button onClick={() => setShowMissingModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', fontWeight: '600', marginBottom: '8px' }}>Årsag</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['Syg', 'Ferie', 'Afspadsering'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setAbsenceType(type)}
                                        style={{ flex: 1, padding: '10px 0', border: '1px solid #e2e8f0', background: absenceType === type ? '#f1f5f9' : '#fff', color: absenceType === type ? '#0f172a' : '#64748b', borderRadius: '8px', fontWeight: absenceType === type ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', fontWeight: '600', marginBottom: '8px' }}>Antal Timer</label>
                            <input 
                                type="number" 
                                step="0.25"
                                value={absenceHours} 
                                onChange={e => setAbsenceHours(e.target.value)} 
                                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '1rem', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button 
                                onClick={() => setShowMissingModal(false)}
                                style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Annuller
                            </button>
                            <button 
                                onClick={handleLogAbsence}
                                style={{ flex: 1, padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Gem Fravær
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
