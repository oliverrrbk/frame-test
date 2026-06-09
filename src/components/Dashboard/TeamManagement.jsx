import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { UserPlus, Users, Trash2, Mail, Briefcase, Phone, Loader2, TrendingUp, Target, DollarSign, ChevronDown, ChevronUp, Shield, HardHat, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { SubcontractorManager, BeautifulPhoneInput } from './Subcontractors';
import { isValidLonnummer, nextLonnummer } from '../../utils/payroll';

const roles = [
    { value: 'sales', label: 'Projektleder', desc: 'Ser kun egne leads og opretter tilbud.' },
    { value: 'worker', label: 'Tømrersvend', desc: 'Kan registrere timer og se checklister.' },
    { value: 'apprentice', label: 'Tømrerlærling', desc: 'Registrerer egne timer på sager.' },
    { value: 'accountant', label: 'Bogholder / Sekretær', desc: 'Godkender timer og ser økonomisk bogføring.' },
    { value: 'admin', label: 'Mester (Administrator)', desc: 'Fuld adgang til priser og systemindstillinger.' }
];

const getRoleLabel = (role) => {
    switch (role) {
        case 'admin': return 'Mester';
        case 'sales': return 'Projektleder';
        case 'worker': return 'Tømrersvend';
        case 'apprentice': return 'Tømrerlærling';
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

    // Kald det sikre backend-endpoint (auth-header + service-role server-side)
    const callManage = async (action, payload) => {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/manage-employee', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
            },
            body: JSON.stringify({ action, ...payload })
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || 'Handlingen mislykkedes.');
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
            await callManage(mode === 'delete' ? 'delete' : 'deactivate', { employeeId: removeTarget.id });
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
                {/* Inviter Medarbejder Formular */}
                <div className="team-invite-column lg:col-span-1" style={{ position: 'relative', zIndex: 30 }}>
                    <div className="settings-card sticky top-6" style={{ overflow: 'visible' }}>
                        <div className="card-header">
                            <div className="icon-wrapper">
                                <UserPlus size={24} />
                            </div>
                            <h3>Tilføj Medarbejder</h3>
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
                </div>

                {/* Team Liste */}
                <div className="team-list-column lg:col-span-2">
                    <div className="settings-card">
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
                                                                <span className="flex items-center gap-1"><Mail size={14} /> {member.email}</span>
                                                                {member.phone && <span className="flex items-center gap-1"><Phone size={14} /> {member.phone}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                                        <div className="text-right mr-4 hidden sm:block">
                                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', margin: '0 0 2px' }}>Tildelte opgaver</p>
                                                            <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{assignedLeads.length}</p>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2">
                                                            {isAdmin && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setRemoveTarget(member); }}
                                                                    style={{ padding: '8px', borderRadius: '8px', color: '#ef4444', transition: 'background 0.2s' }}
                                                                    className="hover:bg-red-50"
                                                                    title="Fjern medarbejder"
                                                                >
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            )}
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
                                                            style={{ overflow: 'hidden', background: 'var(--surface-bg)', borderTop: '1px solid var(--border-light)' }}
                                                        >
                                                            <div className="p-6 pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                <div className="glass-panel" style={{ padding: '16px' }}>
                                                                    <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                                        <Target size={16} color="#3b82f6" />
                                                                        <h5 style={{ fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Samlet Tildelt</h5>
                                                                    </div>
                                                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{assignedLeads.length} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>leads</span></p>
                                                                </div>

                                                                <div className="glass-panel" style={{ padding: '16px' }}>
                                                                    <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                                        <TrendingUp size={16} color="#10b981" />
                                                                        <h5 style={{ fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Lukkerate</h5>
                                                                    </div>
                                                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', margin: 0 }}>
                                                                        {wonLeads.length} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>vundne</span>
                                                                    </p>
                                                                    <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '4px 0 0' }}>{lostLeads.length} tabte</p>
                                                                </div>

                                                                <div className="glass-panel" style={{ padding: '16px' }}>
                                                                    <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                                        <DollarSign size={16} color="#8b5cf6" />
                                                                        <h5 style={{ fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Vundet Omsætning</h5>
                                                                    </div>
                                                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6', margin: 0 }}>
                                                                        {revenueWon.toLocaleString('da-DK')} <span style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>kr.</span>
                                                                    </p>
                                                                </div>

                                                                <div className="glass-panel" style={{ padding: '16px' }}>
                                                                    <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                                        <Briefcase size={16} color="#f59e0b" />
                                                                        <h5 style={{ fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Aktive Tilbud</h5>
                                                                    </div>
                                                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
                                                                        {revenueActive.toLocaleString('da-DK')} <span style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>kr.</span>
                                                                    </p>
                                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>{activeLeads.length} afventende</p>
                                                                </div>
                                                            </div>

                                                            {/* ROLLE (kun admin/Mester kan ændre) */}
                                                            {isAdmin && (
                                                                <div className="px-6 pb-2">
                                                                    <div className="glass-panel" style={{ padding: '24px' }}>
                                                                        <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                                                                            <Shield size={18} color="#7c3aed" />
                                                                            <h5 style={{ fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Rolle</h5>
                                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>Bestemmer personens adgang i systemet</span>
                                                                        </div>
                                                                        <div style={{ position: 'relative', maxWidth: '380px' }}>
                                                                            <div onClick={() => setRoleMenuFor(roleMenuFor === member.id ? null : member.id)}
                                                                                style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.7)', transition: 'all 0.2s' }}>
                                                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                    {member.role === 'admin' && <Shield size={15} color="#7c3aed" />}{getRoleLabel(member.role)}
                                                                                </span>
                                                                                <ChevronDown size={18} style={{ transform: roleMenuFor === member.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-secondary)' }} />
                                                                            </div>
                                                                            <AnimatePresence>
                                                                                {roleMenuFor === member.id && (
                                                                                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.15 }}
                                                                                        style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', zIndex: 40, overflow: 'hidden', padding: '8px' }}>
                                                                                        {roles.map(r => {
                                                                                            const selected = member.role === r.value;
                                                                                            return (
                                                                                                <div key={r.value} onClick={() => handleRoleSelect(member, r.value)}
                                                                                                    style={{ padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', background: selected ? '#f5f3ff' : 'transparent', display: 'flex', flexDirection: 'column', gap: '2px', transition: 'background 0.12s' }}
                                                                                                    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = '#f8fafc'; }}
                                                                                                    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}>
                                                                                                    <span style={{ fontWeight: selected ? 700 : 600, color: selected ? '#6d28d9' : 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                                        {r.value === 'admin' && <Shield size={13} />}{r.label}{selected && ' ✓'}
                                                                                                    </span>
                                                                                                    <span style={{ fontSize: '0.75rem', color: selected ? 'rgba(109,40,217,0.8)' : 'var(--text-secondary)' }}>{r.desc}</span>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* INDIVIDUELLE RETTIGHEDER */}
                                                            <div className="px-6 pb-6">
                                                                <div className="glass-panel" style={{ padding: '24px' }}>
                                                                    <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                                                                        <Shield size={18} color="#3b82f6" />
                                                                        <h5 style={{ fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Individuelle Adgangsrettigheder</h5>
                                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>(Overskriver standard-rolle)</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {[
                                                                            { key: 'view_all_leads', label: 'Se ALLE firmaets leads', desc: 'Hvis slået fra, ser projektledere kun egne, og bogholdere kun bekræftede.' },
                                                                            { key: 'view_pricing', label: 'Adgang til Prisberegner', desc: 'Giver adgang til avancerede indstillinger og avancer.' },
                                                                            { key: 'view_materials', label: 'Adgang til Materialer', desc: 'Kan oprette og redigere materialer og priser.' },
                                                                            { key: 'view_integrations', label: 'Integrationer', desc: 'Må opsætte og bruge e-conomic / Dinero integrationer.' }
                                                                        ].map(perm => {
                                                                            const isEnabled = !!member.permissions?.[perm.key];
                                                                            return (
                                                                                <div key={perm.key} className="flex items-start gap-3">
                                                                                    <div 
                                                                                        onClick={(e) => { e.stopPropagation(); handlePermissionToggle(member.id, member.permissions || {}, perm.key); }}
                                                                                        style={{ width: '40px', height: '20px', borderRadius: '9999px', padding: '2px', cursor: 'pointer', transition: 'background 0.2s', background: isEnabled ? '#3b82f6' : 'var(--border-light)', flexShrink: 0, marginTop: '2px' }}
                                                                                    >
                                                                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transform: isEnabled ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
                                                                                    </div>
                                                                                    <div>
                                                                                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)', margin: '0 0 2px' }}>{perm.label}</p>
                                                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{perm.desc}</p>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* PERSONALE ADMINISTRATION */}
                                                            <div className="px-6 pb-6">
                                                                <div className="glass-panel" style={{ padding: '24px' }}>
                                                                    <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                                                                        <Briefcase size={18} color="#f59e0b" />
                                                                        <h5 style={{ fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Personale & HR Indstillinger</h5>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div className="flex items-center justify-between gap-4 p-3 rounded-2xl" style={{ border: '1px solid var(--border-light)', background: 'rgba(255, 255, 255, 0.5)' }}>
                                                                            <div style={{ flex: 1 }}>
                                                                                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>Årlig Feriesaldo (Dage)</p>
                                                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Hvor mange betalte feriedage har personen ret til?</p>
                                                                            </div>
                                                                            <div style={{ position: 'relative' }}>
                                                                                <input 
                                                                                    type="number" 
                                                                                    min="0"
                                                                                    max="100"
                                                                                    value={member.raw_data?.vacation_quota ?? 30}
                                                                                    onChange={(e) => handleVacationQuotaUpdate(member.id, member.raw_data || {}, e.target.value)}
                                                                                    style={{
                                                                                        width: '80px',
                                                                                        padding: '10px 12px',
                                                                                        borderRadius: '12px',
                                                                                        border: '2px solid transparent',
                                                                                        background: 'var(--surface-bg)',
                                                                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05)',
                                                                                        fontSize: '1.05rem',
                                                                                        fontWeight: '700',
                                                                                        color: '#3b82f6',
                                                                                        textAlign: 'center',
                                                                                        transition: 'all 0.2s ease',
                                                                                        outline: 'none'
                                                                                    }}
                                                                                    onFocus={(e) => {
                                                                                        e.target.style.borderColor = '#3b82f6';
                                                                                        e.target.style.background = '#fff';
                                                                                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                                                                    }}
                                                                                    onBlur={(e) => {
                                                                                        e.target.style.borderColor = 'transparent';
                                                                                        e.target.style.background = 'var(--surface-bg)';
                                                                                        e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05)';
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center justify-between gap-4 p-3 rounded-2xl" style={{ border: '1px solid var(--border-light)', background: 'rgba(255, 255, 255, 0.5)' }}>
                                                                            <div style={{ flex: 1 }}>
                                                                                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>Lønnummer / Medarbejdernr.</p>
                                                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Bruges i løneksporten til lønsystemet.</p>
                                                                            </div>
                                                                            <input
                                                                                type="text"
                                                                                value={member.raw_data?.lonnummer ?? ''}
                                                                                placeholder="f.eks. 1001"
                                                                                inputMode="numeric"
                                                                                onChange={(e) => handleLonnummerInput(member.id, e.target.value)}
                                                                                style={{
                                                                                    width: '110px',
                                                                                    padding: '10px 12px',
                                                                                    borderRadius: '12px',
                                                                                    border: '2px solid transparent',
                                                                                    background: 'var(--surface-bg)',
                                                                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05)',
                                                                                    fontSize: '1.05rem',
                                                                                    fontWeight: '700',
                                                                                    color: '#7c3aed',
                                                                                    textAlign: 'center',
                                                                                    transition: 'all 0.2s ease',
                                                                                    outline: 'none'
                                                                                }}
                                                                                onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'; }}
                                                                                onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'var(--surface-bg)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05)'; handleLonnummerBlur(member); }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Private oplysninger — selv-indtastet af medarbejderen under "Min Profil" */}
                                                                    {(member.raw_data?.home_address || member.raw_data?.home_zip || member.raw_data?.home_city || member.raw_data?.next_of_kin) ? (
                                                                        <div style={{ marginTop: '16px', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.5)' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                                                                <MapPin size={15} style={{ color: '#7c3aed' }} />
                                                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Private oplysninger</span>
                                                                            </div>
                                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                                                {member.raw_data?.home_address && <div><span style={{ color: 'var(--text-muted)' }}>Adresse:</span> {member.raw_data.home_address}</div>}
                                                                                {(member.raw_data?.home_zip || member.raw_data?.home_city) && <div><span style={{ color: 'var(--text-muted)' }}>By:</span> {[member.raw_data?.home_zip, member.raw_data?.home_city].filter(Boolean).join(' ')}</div>}
                                                                                {member.raw_data?.next_of_kin && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Nærmeste pårørende:</span> {member.raw_data.next_of_kin}</div>}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '12px', border: '1px dashed var(--border-light)', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                                            Medarbejderen har endnu ikke udfyldt sine private oplysninger (adresse, pårørende) under "Min Profil".
                                                                        </div>
                                                                    )}
                                                                </div>
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
            <SubcontractorManager profile={profile} />

            {/* ---- BEKRÆFT ADMIN-FORFREMMELSE ---- */}
            <AnimatePresence>
                {pendingPromo && createPortal(
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPendingPromo(null)}
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
                    </motion.div>, document.body
                )}
            </AnimatePresence>

            {/* ---- FJERN MEDARBEJDER (deaktivér / slet) ---- */}
            <AnimatePresence>
                {removeTarget && createPortal(
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !actionBusy && setRemoveTarget(null)}
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
                    </motion.div>, document.body
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeamManagement;
