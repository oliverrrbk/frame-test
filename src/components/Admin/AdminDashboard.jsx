import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, Shield, Users, Power, Lock, CheckCircle, ExternalLink, Copy, FileText, X, Trash2, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AiTrainingView from '../Dashboard/AiTrainingView';

const AdminDashboard = () => {
    const [carpenters, setCarpenters] = useState([]);
    const [leads, setLeads] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedCarpenterData, setSelectedCarpenterData] = useState(null);
    const [activeTab, setActiveTab] = useState('carpenters');
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null });

    const [expandedCompanies, setExpandedCompanies] = useState({});

    useEffect(() => {
        const loadAll = async () => {
            await Promise.all([fetchCarpenters(), fetchLeads()]);
            setIsLoading(false);
        };
        loadAll();
    }, []);

    const fetchCarpenters = async () => {
        try {
            const { data, error } = await supabase.from('carpenters').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            
            // Grupper medarbejdere under deres virksomhed og skjul Super Admin brugeren selv fra listen
            const companyList = data.filter(c => !c.company_id && c.email !== 'team@bisoncompany.dk');
            const employees = data.filter(c => c.company_id);
            
            const companiesWithTeam = companyList.map(comp => ({
                ...comp,
                team: employees.filter(e => e.company_id === comp.id)
            }));
            
            setCarpenters(companiesWithTeam);
        } catch (err) {
            console.error("Admin fetch error:", err);
            toast.error("Fejl ved indlæsning af tømrere (Er du logget ind?)");
        }
    };

    const toggleCompanyExpanded = (companyId) => {
        setExpandedCompanies(prev => ({
            ...prev,
            [companyId]: !prev[companyId]
        }));
    };

    const fetchLeads = async () => {
        try {
            const { data, error } = await supabase.from('leads').select('*');
            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error("Leads fetch error:", err);
        }
    };

    const toggleActiveStatus = async (id, currentStatus) => {
        setConfirmDialog({
            isOpen: true,
            title: currentStatus ? 'Lås Konto' : 'Lås Konto Op',
            message: `Er du sikker på du vil ${currentStatus ? 'låse' : 'åbne'} denne konto?`,
            type: 'warning',
            onConfirm: async () => {
                setIsUpdating(true);
                try {
                    const { error } = await supabase.from('carpenters').update({ is_active: !currentStatus }).eq('id', id);
                    if (error) throw error;
                    setCarpenters(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
                    toast.success(currentStatus ? 'Konto er nu låst.' : 'Konto er nu åbnet.');
                } catch (err) {
                    console.error("Fejl:", err);
                    toast.error("Kunne ikke ændre status.");
                } finally {
                    setIsUpdating(false);
                }
            }
        });
    };
    
    const deleteCarpenter = async (id, name, email) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Slet Firma Permanent',
            message: `Er du 100% sikker på, at du vil slette firmaet "${name || 'Uden Navn'}" helt fra systemet?\n\nDette fjerner alt login, portal, materialer og tilbud permanent. Handlingen kan IKKE fortrydes!`,
            type: 'danger',
            onConfirm: async () => {
                setIsUpdating(true);
                try {
                    if (email === 'team@bisoncompany.dk') {
                        // Pas på: Vi må ikke slette Admin-brugeren fra Auth! Vi sletter kun tabellerne.
                        const { error } = await supabase.from('carpenters').delete().eq('id', id);
                        if (error) throw error;
                    } else {
                        const { data, error } = await supabase.functions.invoke('delete-user', {
                            body: { userId: id }
                        });
                        if (error) throw error;
                    }
                    
                    toast.success("Firmaet er nu slettet permanent!");
                    setCarpenters(prev => prev.filter(c => c.id !== id));
                } catch (err) {
                    console.error("Slette fejl:", err);
                    toast.error("Der opstod en fejl: " + (err.message || JSON.stringify(err)));
                } finally {
                    setIsUpdating(false);
                }
            }
        });
    };

    if (isLoading) return <div style={{textAlign: 'center', padding: '100px'}}>Låser Gudeblikket op...</div>;

    return (
        <div style={{ background: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginBottom: '8px' }}>
                            <Shield size={24} />
                            <span style={{ fontWeight: 'bold', letterSpacing: '2px', fontSize: '12px', textTransform: 'uppercase' }}>Super-Admin adgang</span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: '32px' }}>Platformskontrol</h1>
                        <p style={{ color: '#94a3b8', margin: '8px 0 0 0' }}>Overvåg og administrer alle aktive tømrere på SaaS platformen.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', textDecoration: 'none', background: '#334155', padding: '10px 16px', borderRadius: '8px' }}>
                            <ArrowLeft size={16} /> Gå til lokalt Dashboard
                        </Link>
                        <button onClick={() => supabase.auth.signOut()} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', background: '#ef4444', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            <LogOut size={16} /> Log ud
                        </button>
                    </div>
                </header>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <button 
                        onClick={() => setActiveTab('carpenters')}
                        style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: activeTab === 'carpenters' ? '#3b82f6' : '#1e293b', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
                    >
                        <Users size={18} /> Firmaer
                    </button>
                    <button 
                        onClick={() => setActiveTab('algorithm')}
                        style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: activeTab === 'algorithm' ? '#10b981' : '#1e293b', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
                    >
                        <CheckCircle size={18} /> ML Auto-Kalibrering
                    </button>
                    <button 
                        onClick={() => setActiveTab('ai-training')}
                        style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: activeTab === 'ai-training' ? '#38bdf8' : '#1e293b', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
                    >
                        <span style={{ fontSize: '18px' }}>🤖</span> AI Feedback Træning
                    </button>
                </div>

                {activeTab === 'carpenters' && (
                    <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                    <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users size={20} />
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Tilmeldte Firmaer ({carpenters.length})</h2>
                    </div>
                    
                    {carpenters.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Ingen firmaer fundet.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#334155', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Firma & Slug</th>
                                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Kunde-Link</th>
                                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Oprettet</th>
                                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Status</th>
                                    <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Aktion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {carpenters.map(carp => (
                                    <React.Fragment key={carp.id}>
                                        <tr style={{ borderBottom: '1px solid #334155', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#283548'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ fontWeight: 'bold' }}>
                                                    {carp.company_name || 'Uden Navn'}
                                                    {carp.tier === 'enterprise' && <span style={{ fontSize: '10px', background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>Enterprise</span>}
                                                </div>
                                                <div style={{ color: '#94a3b8', fontSize: '13px' }}>Slug: /{carp.slug}</div>
                                                {carp.team && carp.team.length > 0 && (
                                                    <button 
                                                        onClick={() => toggleCompanyExpanded(carp.id)}
                                                        style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '12px', padding: '4px 0', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        <Users size={12} />
                                                        {expandedCompanies[carp.id] ? 'Skjul' : 'Vis'} {carp.team.length} medarbejder{carp.team.length !== 1 ? 'e' : ''}
                                                        {expandedCompanies[carp.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                {carp.slug ? (
                                                    <a href={`/${carp.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        Test Link <ExternalLink size={14} />
                                                    </a>
                                                ) : (
                                                    <span style={{ color: '#ef4444' }}>Intet link opsat</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '13px' }}>
                                                {new Date(carp.created_at).toLocaleDateString('da-DK')}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                {carp.is_active !== false ? (
                                                    <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                        <CheckCircle size={14} /> Aktiv
                                                    </span>
                                                ) : (
                                                    <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                        <Lock size={14} /> Suspenderet
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => setSelectedCarpenterData(carp)}
                                                        style={{
                                                            background: '#10b981',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '8px 16px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontWeight: 'bold',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <FileText size={16} /> Vis Data
                                                    </button>
                                                    <Link to={`/dashboard?impersonate=${carp.id}`} style={{ 
                                                        background: '#3b82f6', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        padding: '8px 16px', 
                                                        borderRadius: '6px', 
                                                        textDecoration: 'none',
                                                        fontSize: '13px', 
                                                        fontWeight: 'bold',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                    }}>
                                                        Rediger Portal
                                                    </Link>
                                                    <button 
                                                        disabled={isUpdating}
                                                        onClick={() => toggleActiveStatus(carp.id, carp.is_active !== false)}
                                                        style={{ 
                                                            background: carp.is_active !== false ? '#ef4444' : '#10b981', 
                                                            color: 'white', 
                                                            border: 'none', 
                                                            padding: '8px 16px', 
                                                            borderRadius: '6px', 
                                                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                                                            fontWeight: 'bold',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <Power size={16} />
                                                        {carp.is_active !== false ? 'Lås Konto' : 'Lås Op'}
                                                    </button>
                                                    <button 
                                                        disabled={isUpdating}
                                                        onClick={() => deleteCarpenter(carp.id, carp.company_name, carp.email)}
                                                        style={{ 
                                                            background: 'transparent', 
                                                            color: '#ef4444', 
                                                            border: '1px solid #ef4444', 
                                                            padding: '8px 12px', 
                                                            borderRadius: '6px', 
                                                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                                                            fontWeight: 'bold',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            marginLeft: '4px'
                                                        }}
                                                        title="Slet konto fuldstændig"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedCompanies[carp.id] && carp.team && carp.team.length > 0 && (
                                            <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '2px solid #1e293b' }}>
                                                <td colSpan="5" style={{ padding: '16px 20px 16px 50px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '12px' }}>
                                                        <Users size={12} /> 
                                                        Medarbejdere i dette firma ({carp.team.length})
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                                                        {carp.team.map(member => (
                                                            <div key={member.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                                                                <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '14px', marginBottom: '4px' }}>{member.owner_name || member.email}</div>
                                                                <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'capitalize' }}>Rolle: {member.role === 'sales' ? 'Sælger/Projektleder' : member.role === 'accountant' ? 'Bogholder' : member.role}</div>
                                                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                                                                    <button 
                                                                        disabled={isUpdating}
                                                                        onClick={() => deleteCarpenter(member.id, member.owner_name, member.email)}
                                                                        style={{ 
                                                                            background: 'transparent', 
                                                                            color: '#ef4444', 
                                                                            border: 'none', 
                                                                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                                                                            fontWeight: '600',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            fontSize: '12px'
                                                                        }}
                                                                    >
                                                                        <Trash2 size={12} /> Slet Bruger
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                )}

                {activeTab === 'algorithm' && (
                    <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                        <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle size={20} color="#10b981" />
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Algoritme Sundhed (ML Træning)</h2>
                        </div>
                        <div style={{ padding: '20px', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
                            Her ser du automatisk opsamlet data fra alle de tilbud, tømrerne har genereret gennem platformen. Tabellen viser gennemsnittet af <strong>systemets oprindelige gæt</strong> kontra den <strong>faktiske tilbudspris</strong>, tømrerne endte med at sende. Hvis et tal er meget rødt eller grønt, skal formlerne i <code>prices.js</code> måske finjusteres.
                        </div>

                        {(() => {
                            const mlLeads = leads.filter(l => l.raw_data && l.raw_data.actual_quote_price);
                            if (mlLeads.length === 0) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Der er endnu ikke genereret nogen faktiske tilbud at træne algoritmen på.</div>;
                            
                            const stats = {};
                            mlLeads.forEach(lead => {
                                const cat = lead.project_category;
                                if (!stats[cat]) stats[cat] = { count: 0, sumActual: 0, sumEstimate: 0, validEstimates: 0 };
                                
                                stats[cat].count += 1;
                                stats[cat].sumActual += lead.raw_data.actual_quote_price;
                                
                                if (lead.price_estimate) {
                                    const parts = lead.price_estimate.split('-');
                                    if (parts.length >= 2) {
                                        const lowStr = parts[0].replace(/[^\d]/g, '');
                                        const highStr = parts[1].replace(/[^\d]/g, '');
                                        const low = parseInt(lowStr);
                                        const high = parseInt(highStr);
                                        if (!isNaN(low) && !isNaN(high)) {
                                            stats[cat].sumEstimate += (low + high) / 2;
                                            stats[cat].validEstimates += 1;
                                        }
                                    }
                                }
                            });

                            const statsArray = Object.entries(stats).map(([cat, data]) => {
                                const avgActual = data.sumActual / data.count;
                                const avgEstimate = data.validEstimates > 0 ? data.sumEstimate / data.validEstimates : 0;
                                const diffPercent = avgEstimate > 0 ? ((avgActual - avgEstimate) / avgEstimate) * 100 : 0;
                                return { category: cat, count: data.count, avgActual, avgEstimate, diffPercent };
                            }).sort((a, b) => b.count - a.count);

                            return (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#334155', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
                                            <th style={{ padding: '16px 20px', fontWeight: '600' }}>Kategori</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'center' }}>Antal Sager</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Gns. System Estimat</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Gns. Faktisk Tilbud</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Afvigelse</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {statsArray.map(stat => (
                                            <tr key={stat.category} style={{ borderBottom: '1px solid #334155' }}>
                                                <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{stat.category}</td>
                                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                    <span style={{ background: '#334155', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>{stat.count}</span>
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'right', color: '#94a3b8' }}>
                                                    {stat.avgEstimate > 0 ? `${new Intl.NumberFormat('da-DK').format(Math.round(stat.avgEstimate))} kr.` : 'N/A'}
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 'bold', color: '#f8fafc' }}>
                                                    {new Intl.NumberFormat('da-DK').format(Math.round(stat.avgActual))} kr.
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                    {stat.avgEstimate > 0 ? (
                                                        <span style={{ 
                                                            color: Math.abs(stat.diffPercent) > 10 ? '#ef4444' : (stat.diffPercent > 0 ? '#f59e0b' : '#10b981'),
                                                            fontWeight: 'bold',
                                                            background: Math.abs(stat.diffPercent) > 10 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px'
                                                        }}>
                                                            {stat.diffPercent > 0 ? '+' : ''}{stat.diffPercent.toFixed(1)}%
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'ai-training' && (
                    <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', color: '#f8fafc' }}>
                        <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '20px' }}>🤖</span>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>AI Feedback & Træning (Super-Admin)</h2>
                        </div>
                        <AiTrainingView carpenterId={null} />
                    </div>
                )}
            </div>

            {/* Slide-over Skuffe til Fakturerings- og Kundedata */}
            {selectedCarpenterData && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, transition: 'opacity 0.3s' }}
                    onClick={() => setSelectedCarpenterData(null)}
                >
                    <div 
                        style={{ 
                            position: 'absolute', top: 0, right: 0, bottom: 0, width: '400px', maxWidth: '100vw', 
                            backgroundColor: '#0f172a', borderLeft: '1px solid #334155', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                            padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setSelectedCarpenterData(null)}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '5px' }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px', color: '#10b981' }}>
                            <FileText size={24} />
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>Firma- / Fakturadata</h2>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Firmanavn</label>
                            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '12px', borderRadius: '8px', fontSize: '15px' }}>
                                {selectedCarpenterData.company_name || 'Ikke udfyldt'}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Kontaktperson (Ejer)</label>
                            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '12px', borderRadius: '8px', fontSize: '15px' }}>
                                {selectedCarpenterData.owner_name || 'Ikke udfyldt'}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>CVR-nummer</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', padding: '12px', borderRadius: '8px', fontSize: '15px', color: '#f8fafc', fontFamily: 'monospace' }}>
                                    {selectedCarpenterData.cvr || 'Ikke udfyldt'}
                                </div>
                                {selectedCarpenterData.cvr && (
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedCarpenterData.cvr);
                                            toast.success('CVR kopieret!');
                                        }}
                                        style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Copy size={16} /> Kopier
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Faktura E-mail</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', padding: '12px', borderRadius: '8px', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {selectedCarpenterData.email || 'Ikke udfyldt'}
                                </div>
                                {selectedCarpenterData.email && (
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedCarpenterData.email);
                                            toast.success('Email kopieret!');
                                        }}
                                        style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Copy size={16} /> Kopier
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Adresse</label>
                            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '12px', borderRadius: '8px', fontSize: '15px' }}>
                                {selectedCarpenterData.address || 'Ikke udfyldt'}
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Telefon</label>
                            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '12px', borderRadius: '8px', fontSize: '15px' }}>
                                {selectedCarpenterData.phone || 'Ikke udfyldt'}
                            </div>
                        </div>
                        
                        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #334155' }}>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Tip: Kopier CVR eller Mail og sæt direkte ind i Dinero / e-conomic.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmDialog.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '30px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: confirmDialog.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: confirmDialog.type === 'danger' ? '#ef4444' : '#f59e0b' }}>
                                {confirmDialog.type === 'danger' ? <Trash2 size={20} /> : <Power size={20} />}
                            </div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>{confirmDialog.title}</h3>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px', whiteSpace: 'pre-wrap' }}>
                            {confirmDialog.message}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.background = '#334155'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                Annuller
                            </button>
                            <button 
                                onClick={() => {
                                    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                                }}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: confirmDialog.type === 'danger' ? '#ef4444' : '#f59e0b', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.opacity = 0.9}
                                onMouseOut={e => e.currentTarget.style.opacity = 1}
                            >
                                Bekræft
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>
                {`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};

export default AdminDashboard;
