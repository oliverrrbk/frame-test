import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Home, Briefcase, Clock, Menu, X, Sparkles, MapPin, ChevronRight,
    Plus, CheckCircle2, ListChecks, FileText, Hammer, Rocket, Building2, Mail, HardHat
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { fetchMyMemberships, getMemberRoleLabel, logGuestTimeEntry } from '../../utils/projectMembers';
import { subscribeToPush, isPushSupported } from '../../utils/pushSubscription';
import GorgeousSingleSelect from '../Dashboard/GorgeousSingleSelect';

// Gæste-appen: en bevidst MINIMAL, mobil-først visning for underentreprenører.
// Han ser KUN de sager han er koblet på, kan læse projektet og føre SINE egne timer.
// Ingen oprettelse, ingen økonomi, ingen intern chat (maskeres allerede server-side).
//
// DESIGN: bruger BEVIDST samme sprog som resten af Bison Frame (index.css-tokens),
// så gæste-appen føles som en del af produktet — ikke et fremmed design:
//   baggrund #f8fafc + samme radial-mesh · glas-paneler (blur 24) · sort #111
//   primærknapper · grøn #10b981→#059669 til positive handlinger · blå #007aff til
//   links/valg · varm-grå tekst (#1a1a1a/#5e5e5e/#8a8a8a) · bløde diffuse skygger.

const T = {
    bg: '#f8fafc',
    // Samme faste mesh-baggrund som body i index.css (blå + orange + slate).
    mesh: 'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(circle at 100% 100%, rgba(249,115,22,0.15) 0%, transparent 60%), radial-gradient(circle at 100% 0%, rgba(148,163,184,0.10) 0%, transparent 50%)',
    textPrimary: '#1a1a1a',
    textSecondary: '#5e5e5e',
    textTertiary: '#8a8a8a',
    accent: '#111111',
    blue: '#007aff',
    blueSoft: 'rgba(0,122,255,0.10)',
    green1: '#10b981',
    green2: '#059669',
    border: 'rgba(255,255,255,0.7)',
    borderInner: 'rgba(226,232,240,0.9)',
    shadowSm: '0 8px 24px rgba(0,0,0,0.04)',
    shadowMd: '0 16px 48px rgba(0,0,0,0.06)',
};

// Ydre glas-kort (barer + KPI-fliser) — som .glass-panel i index.css.
const GLASS = {
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${T.border}`,
    boxShadow: T.shadowSm,
};

// Indre kort (lister/sektioner) — lidt mere massive, som .glass-panel-tab i case-visningen.
const CARD = {
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: `1px solid ${T.borderInner}`,
    boxShadow: T.shadowSm,
};

// Appens to knap-sprog: sort #111 = neutral primær · grøn = positiv handling.
const DARK_BTN = { background: T.accent, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' };
const GREEN_BTN = { background: `linear-gradient(145deg, ${T.green1}, ${T.green2})`, color: '#fff', boxShadow: '0 8px 20px rgba(16,185,129,0.25)' };

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

// Fordelene ved at få sin egen Frame — genbruges i både "Frame"-fanen og NudgeModal.
const FRAME_FEATURES = [
    { icon: FileText, title: 'Send tilbud', text: 'Professionelle tilbud på minutter — direkte til kunden.' },
    { icon: Hammer, title: 'Byg priser', text: 'Pris-generator der regner materialer og timer ud for dig.' },
    { icon: ListChecks, title: 'Styr dine sager', text: 'Tegninger, to-do, timer og dokumentation samlet ét sted.' },
    { icon: Building2, title: 'Dit eget firma', text: 'Din egen Bison Frame — fuldstændig adskilt fra alle andre.' },
];

// Ét lille fordels-kort (delt af Frame-fanen og NudgeModal) — appens glas-stil.
function FeatureRow({ icon: Icon, title, text }) {
    return (
        <div className="gd-lift" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', ...CARD, borderRadius: '16px', padding: '15px' }}>
            <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: '12px', background: T.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={T.blue} /></div>
            <div>
                <h4 style={{ margin: '0 0 3px', color: T.textPrimary, fontWeight: 700, fontSize: '0.98rem' }}>{title}</h4>
                <p style={{ margin: 0, color: T.textSecondary, fontSize: '0.88rem', lineHeight: 1.5 }}>{text}</p>
            </div>
        </div>
    );
}

export default function GuestDashboard({ myProfile }) {
    const [view, setView] = useState('home');          // 'home' | 'cases' | 'time' | 'frame'
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

    // KPI-flise i samme stil som mester-oversigtens kort: glas + farvet top-kant +
    // farve-chip + uppercase label + stor bold værdi.
    const StatTile = ({ icon: Icon, label, color, children }) => (
        <div style={{ ...GLASS, borderRadius: '24px', borderTop: `4px solid ${color}`, padding: '18px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Icon size={100} style={{ position: 'absolute', right: -18, bottom: -18, color, opacity: 0.05 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', background: `${color}1f`, color, display: 'flex' }}><Icon size={16} /></div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.02em', lineHeight: 1 }}>{children}</div>
        </div>
    );

    const NudgeCard = () => (
        <div className="gd-lift" onClick={() => setView('frame')}
            style={{ cursor: 'pointer', ...CARD, borderRadius: '24px', padding: '22px', position: 'relative', overflow: 'hidden' }}
        >
            <Sparkles size={120} style={{ position: 'absolute', right: -18, top: -18, color: T.blue, opacity: 0.06 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.blue }}>
                <Sparkles size={15} /> Din egen Frame
            </div>
            <h3 style={{ margin: '8px 0 4px', fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.2, color: T.textPrimary, letterSpacing: '-0.02em' }}>
                Vil du selv bruge Frame?
            </h3>
            <p style={{ margin: 0, fontSize: '0.92rem', color: T.textSecondary, maxWidth: '360px', lineHeight: 1.55 }}>
                Du er med her som underleverandør. Vil du selv sende tilbud og styre dine egne sager, kan du prøve Frame — helt når du har lyst.
            </p>
            <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: T.accent, color: '#fff', padding: '9px 16px', borderRadius: '999px', fontWeight: 600, fontSize: '0.9rem' }}>
                Læs mere <ChevronRight size={16} />
            </div>
        </div>
    );

    const CaseCard = ({ lead }) => {
        const m = memberships[String(lead.id)];
        const addr = leadAddress(lead);
        return (
            <div className="gd-lift" style={{ ...CARD, borderRadius: '20px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: T.textTertiary, letterSpacing: '0.05em' }}>SAG #{leadNo(lead)}</span>
                        <h3 style={{ margin: '3px 0 0', fontSize: '1.15rem', color: T.textPrimary, fontWeight: 700, letterSpacing: '-0.01em' }}>{leadTitle(lead)}</h3>
                    </div>
                    {m && (
                        <span style={{ padding: '5px 11px', background: T.blueSoft, color: T.blue, borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {getMemberRoleLabel(m.role)}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', color: T.textSecondary, fontSize: '0.92rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Briefcase size={15} color={T.textTertiary} />{lead.customer_name || 'Ukendt kunde'}</div>
                    {addr && <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><MapPin size={15} color={T.textTertiary} />{addr}</div>}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    {addr && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`} target="_blank" rel="noopener noreferrer"
                            className="gd-btn" style={{ flex: 1, textAlign: 'center', padding: '11px', background: 'rgba(255,255,255,0.7)', border: `1px solid ${T.borderInner}`, color: T.blue, borderRadius: '14px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                            Vis vej
                        </a>
                    )}
                    <button onClick={() => setSelectedCase(lead)} className="gd-btn"
                        style={{ flex: 1, padding: '11px', ...DARK_BTN, border: 'none', borderRadius: '14px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
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
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.02em' }}>Hej {firstName}!</h1>
                <p style={{ margin: '6px 0 0', color: T.textSecondary, fontSize: '1.02rem' }}>Dine sager og timer ét sted.</p>
            </div>

            {pushState === 'prompt' && (
                <div style={{ borderRadius: '20px', padding: '18px 20px', background: T.accent, color: '#fff', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 12px 30px -12px rgba(0,0,0,0.5)' }}>
                    <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '14px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🔔</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>Slå notifikationer til</div>
                        <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>Få besked når du tilføjes på en sag eller mangler at registrere timer.</div>
                    </div>
                    <button onClick={enablePush} className="gd-btn" style={{ flexShrink: 0, padding: '10px 16px', borderRadius: '12px', border: 'none', background: '#fff', color: T.textPrimary, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>Slå til</button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <StatTile icon={Briefcase} label="Dine sager" color={T.blue}>{leads.length}</StatTile>
                <StatTile icon={Clock} label="Timer i uge" color={T.green1}>
                    {hoursThisWeek.toFixed(1)}<span style={{ fontSize: '1rem', color: T.textTertiary, fontWeight: 600 }}> t</span>
                </StatTile>
            </div>

            <NudgeCard />

            {leads.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 2px 10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: T.textPrimary }}>Seneste sager</h3>
                        <button onClick={() => setView('cases')} className="gd-btn" style={{ background: 'none', border: 'none', color: T.blue, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Se alle</button>
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
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.02em' }}>Mine sager</h1>
            {leads.length === 0 ? (
                <EmptyState icon={<Briefcase size={30} color={T.textTertiary} />} title="Ingen sager endnu" text="Når en mester kobler dig på en sag, dukker den op her." />
            ) : leads.map(l => <CaseCard key={l.id} lead={l} />)}
        </div>
    );

    const TimeView = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.02em' }}>Mine timer</h1>
                <button onClick={() => setShowTimeForm(true)} disabled={leads.length === 0} className="gd-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', ...(leads.length === 0 ? { background: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' } : DARK_BTN), border: 'none', borderRadius: '14px', fontWeight: 600, cursor: leads.length === 0 ? 'not-allowed' : 'pointer' }}>
                    <Plus size={17} /> Ny
                </button>
            </div>
            {myEntries.length === 0 ? (
                <EmptyState icon={<Clock size={30} color={T.textTertiary} />} title="Ingen timer registreret" text="Tryk på “Ny” for at indberette dine timer på en sag." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {myEntries.map((e, i) => (
                        <div key={e.id || i} style={{ ...CARD, borderRadius: '16px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.leadName}</div>
                                <div style={{ color: T.textSecondary, fontSize: '0.82rem' }}>
                                    {e.date}{e.startTime && e.endTime ? ` · ${e.startTime}–${e.endTime}` : ''}{e.desc ? ` · ${e.desc}` : ''}
                                </div>
                            </div>
                            <div style={{ fontWeight: 800, color: T.green2, fontSize: '1.05rem', whiteSpace: 'nowrap' }}>{Number(e.hours || 0).toFixed(1)} t</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ---------- RENDER ----------

    if (loading) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, backgroundImage: T.mesh, backgroundAttachment: 'fixed' }}>
                <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: T.blue, borderRadius: '50%' }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100dvh', background: T.bg, backgroundImage: T.mesh, backgroundAttachment: 'fixed', display: 'flex', flexDirection: 'column' }}>
            {/* Delte hover-/interaktions-effekter (som resten af appen) — globale, så de
                også gælder de portalerede modaler. */}
            <style>{`
                .gd-lift { transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .25s ease; }
                .gd-lift:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); }
                .gd-btn { transition: transform .15s ease, box-shadow .2s ease, filter .2s ease; }
                .gd-btn:hover { transform: translateY(-1px); filter: brightness(1.04); }
                .gd-btn:active { transform: scale(.97); }
            `}</style>

            {/* Top bar — hamburger i venstre kant (som resten af Bison Frame på mobil) */}
            <div style={{ position: 'sticky', top: 0, zIndex: 50, padding: 'max(14px, env(safe-area-inset-top)) 18px 14px', display: 'flex', alignItems: 'center', gap: '12px', ...GLASS, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
                <button onClick={() => setShowMenu(true)} className="gd-btn" style={{ width: 42, height: 42, borderRadius: '14px', background: 'rgba(255,255,255,0.8)', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <Menu size={20} color={T.textPrimary} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/logo.png" alt="Bison Frame" style={{ height: 26, width: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    <span style={{ fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.02em' }}>Bison Frame</span>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '22px 18px calc(96px + env(safe-area-inset-bottom)) 18px', maxWidth: 640, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                {view === 'home' && HomeView}
                {view === 'cases' && CasesView}
                {view === 'time' && TimeView}
                {view === 'frame' && <FrameView profile={myProfile} onStartConvert={() => setShowNudge(true)} />}
            </div>

            {/* Bottom nav */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, padding: '10px 18px calc(10px + env(safe-area-inset-bottom)) 18px', display: 'flex', justifyContent: 'space-around', ...GLASS, borderRadius: 0, borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}>
                {[
                    { id: 'home', label: 'Oversigt', icon: Home },
                    { id: 'cases', label: 'Sager', icon: Briefcase },
                    { id: 'time', label: 'Timer', icon: Clock },
                    { id: 'frame', label: 'Frame', icon: Sparkles },
                ].map(({ id, label, icon: Icon }) => {
                    const active = view === id;
                    return (
                        <button key={id} onClick={() => setView(id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '4px 14px', color: active ? T.accent : T.textTertiary, fontWeight: active ? 700 : 600, transition: 'color .2s ease' }}>
                            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                            <span style={{ fontSize: '0.72rem' }}>{label}</span>
                        </button>
                    );
                })}
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
        <div style={{ ...CARD, borderRadius: '22px', padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
            <h3 style={{ margin: 0, color: T.textPrimary, fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
            <p style={{ margin: 0, color: T.textSecondary, maxWidth: 280 }}>{text}</p>
        </div>
    );
}

function Sheet({ title, onClose, children, footer }) {
    return createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(17,17,17,0.4)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '92vh', background: 'linear-gradient(180deg, #ffffff, #f8fafc)', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', boxShadow: '0 -20px 60px rgba(17,17,17,0.25)', animation: 'guestSheetUp 0.32s cubic-bezier(0.16,1,0.3,1)' }}>
                <div style={{ padding: '20px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.borderInner}` }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.02em' }}>{title}</h2>
                    <button onClick={onClose} className="gd-btn" style={{ width: 38, height: 38, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSecondary }}><X size={19} /></button>
                </div>
                <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>{children}</div>
                {footer && <div style={{ padding: '16px 22px calc(16px + env(safe-area-inset-bottom))', borderTop: `1px solid ${T.borderInner}` }}>{footer}</div>}
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
        <div style={{ ...CARD, borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: T.textPrimary }}>
                {icon}<h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{title}</h4>
            </div>
            {children}
        </div>
    );

    return (
        <Sheet title={leadTitle(lead)} onClose={onClose}>
            <div style={{ marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, color: T.textTertiary, fontSize: '0.78rem', letterSpacing: '0.04em' }}>SAG #{leadNo(lead)}</span>
                {membership && <span style={{ marginLeft: 8, padding: '3px 10px', background: T.blueSoft, color: T.blue, borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>{getMemberRoleLabel(membership.role)}</span>}
                <div style={{ marginTop: 6, color: T.textSecondary }}>{lead.customer_name}{addr ? ` · ${addr}` : ''}</div>
            </div>

            {addr && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`} target="_blank" rel="noopener noreferrer"
                    className="gd-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginBottom: '14px', padding: '10px 16px', background: 'rgba(255,255,255,0.7)', border: `1px solid ${T.borderInner}`, color: T.blue, borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                    <MapPin size={16} /> Vis vej
                </a>
            )}

            {desc && <Section icon={<FileText size={17} color={T.blue} />} title="Beskrivelse"><p style={{ margin: 0, color: T.textSecondary, lineHeight: 1.6 }}>{desc}</p></Section>}

            {dailyText && <Section icon={<Hammer size={17} color={T.blue} />} title="Byggeproces"><p style={{ margin: 0, color: T.textSecondary, lineHeight: 1.6 }}>{dailyText}</p></Section>}

            {checklist.length > 0 && (
                <Section icon={<ListChecks size={17} color={T.blue} />} title="Bygge to-do">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {checklist.map((item, i) => {
                            const text = typeof item === 'string' ? item : (item.text || item.title || '');
                            const done = typeof item === 'object' && (item.done || item.completed);
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: done ? T.textTertiary : T.textSecondary }}>
                                    <CheckCircle2 size={17} color={done ? T.green1 : '#cbd5e1'} />
                                    <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{text}</span>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {!desc && !dailyText && checklist.length === 0 && (
                <p style={{ color: T.textTertiary, textAlign: 'center', padding: '20px 0' }}>Ingen projektdetaljer delt endnu.</p>
            )}
        </Sheet>
    );
}

const guestField = { width: '100%', padding: '13px 14px', borderRadius: '14px', border: `1px solid ${T.borderInner}`, fontSize: '1rem', background: '#fff', boxSizing: 'border-box', color: T.textPrimary, outline: 'none' };
const guestLabel = { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: T.textSecondary, margin: '0 0 7px 2px' };

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

    return (
        <Sheet
            title="Indberet timer"
            onClose={onClose}
            footer={
                <button onClick={save} disabled={saving} className="gd-btn"
                    style={{ width: '100%', padding: '15px', ...GREEN_BTN, border: 'none', borderRadius: '16px', fontWeight: 700, fontSize: '1.05rem', cursor: saving ? 'wait' : 'pointer' }}>
                    {saving ? 'Gemmer…' : `Gem ${hours > 0 ? `(${hours.toFixed(1)} t)` : ''}`}
                </button>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={guestLabel}>Sag</label>
                    {/* Custom dropdown (aldrig native select) — appens GorgeousSingleSelect. */}
                    <GorgeousSingleSelect
                        options={leads.map(l => ({ id: l.id, name: `#${leadNo(l)} · ${leadTitle(l)}` }))}
                        selectedId={leadId}
                        onChange={setLeadId}
                        placeholder="Vælg sag"
                        icon={Briefcase}
                    />
                </div>
                <div>
                    <label style={guestLabel}>Dato</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={guestField} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={guestLabel}>Start</label><input type="time" value={start} onChange={e => setStart(e.target.value)} style={guestField} /></div>
                    <div><label style={guestLabel}>Slut</label><input type="time" value={end} onChange={e => setEnd(e.target.value)} style={guestField} /></div>
                </div>
                <div>
                    <label style={guestLabel}>Beskrivelse (valgfri)</label>
                    <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Hvad lavede du?" style={guestField} />
                </div>
            </div>
        </Sheet>
    );
}

// "Frame"-fanen: blidt, fag-bevidst tilbud om at få sin egen Bison Frame.
// Frame er lige nu bygget til tømrere (ENABLED_SIGNUP_TRADES=['tomrer']), så
// tømrere kan prøve direkte, mens andre fag inviteres til at kontakte os.
function FrameView({ profile, onStartConvert }) {
    const [who, setWho] = useState(null);   // null | 'tomrer' | 'other'

    const contactHref = `mailto:info@bisonframe.dk?subject=${encodeURIComponent('Interesse i Bison Frame')}&body=${encodeURIComponent(`Hej Bison Frame,\n\nJeg bruger Frame som underleverandør, og kunne godt tænke mig at bruge det i min egen forretning.\n\nMit fag er: \nFirma: ${profile?.company_name || ''}\n\nVenlig hilsen\n${profile?.owner_name || ''}`)}`;

    const choiceBtn = (active) => ({
        flex: 1, padding: '16px', borderRadius: '16px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center',
        border: active ? `2px solid ${T.blue}` : `1px solid ${T.borderInner}`,
        background: active ? T.blueSoft : '#fff', color: active ? T.blue : T.textSecondary,
        transition: 'all 0.15s ease',
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.02em' }}>Vil du selv bruge Frame?</h1>
                <p style={{ margin: '6px 0 0', color: T.textSecondary, lineHeight: 1.55 }}>
                    Du er med her som underleverandør. Vil du selv sende tilbud og styre dine egne sager, kan du prøve Frame — helt når du har lyst. Intet pres.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {FRAME_FEATURES.map(f => <FeatureRow key={f.title} {...f} />)}
            </div>

            <div style={{ ...CARD, borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: '1.05rem' }}>Hvad er dit fag?</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setWho('tomrer')} className="gd-btn" style={choiceBtn(who === 'tomrer')}>
                        <HardHat size={24} color={who === 'tomrer' ? T.blue : T.textTertiary} />
                        Jeg er tømrer
                    </button>
                    <button onClick={() => setWho('other')} className="gd-btn" style={choiceBtn(who === 'other')}>
                        <Building2 size={24} color={who === 'other' ? T.blue : T.textTertiary} />
                        Jeg er et andet fag
                    </button>
                </div>

                {who === 'tomrer' && (
                    <>
                        <p style={{ margin: 0, color: T.textSecondary, fontSize: '0.9rem', lineHeight: 1.55 }}>
                            Frame er lige nu bygget til tømrere — perfekt til dig. Du beholder adgangen til dine nuværende sager og får din egen Frame oveni.
                        </p>
                        <button onClick={onStartConvert} className="gd-btn"
                            style={{ width: '100%', padding: '16px', ...GREEN_BTN, border: 'none', borderRadius: '16px', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer' }}>
                            Opret mit firma — gratis i 30 dage
                        </button>
                    </>
                )}

                {who === 'other' && (
                    <>
                        <p style={{ margin: 0, color: T.textSecondary, fontSize: '0.9rem', lineHeight: 1.55 }}>
                            Frame er lige nu bygget til tømrere. Er du et andet fag og kan se det i din forretning, så skriv til os — så finder vi en løsning sammen.
                        </p>
                        <a href={contactHref} className="gd-btn"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '16px', ...DARK_BTN, textDecoration: 'none', borderRadius: '16px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Mail size={18} /> Kontakt os
                        </a>
                    </>
                )}
            </div>
        </div>
    );
}

function NudgeModal({ profile, onClose }) {
    const [step, setStep] = useState('pitch');   // 'pitch' | 'form'
    const [companyName, setCompanyName] = useState(profile?.company_name && profile.company_name !== 'Underentreprenør' ? profile.company_name : '');
    const [cvr, setCvr] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [saving, setSaving] = useState(false);

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

    if (step === 'form') {
        return (
            <Sheet
                title="Opret dit firma"
                onClose={onClose}
                footer={
                    <button onClick={convert} disabled={saving} className="gd-btn"
                        style={{ width: '100%', padding: '16px', ...(saving ? { background: T.textTertiary, boxShadow: 'none', color: '#fff' } : GREEN_BTN), border: 'none', borderRadius: '16px', fontWeight: 700, fontSize: '1.1rem', cursor: saving ? 'wait' : 'pointer' }}>
                        {saving ? 'Opretter…' : 'Start gratis i 30 dage'}
                    </button>
                }
            >
                <p style={{ margin: '0 0 18px', color: T.textSecondary, lineHeight: 1.6 }}>Du bruger <strong style={{ color: T.textPrimary }}>samme login</strong> (din e-mail) — udfyld bare dine firma-oplysninger. Du beholder adgangen til dine nuværende sager og får din egen Bison Frame oveni. <strong style={{ color: T.textPrimary }}>Intet kort, ingen binding.</strong></p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div><label style={guestLabel}>Firmanavn *</label><input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Dit Firma ApS" style={guestField} /></div>
                    <div><label style={guestLabel}>CVR (valgfri)</label><input value={cvr} onChange={e => setCvr(e.target.value)} placeholder="12345678" style={guestField} /></div>
                    <div><label style={guestLabel}>Adresse (valgfri)</label><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Byggevej 12, 1234 Byen" style={guestField} /></div>
                    <div><label style={guestLabel}>Telefon (valgfri)</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+45 12 34 56 78" style={guestField} /></div>
                </div>
            </Sheet>
        );
    }

    return (
        <Sheet
            title="Få din egen Bison Frame"
            onClose={onClose}
            footer={
                <button onClick={() => setStep('form')} className="gd-btn"
                    style={{ width: '100%', padding: '16px', ...GREEN_BTN, border: 'none', borderRadius: '16px', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}>
                    Opret mit firma — gratis i 30 dage
                </button>
            }
        >
            <div style={{ borderRadius: '20px', padding: '22px', background: `linear-gradient(145deg, ${T.green1}, ${T.green2})`, color: '#fff', marginBottom: '20px', position: 'relative', overflow: 'hidden', boxShadow: '0 14px 30px -10px rgba(16,185,129,0.45)' }}>
                <div style={{ position: 'absolute', right: -10, top: -10, opacity: 0.18 }}><Rocket size={110} /></div>
                <Sparkles size={22} />
                <h3 style={{ margin: '10px 0 6px', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Din egen Bison Frame</h3>
                <p style={{ margin: 0, opacity: 0.94 }}>Prøv hele Bison Frame gratis i 30 dage. Intet kort, ingen binding.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {FRAME_FEATURES.map(f => <FeatureRow key={f.title} {...f} />)}
            </div>
        </Sheet>
    );
}

function MenuModal({ profile, onClose, onNudge }) {
    const logout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };
    return (
        <Sheet title="Menu" onClose={onClose}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', ...CARD, borderRadius: '18px', padding: '16px', marginBottom: '18px' }}>
                <div style={{ width: 52, height: 52, borderRadius: '16px', background: T.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.3rem' }}>
                    {(profile?.owner_name || profile?.company_name || 'G').charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.owner_name || profile?.company_name || 'Gæst'}</div>
                    <div style={{ color: T.textSecondary, fontSize: '0.85rem' }}>Gæst · Underentreprenør</div>
                </div>
            </div>

            <button onClick={onNudge} className="gd-btn"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', borderRadius: '18px', padding: '18px', marginBottom: '12px', ...GREEN_BTN, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Rocket size={22} />
                <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Opret din virksomhed i Bison Frame</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.94 }}>Prøv gratis i 30 dage</div>
                </div>
            </button>

            <button onClick={logout} className="gd-btn"
                style={{ width: '100%', padding: '15px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}>
                Log ud
            </button>
        </Sheet>
    );
}
