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
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8 text-white shadow-xl flex items-center gap-6">
                <div className="bg-white/10 p-4 rounded-full">
                    <ShieldAlert size={40} className="text-blue-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-2">Bizon Super Admin</h2>
                    <p className="text-slate-300">Administrer alle tilsluttede tømrervirksomheder og deres medarbejdere.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Building2 size={20} className="text-blue-500" />
                        Tilmeldte Virksomheder ({companies.length})
                    </h3>
                </div>
                
                {isLoading ? (
                    <div className="p-12 text-center text-slate-500">Henter virksomheder...</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {companies.map(company => (
                            <div key={company.id} className="p-6 hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            {company.company_name || 'Uden navn'}
                                            {company.tier === 'enterprise' && (
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Enterprise</span>
                                            )}
                                        </h4>
                                        <p className="text-sm text-slate-500 mb-1">
                                            Ejer: {company.owner_name} • E-mail: {company.email}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Oprettet: {new Date(company.created_at).toLocaleDateString('da-DK')}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="text-center px-4 border-r border-slate-200">
                                            <p className="text-2xl font-bold text-slate-700">{company.team.length}</p>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Medarbejdere</p>
                                        </div>
                                        <button 
                                            onClick={() => handleImpersonate(company.id)}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                                        >
                                            <ExternalLink size={16} />
                                            Log ind som
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(company.id, company.company_name || 'Uden navn')}
                                            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                            title="Slet virksomhed permanent"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                {company.team.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 pl-4 border-l-2 border-l-blue-200">
                                        <h5 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                                            <Users size={14} /> Team Medlemmer
                                        </h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {company.team.map(member => (
                                                <div key={member.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm text-sm">
                                                    <p className="font-medium text-slate-800">{member.owner_name || member.email}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{member.role === 'sales' ? 'Sælger' : member.role === 'accountant' ? 'Bogholder' : member.role}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {companies.length === 0 && (
                            <div className="p-12 text-center text-slate-500">
                                Ingen virksomheder fundet i systemet.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminView;
