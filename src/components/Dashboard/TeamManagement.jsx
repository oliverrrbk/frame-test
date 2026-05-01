import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { UserPlus, Users, Trash2, Mail, Briefcase, Phone, Loader2, TrendingUp, Target, DollarSign, ChevronDown, ChevronUp, Shield } from 'lucide-react';
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
        <div className="space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="text-blue-600" />
                    Team & Medarbejdere
                </h2>
                <p className="text-slate-500 mt-1">
                    Administrer adgang for sælgere og projektledere i din virksomhed.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Inviter Medarbejder Formular */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sticky top-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <UserPlus size={20} className="text-blue-500" />
                            Tilføj Medarbejder
                        </h3>
                        
                        {successMsg && (
                            <div className="mb-4 p-4 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-xl text-sm border border-green-200 dark:border-green-500/20">
                                {successMsg}
                            </div>
                        )}
                        
                        {errorMsg && (
                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-500/20">
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Fulde Navn
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={inviteData.name}
                                    onChange={(e) => setInviteData({...inviteData, name: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                    placeholder="F.eks. Kasper Sælger"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    E-mail adresse
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={inviteData.email}
                                    onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                    placeholder="kasper@firma.dk"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Telefon
                                </label>
                                <input
                                    type="tel"
                                    value={inviteData.phone}
                                    onChange={(e) => setInviteData({...inviteData, phone: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                    placeholder="12 34 56 78"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Rolle
                                </label>
                                <select
                                    value={inviteData.role}
                                    onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                >
                                    <option value="sales">Sælger / Projektleder</option>
                                    <option value="accountant">Bogholder / Sekretær</option>
                                    <option value="admin">Admin (Lige rettigheder som dig)</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-2">
                                    Sælgere ser kun egne leads. Bogholdere ser kun bekræftede opgaver.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isInviting || profile.tier !== 'enterprise'}
                                className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-white font-medium transition-colors ${
                                    profile.tier !== 'enterprise' 
                                    ? 'bg-slate-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {isInviting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                {profile.tier !== 'enterprise' ? 'Kræver Enterprise' : 'Opret Medarbejder'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Team Liste */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Dine Medarbejdere ({team.length})</h3>
                        </div>
                        
                        <div className="p-0">
                            {isLoading ? (
                                <div className="p-12 flex justify-center text-slate-400">
                                    <Loader2 className="animate-spin" size={32} />
                                </div>
                            ) : team.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>Du har ikke oprettet nogen medarbejdere endnu.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
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
                                            <div key={member.id} className="flex flex-col border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                <div 
                                                    onClick={() => setExpandedEmployee(isExpanded ? null : member.id)}
                                                    className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
                                                            {member.owner_name?.charAt(0).toUpperCase() || 'M'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                                {member.owner_name || 'Uden Navn'}
                                                                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                                    {member.role === 'admin' ? 'Admin' : member.role === 'accountant' ? 'Bogholder' : 'Sælger'}
                                                                </span>
                                                            </h4>
                                                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-1 text-sm text-slate-500">
                                                                <span className="flex items-center gap-1"><Mail size={14} /> {member.email}</span>
                                                                {member.phone && <span className="flex items-center gap-1"><Phone size={14} /> {member.phone}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                                        <div className="text-right mr-4 hidden sm:block">
                                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tildelte opgaver</p>
                                                            <p className="font-bold text-slate-900 dark:text-white">{assignedLeads.length}</p>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleRemove(member.id); }}
                                                                className="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                                title="Fjern medarbejder"
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
                                                            <div className="p-2 text-slate-400">
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
                                                            className="overflow-hidden bg-slate-50/50 dark:bg-slate-800/30"
                                                        >
                                                            <div className="p-6 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                                        <Target size={16} className="text-blue-500" />
                                                                        <h5 className="text-sm font-semibold uppercase tracking-wider">Samlet Tildelt</h5>
                                                                    </div>
                                                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{assignedLeads.length} <span className="text-sm font-normal text-slate-500">leads</span></p>
                                                                </div>

                                                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                                        <TrendingUp size={16} className="text-emerald-500" />
                                                                        <h5 className="text-sm font-semibold uppercase tracking-wider">Lukkerate</h5>
                                                                    </div>
                                                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                                        {wonLeads.length} <span className="text-sm font-normal text-slate-500">vundne</span>
                                                                    </p>
                                                                    <p className="text-xs text-red-400 mt-1">{lostLeads.length} tabte</p>
                                                                </div>

                                                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                                        <DollarSign size={16} className="text-purple-500" />
                                                                        <h5 className="text-sm font-semibold uppercase tracking-wider">Vundet Omsætning</h5>
                                                                    </div>
                                                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                                        {revenueWon.toLocaleString('da-DK')} <span className="text-sm font-normal">kr.</span>
                                                                    </p>
                                                                </div>

                                                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                                        <Briefcase size={16} className="text-amber-500" />
                                                                        <h5 className="text-sm font-semibold uppercase tracking-wider">Aktive Tilbud</h5>
                                                                    </div>
                                                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                                                        {revenueActive.toLocaleString('da-DK')} <span className="text-sm font-normal">kr.</span>
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 mt-1">{activeLeads.length} afventende</p>
                                                                </div>
                                                            </div>

                                                            {/* INDIVIDUELLE RETTIGHEDER */}
                                                            <div className="px-6 pb-6 mt-4">
                                                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                                                                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                                                                        <Shield size={18} className="text-blue-500" />
                                                                        <h5 className="font-semibold text-slate-900 dark:text-white">Individuelle Adgangsrettigheder</h5>
                                                                        <span className="text-xs text-slate-500 ml-2">(Overskriver standard-rolle)</span>
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
                                                                                        className={`mt-0.5 w-10 h-5 flex shrink-0 items-center rounded-full p-1 cursor-pointer transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                                                    >
                                                                                        <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${isEnabled ? 'translate-x-4.5' : ''}`} style={{ transform: isEnabled ? 'translateX(18px)' : 'translateX(0)' }} />
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{perm.label}</p>
                                                                                        <p className="text-xs text-slate-500">{perm.desc}</p>
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
