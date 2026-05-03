import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { UserPlus, Users, Trash2, Mail, Briefcase, Phone, Loader2, TrendingUp, Target, DollarSign, ChevronDown, ChevronUp, Shield, HardHat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

        // DB update
        const { error } = await supabase
            .from('carpenters')
            .update({ permissions: updatedPermissions })
            .eq('id', employeeId);
            
        if (error) {
            console.error("Kunne ikke opdatere rettighed:", error);
            fetchTeam();
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setIsInviting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const response = await fetch('/api/invite-employee', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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
                // Sikr at requires_password_change står til true i databasen for den nye bruger, så de får pop-uppen!
                await supabase.from('carpenters').update({ requires_password_change: true }).eq('email', inviteData.email);
                
                setSuccessMsg(`Medarbejder oprettet! Der er automatisk sendt en velkomstmail med login-oplysninger.`);
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

    const handleRemove = async (employeeId) => {
        if (!window.confirm("Er du sikker på, at du vil fjerne denne medarbejder? De mister adgang til systemet.")) return;
        
        // I en rigtig app bør vi også slette dem fra Auth (kræver backend Service Role), 
        // men som minimum kan vi slette profilen eller fjerne deres company_id
        const { error } = await supabase
            .from('carpenters')
            .delete()
            .eq('id', employeeId);
            
        if (!error) {
            fetchTeam();
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Inviter Medarbejder Formular */}
                <div className="lg:col-span-1">
                    <div className="settings-card sticky top-6">
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
                                    placeholder="F.eks. Kasper Sælger"
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
                                <input
                                    type="tel"
                                    value={inviteData.phone}
                                    onChange={(e) => setInviteData({...inviteData, phone: e.target.value})}
                                    placeholder="12 34 56 78"
                                />
                            </div>

                            <div className="input-group">
                                <label>Rolle</label>
                                <select
                                    value={inviteData.role}
                                    onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                                >
                                    <option value="sales">Sælger / Projektleder</option>
                                    <option value="accountant">Bogholder / Sekretær</option>
                                    <option value="admin">Admin (Lige rettigheder som dig)</option>
                                </select>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
                                    Sælgere ser kun egne leads. Bogholdere ser kun bekræftede opgaver.
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
                <div className="lg:col-span-2">
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
                                        
                                        // Beregn Sælger-Statistikker
                                        const assignedLeads = leadsData.filter(l => l.assigned_to === member.id);
                                        const wonLeads = assignedLeads.filter(l => ['Bekræftet opgave', 'Historik'].includes(l.status));
                                        const lostLeads = assignedLeads.filter(l => ['Afvist', 'Fortrudt'].includes(l.status));
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
                                                                    {member.role === 'admin' ? 'Admin' : member.role === 'accountant' ? 'Bogholder' : 'Sælger'}
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
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleRemove(member.id); }}
                                                                style={{ padding: '8px', borderRadius: '8px', color: '#ef4444', transition: 'background 0.2s' }}
                                                                className="hover:bg-red-50"
                                                                title="Fjern medarbejder"
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
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
                                                                            { key: 'view_all_leads', label: 'Se ALLE firmaets leads', desc: 'Hvis slået fra, ser sælgere kun egne, og bogholdere kun bekræftede.' },
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
        </div>
    );
};

export default TeamManagement;
