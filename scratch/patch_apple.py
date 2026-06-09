import os
import re

file_path = "/Users/madsbrunsbjergchristensen/Documents/GitHub/frame-test/src/components/Dashboard/CalendarView.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace("import { format, parseISO, startOfWeek, addDays, getISOWeek, isSameMonth } from 'date-fns';", "import { format, parseISO, startOfWeek, addDays, getISOWeek, isSameMonth } from 'date-fns';\nimport { da } from 'date-fns/locale';")

# 2. Add states: isMobile, selectedMobileDate
state_code = """    const [view, setView] = useState('month');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [selectedMobileDate, setSelectedMobileDate] = useState(new Date());
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);"""
content = content.replace("    const [view, setView] = useState('month');", state_code)

# 3. Create renderMobileMonthView
mobile_render_code = """
    const renderMobileMonthView = () => {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', height: '100vh', overflowY: 'auto', paddingBottom: '100px' }}>
                
                {/* Mobile Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={prevPeriod} style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <ChevronLeft size={24} color="#0f172a" />
                        </button>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#0f172a', textTransform: 'capitalize' }}>
                            {format(currentDate, 'MMMM yyyy', { locale: da })}
                        </h2>
                        <button onClick={nextPeriod} style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <ChevronRight size={24} color="#0f172a" />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        {/* Søg (fiktiv knap pt.) */}
                        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}><Search size={22} color="#0f172a" /></button>
                        {/* Tilføj aftale */}
                        {isManager && (
                            <button onClick={() => openModalForDate(selectedMobileDate)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                <Plus size={24} color="#0f172a" strokeWidth={3} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Grid */}
                <div style={{ padding: '0 16px' }}>
                    {/* Ugedage */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
                        {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((day, idx) => (
                            <div key={idx} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>{day}</div>
                        ))}
                    </div>

                    {/* Dage */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                        {Array.from({ length: startingEmptyCells }).map((_, idx) => (
                            <div key={`empty-${idx}`} style={{ aspectRatio: '1' }} />
                        ))}
                        
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                            const day = idx + 1;
                            const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                            const isSelected = selectedMobileDate.getDate() === day && selectedMobileDate.getMonth() === currentDate.getMonth() && selectedMobileDate.getFullYear() === currentDate.getFullYear();
                            const { isHoliday, leads, absences, events } = getItemsForDay(checkDate);

                            let hasDot = leads.length > 0 || absences.length > 0 || events.length > 0;
                            let dotColor = '#94a3b8';
                            if (leads.length > 0) dotColor = '#10b981';
                            if (absences.length > 0) dotColor = '#f59e0b';
                            if (events.length > 0 && leads.length === 0 && absences.length === 0) dotColor = '#3b82f6';
                            if (isHoliday) dotColor = '#ef4444';

                            return (
                                <div key={day} onClick={() => setSelectedMobileDate(checkDate)} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '8px', cursor: 'pointer', position: 'relative' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? '#2563eb' : (isToday ? '#eff6ff' : 'transparent'), color: isSelected ? '#fff' : (isToday ? '#2563eb' : (isHoliday ? '#ef4444' : '#0f172a')), fontWeight: isSelected || isToday ? '800' : '600', fontSize: '1rem', transition: 'all 0.2s' }}>
                                        {day}
                                    </div>
                                    {(hasDot || isHoliday) && (
                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected ? '#bfdbfe' : dotColor, position: 'absolute', bottom: '6px' }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ height: '1px', background: '#e2e8f0', margin: '16px 0' }} />

                {/* Mobile Agenda List */}
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', textTransform: 'capitalize' }}>
                            {format(selectedMobileDate, 'EEEE d. MMM', { locale: da })}
                        </h3>
                    </div>

                    {(() => {
                        const { events, absences, leads, isHoliday } = getItemsForDay(selectedMobileDate);
                        const hasAny = events.length > 0 || absences.length > 0 || leads.length > 0 || isHoliday;
                        
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {!hasAny && (
                                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>Ingen planlagte aktiviteter</p>
                                    </div>
                                )}
                                
                                {isHoliday && (
                                    <div style={{ background: '#f1f5f9', borderLeft: '4px solid #94a3b8', padding: '12px 16px', borderRadius: '12px', fontWeight: 'bold', color: '#475569' }}>
                                        Helligdag
                                    </div>
                                )}

                                {absences.map((a, i) => (
                                    <div key={`abs-${i}`} style={{ background: a.absenceType === 'Sygdom' ? '#fef2f2' : '#fff7ed', borderLeft: `4px solid ${a.absenceType === 'Sygdom' ? '#ef4444' : '#f97316'}`, padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {a.absenceType === 'Sygdom' ? <Thermometer size={20} color="#ef4444"/> : <Palmtree size={20} color="#f97316"/>}
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.95rem' }}>{a.absenceType}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{a.employeeName}</div>
                                        </div>
                                    </div>
                                ))}

                                {events.map(e => {
                                    const style = getEventStyle(e.type);
                                    const Icon = style.icon;
                                    return (
                                        <div key={e.id} style={{ background: style.bg, borderLeft: `4px solid ${style.leftBorder}`, padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{ background: 'white', padding: '6px', borderRadius: '50%', color: style.text, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><Icon size={18}/></div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontWeight: 'bold', color: style.text, fontSize: '0.95rem' }}>{e.type}</div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>{e.startTime}</div>
                                                </div>
                                                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px', fontSize: '0.95rem' }}>{e.title}</div>
                                            </div>
                                        </div>
                                    )
                                })}

                                {leads.map(lead => {
                                    const colors = getStatusColor(lead.status);
                                    return (
                                        <div key={lead.id} onClick={() => onCaseClick(lead)} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.bg}`, padding: '12px 16px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '6px' }}>Sag: {lead.case_number || String(lead.id).substring(0,6)}</span>
                                                <span style={{ fontSize: '0.8rem', color: colors.text, fontWeight: 600 }}>{lead.status}</span>
                                            </div>
                                            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.95rem' }}>{lead.raw_data.project_title || lead.project_category}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        );
                    })()}
                </div>
            </div>
        );
    };

    // ----------------- RENDER VIEWS -----------------
"""
content = content.replace("    // ----------------- RENDER VIEWS -----------------", mobile_render_code)

# 4. Update main return
# Replace the big return logic from <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}> down to Sidebar
# We will just replace the start of the return.

# Find:
#     return (
#         <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
#             
#             {/* Venstre side: Selve kalenderen */}

new_return_start = """    return (
        <>
            {isMobile ? renderMobileMonthView() : (
                <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
                    
                    {/* Venstre side: Selve kalenderen */}"""

content = content.replace("""    return (
        <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
            
            {/* Venstre side: Selve kalenderen */}""", new_return_start)

# Now we need to close the isMobile ternary condition.
# Find where the sidebar ends:
#             )}
# 
#             {/* POPOVER TIL SAG I KALENDER */}

close_ternary = """            )}
                </div>
            )}

            {/* POPOVER TIL SAG I KALENDER */}"""

content = content.replace("""            )}

            {/* POPOVER TIL SAG I KALENDER */}""", close_ternary)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patch executed")
