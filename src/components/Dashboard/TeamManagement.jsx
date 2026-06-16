import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { UserPlus, Users, Trash2, Mail, Briefcase, Phone, Loader2, TrendingUp, Target, DollarSign, ChevronDown, ChevronUp, Shield, HardHat, MapPin, X, Clock, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { SubcontractorManager, BeautifulPhoneInput } from './Subcontractors';
import { isValidLonnummer, nextLonnummer } from '../../utils/payroll';

const roles = [
    { value: 'sales', label: 'Projektleder', desc: 'Kan styre tildelte sager, oprette ordrer og se materialepriser. (Kan ikke ændre andres timer).' },
    { value: 'worker', label: 'Svend', desc: 'Kan se tildelte sager, registrere timer, se materialeforbrug (uden pris) og tilføje billeder.' },
    { value: 'apprentice', label: 'Lærling', desc: 'Kan kun registrere egne timer og uploade billeder. Ingen adgang til sagsdetaljer eller priser.' },
    { value: 'accountant', label: 'Bogholder', desc: 'Har adgang til bekræftede sager for at håndtere fakturering, bilag og integrationer (e-conomic).' },
    { value: 'admin', label: 'Mester (Admin)', desc: 'Fuld adgang til alt: økonomi, systemindstillinger, priser og fjernelse af brugere.' }
];

const getRoleLabel = (role) => {
    switch (role) {
        case 'admin': return 'Mester';
        case 'sales': return 'Projektleder';
        case 'worker': return 'Svend';
        case 'apprentice': return 'Lærling';
        case 'subcontractor': return 'Underleverandør';
        case 'accountant': return 'Bogholder';
        default: return role;
    }
};

const TeamManagement = ({ profile, leadsData = [] }) => {
    const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [team, setTeam] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [newNoteText, setNewNoteText] = useState('');

    const [inviteData, setInviteData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'sales'
    });

    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const [hoveredRole, setHoveredRole] = useState(null);
    const dropdownRef = useRef(null);

    // Medarbejder-administration (kun Mester/admin)
    const isAdmin = profile.role === 'admin' || profile.id === (profile.company_id || profile.id);
    const [roleMenuFor, setRoleMenuFor] = useState(null);   // hvilken medarbejders rolle-menu er åben
    const [pendingPromo, setPendingPromo] = useState(null); // { member, role } — afventer admin-bekræftelse
    const [removeTarget, setRemoveTarget] = useState(null); // medarbejder der skal fjernes
    const [actionBusy, setActionBusy] = useState(false);

    // Mobil: invite-formularen vises som modal i stedet for inline
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Kald det sikre backend-endpoint (auth-header + service-role server-side).
    // Viser tydelige fejl, så vi aldrig ender i en "der sker ingenting"-tilstand.
    const callManage = async (action, payload) => {
        const { data: { session } } = await supabase.auth.getSession();

        let res;
        try {
            res = await fetch('/api/manage-employee', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({ action, ...payload })
            });
        } catch (e) {
            console.error('manage-employee netværksfejl:', e);
            throw new Error('Kunne ikke nå serveren (netværksfejl). Prøv igen.');
        }

        const rawText = await res.text();
        let result = {};
        try {
            result = rawText ? JSON.parse(rawText) : {};
        } catch {
            // Ikke-JSON svar (typisk at API-ruten ikke er deployet og SPA-HTML returneres).
            console.error('manage-employee uventet svar:', res.status, rawText.slice(0, 200));
            throw new Error(`Serveren svarede uventet (status ${res.status}). API'et er måske ikke deployet endnu.`);
        }

        if (!res.ok) throw new Error(result.error || `Handlingen mislykkedes (status ${res.status}).`);
        return result;
    };

    const doRoleChange = async (member, newRole) => {
        if (newRole === member.role) { setRoleMenuFor(null); return; }
        setActionBusy(true);
        try {
            await callManage('set_role', { employeeId: member.id, role: newRole });
            setTeam(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
            toast.success(`Rolle ændret til ${getRoleLabel(newRole)}.`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setActionBusy(false);
            setRoleMenuFor(null);
            setPendingPromo(null);
        }
    };

    const handleRoleSelect = (member, newRole) => {
        setRoleMenuFor(null);
        if (newRole === member.role) return;
        if (newRole === 'admin') {
            setPendingPromo({ member, role: newRole }); // kræver ekstra bekræftelse
        } else {
            doRoleChange(member, newRole);
        }
    };

    const doRemove = async (mode) => {
        if (!removeTarget) return;
        setActionBusy(true);
        try {
            if (mode === 'delete') {
                // Sletning går via Supabase edge-funktion, hvor service-role-nøglen altid er
                // til stede (uafhængig af Vercel-opsætning). Sletter login + persondata (GDPR).
                const { data, error } = await supabase.functions.invoke('delete-employee', {
                    body: { employeeId: removeTarget.id }
                });
                if (error || (data && data.error) || !data?.success) {
                    throw new Error(data?.error || error?.message || 'Sletningen mislykkedes.');
                }
            } else {
                await callManage('deactivate', { employeeId: removeTarget.id });
            }
            setTeam(prev => prev.filter(m => m.id !== removeTarget.id));
            toast.success(mode === 'delete' ? 'Medarbejderen er slettet.' : 'Medarbejderen er deaktiveret.');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setActionBusy(false);
            setRemoveTarget(null);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsRoleDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Mesterens ID bruges som company_id
    const companyId = profile.company_id || profile.id;

    useEffect(() => {
        fetchTeam();
    }, [companyId]);

    const fetchTeam = async () => {
        setIsLoading(true);
        // Hent alle der tilhører dette companyId, undtagen Mesteren selv
        const { data, error } = await supabase
            .from('carpenters')
            .select('*')
            .eq('company_id', companyId)
            .neq('id', profile.id);

        if (!error && data) {
            setTeam(data);
        }
        setIsLoading(false);
    };

    const handlePermissionToggle = async (employeeId, currentPermissions, key) => {
        const updatedPermissions = {
            ...currentPermissions,
            [key]: !currentPermissions?.[key]
        };
        
        // Optimistic UI update
        setTeam(team.map(m => m.id === employeeId ? { ...m, permissions: updatedPermissions } : m));

        // Gem via sikker endpoint (klient-side skrivning blokeres af beskyttelses-triggeren)
        try {
            await callManage('set_permissions', { employeeId, permissions: updatedPermissions });
        } catch (err) {
            console.error("Kunne ikke opdatere rettighed:", err);
            toast.error(err.message);
            fetchTeam();
        }
    };

    const handleVacationQuotaUpdate = async (employeeId, currentRawData, newQuota) => {
        const parsedQuota = parseInt(newQuota);
        if (isNaN(parsedQuota) || parsedQuota < 0) return;
        
        const newRawData = { ...currentRawData, vacation_quota: parsedQuota };
        
        // Optimistic UI update
        setTeam(team.map(m => m.id === employeeId ? { ...m, raw_data: newRawData } : m));

        // DB update
        const { error } = await supabase
            .from('carpenters')
            .update({ raw_data: newRawData })
            .eq('id', employeeId);
            
        if (error) {
            console.error("Kunne ikke opdatere feriesaldo:", error);
            fetchTeam();
        }
    };

    const handleAddNote = async (employeeId, currentRawData) => {
        if (!newNoteText.trim()) return;
        const note = { id: crypto.randomUUID(), date: new Date().toISOString(), text: newNoteText.trim() };
        const updatedNotes = [...(currentRawData.hr_notes || []), note];
        const newRawData = { ...currentRawData, hr_notes: updatedNotes };
        
        setTeam(team.map(m => m.id === employeeId ? { ...m, raw_data: newRawData } : m));
        setNewNoteText('');
        await supabase.from('carpenters').update({ raw_data: newRawData }).eq('id', employeeId);
    };

    const handleDeleteNote = async (employeeId, currentRawData, noteId) => {
        const updatedNotes = (currentRawData.hr_notes || []).filter(n => n.id !== noteId);
        const newRawData = { ...currentRawData, hr_notes: updatedNotes };
        setTeam(team.map(m => m.id === employeeId ? { ...m, raw_data: newRawData } : m));
        await supabase.from('carpenters').update({ raw_data: newRawData }).eq('id', employeeId);
    };

    // Lokal redigering mens man taster (gemmes ikke endnu)
    const handleLonnummerInput = (employeeId, value) => {
        setTeam(team.map(m => m.id === employeeId ? { ...m, raw_data: { ...(m.raw_data || {}), lonnummer: value } } : m));
    };

    // Validér + gem ved blur: kun tal, og må ikke være i brug af en anden
    const handleLonnummerBlur = async (member) => {
        const v = String(member.raw_data?.lonnummer ?? '').trim();
        if (v && !isValidLonnummer(v)) {
            toast.error('Lønnummer må kun indeholde tal.');
            fetchTeam();
            return;
        }
        const dup = [...team, { id: profile.id, raw_data: profile.raw_data }]
            .some(m => m.id !== member.id && v && String(m.raw_data?.lonnummer ?? '').trim() === v);
        if (dup) {
            toast.error('Lønnummeret er allerede i brug af en anden.');
            fetchTeam();
            return;
        }
        const newRawData = { ...(member.raw_data || {}), lonnummer: v };
        const { error } = await supabase.from('carpenters').update({ raw_data: newRawData }).eq('id', member.id);
        if (error) {
            console.error("Kunne ikke opdatere lønnummer:", error);
            toast.error('Kunne ikke gemme lønnummer.');
            fetchTeam();
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setIsInviting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/invite-employee', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({
                    name: inviteData.name,
                    email: inviteData.email,
                    phone: inviteData.phone,
                    role: inviteData.role,
                    companyId: companyId,
                    adminId: profile.id
                }),
            });

            const result = await response.json();

            if (response.ok) {
                // Auto-tildel næste ledige lønnummer, så det aldrig glemmes (kan ændres bagefter).
                const existingNumbers = [
                    ...team.map(m => m.raw_data?.lonnummer),
                    profile.raw_data?.lonnummer
                ].filter(Boolean);
                const autoLonnummer = nextLonnummer(existingNumbers);

                // Hent ny række så vi ikke overskriver evt. raw_data sat ved oprettelsen
                const { data: newRow } = await supabase.from('carpenters').select('raw_data').eq('email', inviteData.email).single();
                const mergedRaw = { ...(newRow?.raw_data || {}), lonnummer: autoLonnummer };

                // Sikr at requires_password_change står til true i databasen for den nye bruger, så de får pop-uppen!
                await supabase.from('carpenters').update({ requires_password_change: true, raw_data: mergedRaw }).eq('email', inviteData.email);

                setSuccessMsg(`Medarbejder oprettet med lønnummer ${autoLonnummer}! Der er automatisk sendt en velkomstmail med login-oplysninger.`);
                setInviteData({ name: '', email: '', phone: '', role: 'sales' });
                if (isMobile) { setIsInviteModalOpen(false); toast.success(`Medarbejder oprettet (lønnr. ${autoLonnummer})`); }
                fetchTeam(); // Opdater listen
            } else {
                setErrorMsg(result.error || 'Kunne ikke invitere medarbejder.');
            }
        } catch (error) {
            setErrorMsg('Der skete en netværksfejl.');
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="team-management-workspace space-y-8 animate-fadeIn" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="team-management-grid grid grid-cols-1 lg:grid-cols-3 gap-8 items-start" style={{ position: 'relative', zIndex: 20 }}>
                {/* Mobil: knap der åbner invite som modal */}
                {isMobile && (
                    <button onClick={() => { setIsInviteModalOpen(true); setSuccessMsg(''); setErrorMsg(''); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '18px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #1a1a1a, #0f172a)', color: '#fff', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(15,23,42,0.2)' }}>
                        <UserPlus size={20} /> Tilføj medarbejder
                    </button>
                )}

                {/* Inviter Medarbejder — inline på desktop, fuldskærms-modal (portal) på mobil */}
                {(() => {
                    const card = (
                    <div
                        className="settings-card sticky top-6"
                        onClick={isMobile ? (e) => e.stopPropagation() : undefined}
                        style={isMobile
                            ? { overflow: 'auto', width: '100%', height: '100dvh', borderRadius: 0, margin: 0, top: 0, background: '#fff' }
                            : { overflow: 'visible' }}>
                        <div className="card-header" style={{ position: 'relative' }}>
                            <div className="icon-wrapper">
                                <UserPlus size={24} />
                            </div>
                            <h3>Tilføj Medarbejder</h3>
                            {isMobile && (
                                <button onClick={() => setIsInviteModalOpen(false)} style={{ position: 'absolute', right: 0, top: 0, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                        {successMsg && (
                            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '4px solid #10b981', color: '#047857', marginBottom: '24px' }}>
                                {successMsg}
                            </div>
                        )}
                        
                        {errorMsg && (
                            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444', color: '#b91c1c', marginBottom: '24px' }}>
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleInvite} className="space-y-6">
                            <div className="input-group">
                                <label>Fulde Navn</label>
                                <input
                                    type="text"
                                    required
                                    value={inviteData.name}
                                    onChange={(e) => setInviteData({...inviteData, name: e.target.value})}
                                    placeholder="F.eks. Kasper Hansen"
                                />
                            </div>
                            
                            <div className="input-group">
                                <label>E-mail adresse</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteData.email}
                                    onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                                    placeholder="kasper@firma.dk"
                                />
                            </div>

                            <div className="input-group">
                                <label>Telefon</label>
                                <BeautifulPhoneInput
                                    value={inviteData.phone}
                                    onChange={(val) => setInviteData({...inviteData, phone: val})}
                                    placeholder="12 34 56 78"
                                />
                            </div>

                            <div className="input-group" style={{ position: 'relative' }} ref={dropdownRef}>
                                <label>Rolle</label>
                                <div 
                                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                    style={{
                                        padding: '14px 20px',
                                        border: '1px solid var(--border)',
                                        borderRadius: '16px',
                                        fontSize: '0.95rem',
                                        color: 'var(--text-primary)',
                                        background: 'rgba(255, 255, 255, 0.6)',
                                        backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        userSelect: 'none',
                                        borderColor: isRoleDropdownOpen ? 'var(--border-focus)' : 'var(--border)',
                                        boxShadow: isRoleDropdownOpen ? '0 0 0 3px rgba(26, 26, 26, 0.06)' : 'none'
                                    }}
                                >
                                    <span style={{ fontWeight: '500' }}>
                                        {roles.find(r => r.value === inviteData.role)?.label || 'Vælg rolle'}
                                    </span>
                                    <ChevronDown 
                                        size={18} 
                                        style={{ 
                                            transform: isRoleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s ease',
                                            color: 'var(--text-secondary)'
                                        }} 
                                    />
                                </div>

                                <AnimatePresence>
                                    {isRoleDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 8px)',
                                                left: 0,
                                                right: 0,
                                                background: 'rgba(255, 255, 255, 0.98)',
                                                backdropFilter: 'blur(24px)',
                                                WebkitBackdropFilter: 'blur(24px)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '16px',
                                                boxShadow: 'var(--shadow-lg)',
                                                zIndex: 50,
                                                overflow: 'hidden',
                                                padding: '8px 0'
                                            }}
                                        >
                                            {roles.map((roleOption) => {
                                                const isSelected = inviteData.role === roleOption.value;
                                                const isHovered = hoveredRole === roleOption.value;
                                                return (
                                                    <div
                                                        key={roleOption.value}
                                                        onClick={() => {
                                                            setInviteData({ ...inviteData, role: roleOption.value });
                                                            setIsRoleDropdownOpen(false);
                                                        }}
                                                        onMouseEnter={() => setHoveredRole(roleOption.value)}
                                                        onMouseLeave={() => setHoveredRole(null)}
                                                        style={{
                                                            padding: '12px 20px',
                                                            cursor: 'pointer',
                                                            background: isSelected 
                                                                ? 'rgba(59, 130, 246, 0.08)' 
                                                                : isHovered 
                                                                    ? 'rgba(15, 23, 42, 0.04)' 
                                                                    : 'transparent',
                                                            transition: 'background 0.15s ease',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '2px'
                                                        }}
                                                    >
                                                        <span style={{ 
                                                            fontSize: '0.9rem', 
                                                            fontWeight: isSelected ? '600' : '500', 
                                                            color: isSelected ? '#2563eb' : 'var(--text-primary)' 
                                                        }}>
                                                            {roleOption.label}
                                                        </span>
                                                        <span style={{ 
                                                            fontSize: '0.75rem', 
                                                            color: isSelected ? 'rgba(37, 99, 235, 0.8)' : 'var(--text-secondary)' 
                                                        }}>
                                                            {roleOption.desc}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
                                    Projektledere ser kun egne leads. Bogholdere ser kun bekræftede opgaver. Svende og lærlinge kan registrere timer og se byggechecklister på sager.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isInviting || profile.tier !== 'enterprise'}
                                className={profile.tier !== 'enterprise' ? "btn-secondary" : "btn-primary"}
                                style={{ width: '100%', justifyContent: 'center', opacity: profile.tier !== 'enterprise' ? 0.6 : 1, cursor: profile.tier !== 'enterprise' ? 'not-allowed' : 'pointer' }}
                            >
                                {isInviting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                {profile.tier !== 'enterprise' ? 'Kræver Enterprise' : 'Opret Medarbejder'}
                            </button>
                        </form>
                    </div>
                </div>
                );

                if (isMobile && !isInviteModalOpen) return null;
                if (isMobile && isInviteModalOpen) {
                    return createPortal(
                        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setIsInviteModalOpen(false)}>
                            {card}
                        </div>,
                        document.body
                    );
                }
                return card;
            })()}

                {/* Team Liste */}
                <div className="team-list-column lg:col-span-2">
                    <div className="settings-card" style={{ overflow: 'visible' }}>
                        <div className="card-header">
                            <div className="icon-wrapper">
                                <HardHat size={24} />
                            </div>
                            <h3>Dine Medarbejdere ({team.length})</h3>
                        </div>
                        
                        <div className="card-body" style={{ padding: '0' }}>
                            {isLoading ? (
                                <div style={{ padding: '48px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <Loader2 className="animate-spin" size={32} />
                                </div>
                            ) : team.length === 0 ? (
                                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <HardHat size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                    <p>Du har ikke oprettet nogen medarbejdere endnu.</p>
                                </div>
                            ) : (
                                <div>
                                    {team.map((member) => {
                                        const isExpanded = expandedEmployee === member.id;
                                        
                                        // Beregn Projektleder-Statistikker
                                        const assignedLeads = leadsData.filter(l => l.assigned_to === member.id);
                                        const wonLeads = assignedLeads.filter(l => ['Bekræftet opgave', 'Historik'].includes(l.status));
                                        const lostLeads = assignedLeads.filter(l => ['Afvist', 'Fortrudt', 'Afbrudt Sag'].includes(l.status));
                                        const activeLeads = assignedLeads.filter(l => l.status === 'Sendt tilbud');
                                        
                                        const revenueWon = wonLeads.reduce((total, lead) => {
                                            const mat = parseFloat(lead.raw_data?.calc_data?.materialCost || 0);
                                            const labor = parseFloat(lead.raw_data?.calc_data?.laborCost || (lead.raw_data?.calc_data?.laborHours * lead.raw_data?.calc_data?.hourlyRate) || 0);
                                            return total + mat + labor;
                                        }, 0);

                                        const revenueActive = activeLeads.reduce((total, lead) => {
                                            const mat = parseFloat(lead.raw_data?.calc_data?.materialCost || 0);
                                            const labor = parseFloat(lead.raw_data?.calc_data?.laborCost || (lead.raw_data?.calc_data?.laborHours * lead.raw_data?.calc_data?.hourlyRate) || 0);
                                            return total + mat + labor;
                                        }, 0);

                                        // Worker metrics
                                        const workerActive = assignedLeads.filter(l => l.status === 'Bekræftet opgave');
                                        const workerCompleted = assignedLeads.filter(l => l.status === 'Historik');
                                        const isAdminOnly = ['admin'].includes(member.role);

                                        const thisMonth = new Date().getMonth();
                                        const thisYear = new Date().getFullYear();
                                        let monthHours = 0;
                                        assignedLeads.forEach(lead => {
                                            const entries = lead.raw_data?.time_entries || [];
                                            entries.forEach(entry => {
                                                if (entry.employeeId === member.id) {
                                                    const d = new Date(entry.date);
                                                    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
                                                        monthHours += parseFloat(entry.hours || 0);
                                                    }
                                                }
                                            });
                                        });
                                        const internalEntries = member.raw_data?.time_entries || [];
                                        internalEntries.forEach(entry => {
                                            const d = new Date(entry.date);
                                            if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
                                                monthHours += parseFloat(entry.hours || 0);
                                            }
                                        });

                                        return (
                                            <div key={member.id} className="flex flex-col" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                <div 
                                                    onClick={() => setExpandedEmployee(isExpanded ? null : member.id)}
                                                    className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                                                    style={{ background: isExpanded ? 'var(--surface-bg)' : 'transparent', transition: 'background 0.2s' }}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.125rem', flexShrink: 0 }}>
                                                            {member.owner_name?.charAt(0).toUpperCase() || 'M'}
                                                        </div>
                                                        <div>
                                                            <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px' }}>
                                                                {member.owner_name || 'Uden Navn'}
                                                                <span style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '9999px', background: 'var(--surface-bg)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                                                                    {getRoleLabel(member.role)}
                                                                </span>
                                                            </h4>
                                                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                                <a href={`mailto:${member.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 hover:text-blue-500 transition-colors" style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', width: 'fit-content' }}>
                                                                    <Mail size={14} color="#3b82f6" /> {member.email}
                                                                </a>
                                                                {member.phone && (
                                                                    <a href={`tel:${member.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 hover:text-green-600 transition-colors" style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', width: 'fit-content' }}>
                                                                        <Phone size={14} color="#10b981" /> {member.phone}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                                        <div className="text-right mr-4 hidden sm:block">
                                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', margin: '0 0 2px' }}>Tildelte opgaver</p>
                                                            <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{assignedLeads.length}</p>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2">
                                                            <div style={{ padding: '8px', color: 'var(--text-muted)' }}>
                                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            style={{ overflow: roleMenuFor === member.id ? 'visible' : 'hidden', background: 'var(--surface-bg)', borderTop: '1px solid var(--border-light)' }}
                                                        >
                                                            <div className="p-4 sm:p-6 pt-4 flex flex-col gap-4">
                                                                
                                                                {/* 1. Kompakt 2x2 Statistik-grid */}
                                                                {isAdminOnly ? (
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <Target size={18} color="#3b82f6" />
                                                                            <div>
                                                                                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{assignedLeads.length}</p>
                                                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Tildelt</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <TrendingUp size={18} color="#10b981" />
                                                                            <div>
                                                                                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981', margin: 0, lineHeight: 1 }}>{wonLeads.length}</p>
                                                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Vundne</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <DollarSign size={18} color="#8b5cf6" />
                                                                            <div>
                                                                                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#8b5cf6', margin: 0, lineHeight: 1 }}>{revenueWon > 1000000 ? (revenueWon/1000000).toFixed(1) + 'M' : revenueWon > 1000 ? (revenueWon/1000).toFixed(0) + 'k' : revenueWon}</p>
                                                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Omsat</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <Briefcase size={18} color="#f59e0b" />
                                                                            <div>
                                                                                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f59e0b', margin: 0, lineHeight: 1 }}>{activeLeads.length}</p>
                                                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Tilbud</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <Target size={18} color="#3b82f6" />
                                                                            <div>
                                                                                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{assignedLeads.length}</p>
                                                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Opgaver</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <Briefcase size={18} color="#f59e0b" />
                                                                            <div>
                                                                                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f59e0b', margin: 0, lineHeight: 1 }}>{workerActive.length}</p>
                                                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>I gang</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <TrendingUp size={18} color="#10b981" />
                                                                            <div>
                                                                                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981', margin: 0, lineHeight: 1 }}>{workerCompleted.length}</p>
                                                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Færdige</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <Clock size={18} color="#8b5cf6" />
                                                                            <div>
                                                                                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#8b5cf6', margin: 0, lineHeight: 1 }}>{monthHours.toFixed(0)}</p>
                                                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Timer (md)</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* 2 & 3. Rolle og HR side-om-side komprimeret */}
                                                                {isAdmin && (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ position: 'relative', zIndex: roleMenuFor === member.id ? 50 : 1 }}>
                                                                        {/* Rolle */}
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'visible', zIndex: roleMenuFor === member.id ? 100 : 1, transition: 'all 0.2s', borderRadius: '16px' }}>
                                                                            <div className="flex items-center gap-2">
                                                                                <Shield size={16} color="#7c3aed" />
                                                                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>Rolle</span>
                                                                            </div>
                                                                            <div onClick={() => setRoleMenuFor(roleMenuFor === member.id ? null : member.id)}
                                                                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s' }}
                                                                                onMouseEnter={(e) => e.currentTarget.style.background = '#fff'}
                                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.7)'}>
                                                                                {getRoleLabel(member.role)}
                                                                                <ChevronDown size={14} style={{ transform: roleMenuFor === member.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                                                            </div>
                                                                            
                                                                            <AnimatePresence>
                                                                                {roleMenuFor === member.id && (
                                                                                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                                                                        style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: '280px', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, padding: '6px' }}>
                                                                                        {roles.map(r => {
                                                                                            const selected = member.role === r.value;
                                                                                            return (
                                                                                                <div key={r.value} onClick={() => handleRoleSelect(member, r.value)} className="group"
                                                                                                    style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: selected ? '#f5f3ff' : 'transparent', display: 'flex', flexDirection: 'column', gap: '2px', transition: 'background 0.2s' }}>
                                                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                                        <span style={{ fontSize: '0.85rem', fontWeight: selected ? '700' : '600', color: selected ? '#6d28d9' : 'var(--text-primary)' }}>{r.label}</span>
                                                                                                        {selected && <span style={{ color: '#6d28d9', fontSize: '0.8rem' }}>✓</span>}
                                                                                                    </div>
                                                                                                    {r.desc && (
                                                                                                        <span style={{ fontSize: '0.7rem', color: selected ? '#8b5cf6' : 'var(--text-muted)', lineHeight: '1.3' }}>{r.desc}</span>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>

                                                                        {/* Indstillinger (Ferie & Lønnummer) */}
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center' }}>
                                                                            <div className="flex flex-col gap-2 w-full">
                                                                                <div className="flex items-center justify-between w-full">
                                                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600"><Briefcase size={12}/> Feriedage</div>
                                                                                    <input type="number" min="0" max="100" value={member.raw_data?.vacation_quota ?? 30} onChange={(e) => handleVacationQuotaUpdate(member.id, member.raw_data || {}, e.target.value)}
                                                                                        style={{ width: '60px', padding: '2px 4px', borderRadius: '6px', border: '1px solid var(--border)', background: '#fff', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
                                                                                </div>
                                                                                <div className="flex items-center justify-between w-full">
                                                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600"><Hash size={12}/> Lønnummer</div>
                                                                                    <input type="text" placeholder="Eks. 1001" value={member.raw_data?.lonnummer ?? ''} onChange={(e) => handleLonnummerInput(member.id, e.target.value)} onBlur={(e) => handleLonnummerBlur(member)}
                                                                                        style={{ width: '80px', padding: '2px 4px', borderRadius: '6px', border: '1px solid var(--border)', background: '#fff', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* 4. Noter og Privatinfo */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    {/* Private oplysninger */}
                                                                    <div className="glass-panel" style={{ padding: '12px' }}>
                                                                        <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-2">
                                                                            <MapPin size={14} color="#3b82f6" />
                                                                            <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Privat Data</span>
                                                                        </div>
                                                                        {(member.raw_data?.home_address || member.raw_data?.home_zip || member.raw_data?.home_city || member.raw_data?.next_of_kin) ? (
                                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                {member.raw_data?.home_address && <span>{member.raw_data.home_address}, {[member.raw_data?.home_zip, member.raw_data?.home_city].filter(Boolean).join(' ')}</span>}
                                                                                {member.raw_data?.next_of_kin && <span style={{ color: 'var(--text-muted)' }}>Pårørende: {member.raw_data.next_of_kin}</span>}
                                                                            </div>
                                                                        ) : (
                                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ikke udfyldt endnu.</span>
                                                                        )}
                                                                    </div>

                                                                    {/* Noter (Mester kun) */}
                                                                    {isAdmin && (
                                                                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', borderRadius: '16px' }}>
                                                                            <div className="flex items-center justify-between mb-2 border-b border-gray-100 pb-2">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Shield size={14} color="#10b981" />
                                                                                    <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Leder-Noter</span>
                                                                                </div>
                                                                                <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>Skjult</span>
                                                                            </div>
                                                                            <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                {(member.raw_data?.hr_notes || []).length === 0 ? (
                                                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ingen noter.</span>
                                                                                ) : (
                                                                                    (member.raw_data?.hr_notes || []).map(note => (
                                                                                        <div key={note.id} className="group" style={{ fontSize: '0.8rem', padding: '6px 8px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                                                            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1, lineHeight: '1.4' }}>{note.text}</span>
                                                                                            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer text-red-500 flex-shrink-0 mt-0.5 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteNote(member.id, member.raw_data || {}, note.id); }} />
                                                                                        </div>
                                                                                    ))
                                                                                )}
                                                                            </div>
                                                                            <div className="flex gap-2 mt-auto items-end">
                                                                                <textarea value={newNoteText} 
                                                                                    onChange={(e) => {
                                                                                        setNewNoteText(e.target.value);
                                                                                        e.target.style.height = 'auto';
                                                                                        e.target.style.height = (e.target.scrollHeight) + 'px';
                                                                                    }} 
                                                                                    onKeyDown={(e) => { 
                                                                                        if (e.key === 'Enter' && !e.shiftKey) { 
                                                                                            e.preventDefault(); 
                                                                                            if (newNoteText.trim()) handleAddNote(member.id, member.raw_data || {}); 
                                                                                        } 
                                                                                    }} 
                                                                                    placeholder="Skriv note (Enter for at gemme)..."
                                                                                    rows={1}
                                                                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.8rem', outline: 'none', resize: 'none', overflow: 'hidden', minHeight: '34px', lineHeight: '1.4', background: '#f8fafc', transition: 'border-color 0.2s' }} 
                                                                                    onFocus={(e) => e.currentTarget.style.borderColor = '#10b981'}
                                                                                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                                                                />
                                                                                <button onClick={() => handleAddNote(member.id, member.raw_data || {})} disabled={!newNoteText.trim()} style={{ padding: '8px 12px', height: '34px', borderRadius: '10px', background: newNoteText.trim() ? '#10b981' : 'var(--border-light)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', cursor: newNoteText.trim() ? 'pointer' : 'default', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* 5. Slet/Deaktiver (Skraldespand) */}
                                                                {isAdmin && (
                                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                                                                        <button 
                                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRemoveTarget(member); }}
                                                                            style={{ padding: '14px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'; }}
                                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'none'; }}
                                                                            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                                                                            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'; }}
                                                                            title="Slet eller deaktiver medarbejder">
                                                                            <Trash2 size={20} style={{ pointerEvents: 'none' }} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Underleverandører (eksterne partnere uden login) */}
            <SubcontractorManager profile={profile} isMobile={isMobile} />

            {/* ---- BEKRÆFT ADMIN-FORFREMMELSE ---- */}
            {pendingPromo && createPortal(
                <AnimatePresence>
                    <motion.div key="promo-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPendingPromo(null)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '20px', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            <div style={{ padding: '28px', textAlign: 'center' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                                    <Shield size={30} />
                                </div>
                                <h3 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Gør til Mester (Admin)?</h3>
                                <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                    <strong>{pendingPromo.member.owner_name || 'Medarbejderen'}</strong> får <strong>fuld adgang</strong> til priser, økonomi, systemindstillinger og kan selv administrere andre medarbejdere. Er du sikker?
                                </p>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                    <button onClick={() => setPendingPromo(null)} disabled={actionBusy}
                                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Annullér</button>
                                    <button onClick={() => doRoleChange(pendingPromo.member, pendingPromo.role)} disabled={actionBusy}
                                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: '#fff', fontWeight: 700, cursor: actionBusy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        {actionBusy ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />} Ja, gør til Mester
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>, document.body
            )}

            {/* ---- FJERN MEDARBEJDER (deaktivér / slet) ---- */}
            {removeTarget && createPortal(
                <AnimatePresence>
                    <motion.div key="remove-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !actionBusy && setRemoveTarget(null)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', maxWidth: '460px', background: '#fff', borderRadius: '20px', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            <div style={{ padding: '28px' }}>
                                <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Fjern {removeTarget.owner_name || 'medarbejder'}?</h3>
                                <p style={{ margin: '0 0 20px', color: '#475569', fontSize: '0.92rem', lineHeight: 1.5 }}>Vælg hvordan medarbejderen skal fjernes:</p>

                                <button onClick={() => doRemove('deactivate')} disabled={actionBusy}
                                    style={{ width: '100%', textAlign: 'left', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: actionBusy ? 'wait' : 'pointer', marginBottom: '12px', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { if (!actionBusy) { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; } }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}>
                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Deaktivér (anbefalet)</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Fjerner login-adgang, men beholder profil og historik til genansættelse.</div>
                                </button>

                                <button onClick={() => doRemove('delete')} disabled={actionBusy}
                                    style={{ width: '100%', textAlign: 'left', padding: '16px', borderRadius: '14px', border: '1px solid #fee2e2', background: '#fff', cursor: actionBusy ? 'wait' : 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { if (!actionBusy) { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; } }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#fee2e2'; e.currentTarget.style.background = '#fff'; }}>
                                    <div style={{ fontWeight: 700, color: '#b91c1c' }}>Slet helt (GDPR)</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Sletter login og persondata (adresse, pårørende). Løn-/timehistorik bevares lovpligtigt.</div>
                                </button>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                                    <button onClick={() => setRemoveTarget(null)} disabled={actionBusy}
                                        style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Annullér</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>, document.body
            )}
        </div>
    );
};

export default TeamManagement;
