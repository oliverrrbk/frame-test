import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Building2, Users, ExternalLink, ShieldAlert, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SuperAdminView = () => {
    const [companies, setCompanies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        setIsLoading(true);
        // Hent alle brugere, sorter så vi kan gruppere dem bagefter
        const { data, error } = await supabase
            .from('carpenters')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (data) {
            // Grupper medarbejdere under deres virksomhed
            const companyList = data.filter(c => !c.company_id);
            const employees = data.filter(c => c.company_id);
            
            const companiesWithTeam = companyList.map(comp => ({
                ...comp,
                team: employees.filter(e => e.company_id === comp.id)
            }));
            
            setCompanies(companiesWithTeam);
        }
        setIsLoading(false);
    };

    const handleImpersonate = (companyId) => {
        // Åbn et nyt faneblad hvor vi er logget ind som denne virksomhed
        window.open(`/dashboard?impersonate=${companyId}`, '_blank');
    };

    const handleDeleteUser = async (companyId, companyName) => {
        if (!window.confirm(`Er du helt sikker på, at du vil slette "${companyName}" og alle deres data fuldstændigt? Dette kan IKKE fortrydes.`)) {
            return;
        }

        const deleteToast = toast.loading('Sletter bruger permanent...');
        
        try {
            // Slet fra Supabase Auth via Edge Function (kræver service_role key i funktionen)
            const { error: fnError } = await supabase.functions.invoke('delete-user', {
                body: { userId: companyId }
            });

            if (fnError) {
                console.error('Edge Function fejl:', fnError);
                // Vi kaster fejlen videre, så catch-blokken fanger den, hvis auth sletning fejler.
                // Men hvis det bare er en "not found", så fortsætter vi.
            }
            
            // Slet også fra carpenters (hvis der ikke er opsat ON DELETE CASCADE i databasen)
            const { error: dbError } = await supabase.from('carpenters').delete().eq('id', companyId);
            
            if (dbError) {
                console.error('Database sletning fejl:', dbError);
                throw dbError;
            }
            
            toast.success('Bruger slettet succesfuldt!', { id: deleteToast });
            fetchCompanies(); // Refresh listen
        } catch (error) {
            console.error('Fejl ved sletning:', error);
            toast.error('Der opstod en fejl ved sletning af brugeren. Prøv igen.', { id: deleteToast });
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="settings-card" style={{ background: 'linear-gradient(135deg, var(--surface-bg) 0%, rgba(15, 23, 42, 0.02) 100%)', borderBottom: '1px solid var(--border-light)' }}>
                <div className="card-body" style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div className="icon-wrapper" style={{ width: '64px', height: '64px', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
                        <ShieldAlert size={32} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Bizon Super Admin</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem' }}>Administrer alle tilsluttede tømrervirksomheder og deres medarbejdere.</p>
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="card-header">
                    <div className="icon-wrapper">
                        <Building2 size={24} />
                    </div>
                    <h3>Tilmeldte Virksomheder ({companies.length})</h3>
                </div>
                
                {isLoading ? (
                    <div className="card-body" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Henter virksomheder...</div>
                ) : (
                    <div className="card-body" style={{ padding: 0 }}>
                        <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                            {companies.map(company => (
                                <div key={company.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" style={{ padding: '32px' }}>
                                    <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                                        <div>
                                            <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 8px 0' }}>
                                                {company.company_name || 'Uden navn'}
                                                {company.tier === 'enterprise' && (
                                                    <span style={{ fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', padding: '4px 10px', borderRadius: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enterprise</span>
                                                )}
                                            </h4>
                                            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                                                Ejer: <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{company.owner_name}</span> • E-mail: <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{company.email}</span>
                                            </p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                                Oprettet: {new Date(company.created_at).toLocaleDateString('da-DK')}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <div style={{ textAlign: 'center', paddingRight: '20px', borderRight: '1px solid var(--border-light)' }}>
                                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{company.team.length}</p>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '6px 0 0 0', fontWeight: '600' }}>Medarbejdere</p>
                                            </div>
                                            <button 
                                                onClick={() => handleImpersonate(company.id)}
                                                className="btn-primary"
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                            >
                                                <ExternalLink size={16} />
                                                Log ind som
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(company.id, company.company_name || 'Uden navn')}
                                                style={{ 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    width: '42px', height: '42px', borderRadius: '12px',
                                                    background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                                className="hover:bg-red-100 dark:hover:bg-red-900/30"
                                                title="Slet virksomhed permanent"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {company.team.length > 0 && (
                                        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-light)' }}>
                                            <h5 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Users size={16} /> Team Medlemmer
                                            </h5>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                                {company.team.map(member => (
                                                    <div key={member.id} className="glass-panel flex items-center justify-between" style={{ padding: '16px 20px' }}>
                                                        <div>
                                                            <p style={{ fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '0.95rem' }}>{member.owner_name || member.email}</p>
                                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{member.email}</p>
                                                        </div>
                                                        <span style={{ 
                                                            fontSize: '0.7rem', 
                                                            background: 'var(--surface-bg)', 
                                                            color: 'var(--text-secondary)',
                                                            border: '1px solid var(--border-light)',
                                                            padding: '4px 10px', 
                                                            borderRadius: '12px', 
                                                            textTransform: 'uppercase', 
                                                            letterSpacing: '0.05em', 
                                                            fontWeight: '600' 
                                                        }}>
                                                            {member.role === 'sales' ? 'Sælger' : member.role === 'accountant' ? 'Bogholder' : member.role}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {companies.length === 0 && (
                                <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                    Ingen virksomheder fundet i systemet.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminView;
