import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Home, Briefcase, Clock, Menu, X, Sparkles, MapPin, ChevronRight,
    Plus, CheckCircle2, ListChecks, FileText, Hammer, Rocket, Building2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { fetchMyMemberships, getMemberRoleLabel, logGuestTimeEntry } from '../../utils/projectMembers';
import { subscribeToPush, isPushSupported } from '../../utils/pushSubscription';

// Gæste-appen: en bevidst MINIMAL, mobil-først visning for underentreprenører.
// Han ser KUN de sager han er koblet på, kan læse projektet og føre SINE egne timer.
// Ingen oprettelse, ingen økonomi, ingen intern chat (maskeres allerede server-side).

const GLASS = {
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.6)',
    boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
};

const toHHMM = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Timer mellem to "HH:MM"-strenge (samme dag). Negativ/ugyldig → 0.
function hoursBetween(start, end) {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if ([sh, sm, eh, em].some(isNaN)) return 0;
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins = 0;
    return Math.round((mins / 60) * 100) / 100;
}

const leadTitle = (l) => l?.raw_data?.project_title || l?.project_category || 'Projekt';
const leadAddress = (l) => l?.customer_address || l?.raw_data?.customerDetails?.address || '';
const leadNo = (l) => l?.case_number || String(l?.id || '').substring(0, 6);

export default function GuestDashboard({ myProfile }) {
    const [view, setView] = useState('home');          // 'home' | 'cases' | 'time'
    const [leads, setLeads] = useState([]);
    const [memberships, setMemberships] = useState({}); // lead_id -> medlemskab
    const [loading, setLoading] = useState(true);

    const [selectedCase, setSelectedCase] = useState(null);
    const [showNudge, setShowNudge] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showTimeForm, setShowTimeForm] = useState(false);
    const [pushState, setPushState] = useState('unknown');   // 'unknown' | 'prompt' | 'on' | 'unsupported'

    // Det første en gæst møder: tilbud om at slå notifikationer til (giver bedst mening).
    useEffect(() => {
        if (!isPushSupported()) { setPushState('unsupported'); return; }
        setPushState(Notification.permission === 'granted' ? 'on' : 'prompt');
    }, []);

    const enablePush = async () => {
        const { ok } = await subscribeToPush();
        if (ok) { setPushState('on'); toast.success('Notifikationer slået til!'); }
        else toast('Du kan slå dem til senere i indstillinger.', { icon: '🔔' });
    };

    const reload = async () => {
        try {
            // get_visible_leads() maskerer økonomi + intern chat for gæster, og RLS
            // begrænser rækkerne til netop de sager gæsten er aktivt koblet på.
            const [{ data: visible }, mem] = await Promise.all([
                supabase.rpc('get_visible_leads'),
                fetchMyMemberships(myProfile?.id),
            ]);
            setLeads(Array.isArray(visible) ? visible : []);
            setMemberships(mem || {});
        } catch (e) {
            console.error('Kunne ikke hente gæste-data:', e);
            toast.error('Kunne ikke hente dine sager.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { reload(); /* eslint-disable-next-line */ }, [myProfile?.id]);

    // Mine egne timer på tværs af sagerne.
    const myEntries = useMemo(() => {
        const out = [];
        leads.forEach(l => {
            (l.raw_data?.time_entries || []).forEach(t => {
                if (t.employeeId === myProfile?.id) out.push({ ...t, leadId: l.id, leadName: leadTitle(l) });
            });
        });
        return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    }, [leads, myProfile]);

    const hoursThisWeek = useMemo(() => {
        const now = new Date();
        const monday = new Date(now);
        const day = (now.getDay() + 6) % 7; // mandag = 0
        monday.setDate(now.getDate() - day);
        monday.setHours(0, 0, 0, 0);
        return myEntries
            .filter(e => new Date(e.date) >= monday)
            .reduce((s, e) => s + Number(e.hours || 0), 0);
    }, [myEntries]);

    const firstName = myProfile?.owner_name?.split(' ')[0] || myProfile?.company_name || 'Der';

    // ---------- DELKOMPONENTER ----------

    const NudgeCard = ({ compact }) => (
        <div
            onClick={() => setShowNudge(true)}
            style={{
                cursor: 'pointer', borderRadius: '24px', padding: compact ? '18px 20px' : '24px',
                background: 'linear-gradient(135deg, #2563eb, #1e3a8a)', color: '#fff',
                boxShadow: '0 20px 40px -10px rgba(37,99,235,0.45)', position: 'relative', overflow: 'hidden',
            }}
        >
            <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.18 }}>
                <Rocket size={120} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.9 }}>
                <Sparkles size={15} /> Gratis i 30 dage
            </div>
            <h3 style={{ margin: '8px 0 4px', fontSize: compact ? '1.15rem' : '1.35rem', fontWeight: 900, lineHeight: 1.2 }}>
                Få din egen Bison Frame
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.92, maxWidth: '320px' }}>
                Træt af Excel? Send tilbud, byg priser, tegn og styr dine egne sager.
            </p>
            <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.18)', padding: '8px 14px', borderRadius: '999px', fontWeight: 700, fontSize: '0.9rem' }}>
                Se hvad du får <ChevronRight size={16} />
            </div>
        </div>
    );

    const CaseCard = ({ lead }) => {
        const m = memberships[String(lead.id)];
        const addr = leadAddress(lead);
        return (
            <div style={{ ...GLASS, background: '#fff', borderRadius: '22px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>SAG #{leadNo(lead)}</span>
                        <h3 style={{ margin: '3px 0 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>{leadTitle(lead)}</h3>
                    </div>
                    {m && (
                        <span style={{ padding: '5px 11px', background: '#eff6ff', color: '#2563eb', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            {getMemberRoleLabel(m.role)}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', color: '#475569', fontSize: '0.92rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Briefcase size={15} color="#94a3b8" />{lead.customer_name || 'Ukendt kunde'}</div>
                    {addr && <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><MapPin size={15} color="#94a3b8" />{addr}</div>}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    {addr && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, textAlign: 'center', padding: '11px', background: '#f1f5f9', color: '#2563eb', borderRadius: '14px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
                            Vis vej
                        </a>
                    )}
                    <button onClick={() => setSelectedCase(lead)}
                        style={{ flex: 1, padding: '11px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                        Åbn sag
                    </button>
                </div>
            </div>
        );
    };

    // ---------- VIEWS ----------

    const HomeView = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, color: '#0f172a' }}>Hej {firstName}!</h1>
                <p style={{ margin: '4px 0 0', color: '#64748b' }}>Dine sager og timer ét sted.</p>
            </div>

            {pushState === 'prompt' && (
                <div style={{ borderRadius: '20px', padding: '18px 20px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 16px 34px -12px rgba(15,23,42,0.5)' }}>
                    <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '14px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🔔</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>Slå notifikationer til</div>
                        <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>Få besked når du tilføjes på en sag eller mangler at registrere timer.</div>
                    </div>
                    <button onClick={enablePush} style={{ flexShrink: 0, padding: '10px 16px', borderRadius: '12px', border: 'none', background: '#fff', color: '#0f172a', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}>Slå til</button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ ...GLASS, borderRadius: '20px', padding: '18px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Dine sager</span>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{leads.length}</div>
                </div>
                <div style={{ ...GLASS, borderRadius: '20px', padding: '18px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Timer i uge</span>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{hoursThisWeek.toFixed(1)}<span style={{ fontSize: '1rem', color: '#94a3b8' }}> t</span></div>
                </div>
            </div>

            <NudgeCard />

            {leads.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 2px 10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Seneste sager</h3>
                        <button onClick={() => setView('cases')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>Se alle</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {leads.slice(0, 2).map(l => <CaseCard key={l.id} lead={l} />)}
                    </div>
                </div>
            )}
        </div>
    );

    const CasesView = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Mine sager</h1>
            {leads.length === 0 ? (
                <EmptyState icon={<Briefcase size={30} color="#cbd5e1" />} title="Ingen sager endnu" text="Når en mester kobler dig på en sag, dukker den op her." />
            ) : leads.map(l => <CaseCard key={l.id} lead={l} />)}
        </div>
    );

    const TimeView = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Mine timer</h1>
                <button onClick={() => setShowTimeForm(true)} disabled={leads.length === 0}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: leads.length === 0 ? '#cbd5e1' : '#0f172a', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 700, cursor: leads.length === 0 ? 'not-allowed' : 'pointer' }}>
                    <Plus size={17} /> Ny
                </button>
            </div>
            {myEntries.length === 0 ? (
                <EmptyState icon={<Clock size={30} color="#cbd5e1" />} title="Ingen timer registreret" text="Tryk på “Ny” for at indberette dine timer på en sag." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {myEntries.map((e, i) => (
                        <div key={e.id || i} style={{ ...GLASS, background: '#fff', borderRadius: '16px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.leadName}</div>
                                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                    {e.date}{e.startTime && e.endTime ? ` · ${e.startTime}–${e.endTime}` : ''}{e.desc ? ` · ${e.desc}` : ''}
                                </div>
                            </div>
                            <div style={{ fontWeight: 900, color: '#2563eb', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>{Number(e.hours || 0).toFixed(1)} t</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ---------- RENDER ----------

    if (loading) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)' }}>
                <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%' }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', display: 'flex', flexDirection: 'column' }}>
            {/* Top bar */}
            <div style={{ position: 'sticky', top: 0, zIndex: 50, padding: 'max(14px, env(safe-area-inset-top)) 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...GLASS, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/logo.png" alt="Bison Frame" style={{ height: 26, width: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    <span style={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Bison Frame</span>
                </div>
                <button onClick={() => setShowMenu(true)} style={{ width: 42, height: 42, borderRadius: '14px', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Menu size={20} color="#0f172a" />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '20px 18px calc(96px + env(safe-area-inset-bottom)) 18px', maxWidth: 640, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                {view === 'home' && HomeView}
                {view === 'cases' && CasesView}
                {view === 'time' && TimeView}
            </div>

            {/* Bottom nav */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, padding: '10px 18px calc(10px + env(safe-area-inset-bottom)) 18px', display: 'flex', justifyContent: 'space-around', ...GLASS, borderRadius: 0, borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}>
                {[
                    { id: 'home', label: 'Oversigt', icon: Home },
                    { id: 'cases', label: 'Sager', icon: Briefcase },
                    { id: 'time', label: 'Timer', icon: Clock },
                ].map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setView(id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '4px 14px', color: view === id ? '#2563eb' : '#94a3b8', fontWeight: 700 }}>
                        <Icon size={22} />
                        <span style={{ fontSize: '0.72rem' }}>{label}</span>
                    </button>
                ))}
            </div>

            {selectedCase && <CaseDetailModal lead={selectedCase} membership={memberships[String(selectedCase.id)]} onClose={() => setSelectedCase(null)} />}
            {showTimeForm && <TimeFormModal leads={leads} profile={myProfile} onClose={() => setShowTimeForm(false)} onSaved={() => { setShowTimeForm(false); reload(); }} />}
            {showNudge && <NudgeModal profile={myProfile} onClose={() => setShowNudge(false)} />}
            {showMenu && <MenuModal profile={myProfile} onClose={() => setShowMenu(false)} onNudge={() => { setShowMenu(false); setShowNudge(true); }} />}
        </div>
    );
}

// ============================ MODALER ============================

function EmptyState({ icon, title, text }) {
    return (
        <div style={{ ...GLASS, background: '#fff', borderRadius: '22px', padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
            <h3 style={{ margin: 0, color: '#334155', fontSize: '1.1rem', fontWeight: 800 }}>{title}</h3>
            <p style={{ margin: 0, color: '#64748b', maxWidth: 280 }}>{text}</p>
        </div>
    );
}

function Sheet({ title, onClose, children, footer }) {
    return createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '92vh', background: '#f8fafc', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', boxShadow: '0 -20px 50px rgba(0,0,0,0.25)', animation: 'guestSheetUp 0.32s cubic-bezier(0.16,1,0.3,1)' }}>
                <div style={{ padding: '20px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{title}</h2>
                    <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: '50%', background: '#eef2f7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><X size={19} /></button>
                </div>
                <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>{children}</div>
                {footer && <div style={{ padding: '16px 22px calc(16px + env(safe-area-inset-bottom))', borderTop: '1px solid #e2e8f0' }}>{footer}</div>}
                <style>{`@keyframes guestSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            </div>
        </div>,
        document.body
    );
}

function CaseDetailModal({ lead, membership, onClose }) {
    const desc = lead.raw_data?.project_description || lead.raw_data?.description || lead.project_category;
    const checklist = Array.isArray(lead.raw_data?.checklist) ? lead.raw_data.checklist : [];
    const daily = lead.raw_data?.daily_message;
    const dailyText = typeof daily === 'object' ? daily?.text : daily;
    const addr = leadAddress(lead);

    const Section = ({ icon, title, children }) => (
        <div style={{ ...GLASS, background: '#fff', borderRadius: '18px', padding: '16px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#0f172a' }}>
                {icon}<h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{title}</h4>
            </div>
            {children}
        </div>
    );

    return (
        <Sheet title={leadTitle(lead)} onClose={onClose}>
            <div style={{ marginBottom: '14px', color: '#64748b' }}>
                <span style={{ fontWeight: 800, color: '#94a3b8', fontSize: '0.78rem' }}>SAG #{leadNo(lead)}</span>
                {membership && <span style={{ marginLeft: 8, padding: '3px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800 }}>{getMemberRoleLabel(membership.role)}</span>}
                <div style={{ marginTop: 6, color: '#475569' }}>{lead.customer_name}{addr ? ` · ${addr}` : ''}</div>
            </div>

            {desc && <Section icon={<FileText size={17} color="#2563eb" />} title="Beskrivelse"><p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{desc}</p></Section>}

            {dailyText && <Section icon={<Hammer size={17} color="#2563eb" />} title="Byggeproces"><p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{dailyText}</p></Section>}

            {checklist.length > 0 && (
                <Section icon={<ListChecks size={17} color="#2563eb" />} title="Bygge to-do">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {checklist.map((item, i) => {
                            const text = typeof item === 'string' ? item : (item.text || item.title || '');
                            const done = typeof item === 'object' && (item.done || item.completed);
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: done ? '#94a3b8' : '#334155' }}>
                                    <CheckCircle2 size={17} color={done ? '#10b981' : '#cbd5e1'} />
                                    <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{text}</span>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {!desc && !dailyText && checklist.length === 0 && (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Ingen projektdetaljer delt endnu.</p>
            )}
        </Sheet>
    );
}

function TimeFormModal({ leads, profile, onClose, onSaved }) {
    const today = new Date();
    const [leadId, setLeadId] = useState(leads[0]?.id || '');
    const [date, setDate] = useState(today.toISOString().substring(0, 10));
    const [start, setStart] = useState('07:00');
    const [end, setEnd] = useState(toHHMM(today));
    const [desc, setDesc] = useState('');
    const [saving, setSaving] = useState(false);

    const hours = hoursBetween(start, end);

    const save = async () => {
        if (!leadId) { toast.error('Vælg en sag.'); return; }
        if (hours <= 0) { toast.error('Sluttid skal være efter starttid.'); return; }
        setSaving(true);
        try {
            await logGuestTimeEntry({
                leadId, profile,
                entry: { date, startTime: start, endTime: end, hours, desc: desc || 'Arbejde udført' },
            });
            toast.success('Timer registreret!');
            onSaved();
        } catch (e) {
            console.error(e);
            toast.error('Kunne ikke gemme timerne.');
        } finally {
            setSaving(false);
        }
    };

    const field = { width: '100%', padding: '13px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#fff', boxSizing: 'border-box', color: '#0f172a' };
    const label = { display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', margin: '0 0 7px 2px' };

    return (
        <Sheet
            title="Indberet timer"
            onClose={onClose}
            footer={
                <button onClick={save} disabled={saving}
                    style={{ width: '100%', padding: '15px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '1.05rem', cursor: saving ? 'wait' : 'pointer' }}>
                    {saving ? 'Gemmer…' : `Gem ${hours > 0 ? `(${hours.toFixed(1)} t)` : ''}`}
                </button>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={label}>Sag</label>
                    <select value={leadId} onChange={e => setLeadId(e.target.value)} style={field}>
                        {leads.map(l => <option key={l.id} value={l.id}>#{leadNo(l)} · {leadTitle(l)}</option>)}
                    </select>
                </div>
                <div>
                    <label style={label}>Dato</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={field} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={label}>Start</label><input type="time" value={start} onChange={e => setStart(e.target.value)} style={field} /></div>
                    <div><label style={label}>Slut</label><input type="time" value={end} onChange={e => setEnd(e.target.value)} style={field} /></div>
                </div>
                <div>
                    <label style={label}>Beskrivelse (valgfri)</label>
                    <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Hvad lavede du?" style={field} />
                </div>
            </div>
        </Sheet>
    );
}

function NudgeModal({ profile, onClose }) {
    const [step, setStep] = useState('pitch');   // 'pitch' | 'form'
    const [companyName, setCompanyName] = useState(profile?.company_name && profile.company_name !== 'Underentreprenør' ? profile.company_name : '');
    const [cvr, setCvr] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [saving, setSaving] = useState(false);

    const features = [
        { icon: FileText, title: 'Send tilbud', text: 'Professionelle tilbud på minutter — direkte til kunden.' },
        { icon: Hammer, title: 'Byg priser', text: 'Pris-generator der regner materialer og timer ud for dig.' },
        { icon: ListChecks, title: 'Styr dine sager', text: 'Tegninger, to-do, timer og dokumentation samlet ét sted.' },
        { icon: Building2, title: 'Dit eget firma', text: 'Din egen Bison Frame — fuldstændig adskilt fra alle andre.' },
    ];

    const convert = async () => {
        if (!companyName.trim()) { toast.error('Skriv dit firmanavn.'); return; }
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/convert-guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
                body: JSON.stringify({ companyName, cvr, address, phone }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Kunne ikke oprette firmaet.');
            toast.success('Tillykke — dit firma er oprettet! 🎉');
            // Fuld reload → role='admin' → hele mester-appen indlæses (du beholder dine sager).
            window.location.href = '/dashboard';
        } catch (e) {
            console.error(e);
            toast.error(e.message);
            setSaving(false);
        }
    };

    const fieldStyle = { width: '100%', padding: '13px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#fff', boxSizing: 'border-box', color: '#0f172a' };
    const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', margin: '0 0 7px 2px' };

    if (step === 'form') {
        return (
            <Sheet
                title="Opret dit firma"
                onClose={onClose}
                footer={
                    <button onClick={convert} disabled={saving}
                        style={{ width: '100%', padding: '16px', background: saving ? '#64748b' : 'linear-gradient(135deg, #2563eb, #1e3a8a)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '1.1rem', cursor: saving ? 'wait' : 'pointer', boxShadow: '0 14px 30px -8px rgba(37,99,235,0.5)' }}>
                        {saving ? 'Opretter…' : 'Start gratis i 30 dage'}
                    </button>
                }
            >
                <p style={{ margin: '0 0 18px', color: '#475569' }}>Du beholder adgangen til dine nuværende sager — og får din egen Bison Frame oveni. <strong>Intet kort, ingen binding.</strong></p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div><label style={labelStyle}>Firmanavn *</label><input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Dit Firma ApS" style={fieldStyle} /></div>
                    <div><label style={labelStyle}>CVR (valgfri)</label><input value={cvr} onChange={e => setCvr(e.target.value)} placeholder="12345678" style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Adresse (valgfri)</label><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Byggevej 12, 1234 Byen" style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Telefon (valgfri)</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+45 12 34 56 78" style={fieldStyle} /></div>
                </div>
            </Sheet>
        );
    }

    return (
        <Sheet
            title="Få din egen Bison Frame"
            onClose={onClose}
            footer={
                <button
                    onClick={() => setStep('form')}
                    style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #2563eb, #1e3a8a)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 14px 30px -8px rgba(37,99,235,0.5)' }}>
                    Opret mit firma — gratis i 30 dage
                </button>
            }
        >
            <div style={{ borderRadius: '20px', padding: '22px', background: 'linear-gradient(135deg, #2563eb, #1e3a8a)', color: '#fff', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -10, top: -10, opacity: 0.18 }}><Rocket size={110} /></div>
                <Sparkles size={22} />
                <h3 style={{ margin: '10px 0 6px', fontSize: '1.4rem', fontWeight: 900 }}>Træt af at styre alt i Excel?</h3>
                <p style={{ margin: 0, opacity: 0.92 }}>Prøv hele Bison Frame gratis i 30 dage. Intet kort, ingen binding.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {features.map(({ icon: Icon, title, text }) => (
                    <div key={title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', ...GLASS, background: '#fff', borderRadius: '16px', padding: '15px' }}>
                        <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color="#2563eb" /></div>
                        <div>
                            <h4 style={{ margin: '0 0 3px', color: '#0f172a', fontWeight: 800, fontSize: '0.98rem' }}>{title}</h4>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>{text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Sheet>
    );
}

function MenuModal({ profile, onClose, onNudge }) {
    const logout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };
    return (
        <Sheet title="Menu" onClose={onClose}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', ...GLASS, background: '#fff', borderRadius: '18px', padding: '16px', marginBottom: '18px' }}>
                <div style={{ width: 52, height: 52, borderRadius: '16px', background: 'linear-gradient(135deg,#2563eb,#1e3a8a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.3rem' }}>
                    {(profile?.owner_name || profile?.company_name || 'G').charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.owner_name || profile?.company_name || 'Gæst'}</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Gæst · Underentreprenør</div>
                </div>
            </div>

            <button onClick={onNudge}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', borderRadius: '18px', padding: '18px', marginBottom: '12px', background: 'linear-gradient(135deg, #2563eb, #1e3a8a)', color: '#fff', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 14px 30px -10px rgba(37,99,235,0.5)' }}>
                <Rocket size={22} />
                <div>
                    <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>Opret din virksomhed i Bison Frame</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.92 }}>Prøv gratis i 30 dage</div>
                </div>
            </button>

            <button onClick={logout}
                style={{ width: '100%', padding: '15px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}>
                Log ud
            </button>
        </Sheet>
    );
}
