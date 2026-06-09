import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Lock, Upload, Camera, Smartphone, Copy, CheckCircle } from 'lucide-react';
import PushSubscriber from './PushSubscriber';

const MyProfileView = ({ myProfile, setMyProfile }) => {

    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    
    const [formData, setFormData] = useState({
        owner_name: myProfile?.owner_name || '',
        phone: myProfile?.phone || '',
        newPassword: ''
    });
    
    const fileInputRef = useRef(null);

    const handleAvatarUpload = async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;
            
            setIsUploading(true);
            setError('');
            setMessage('');
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${myProfile.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;
            
            // Upload til avatars bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });
                
            if (uploadError) throw uploadError;
            
            // Hent den offentlige URL
            const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
                
            const avatarUrl = publicUrlData.publicUrl;
            
            // Opdater databasen
            const { error: updateError } = await supabase
                .from('carpenters')
                .update({ avatar_url: avatarUrl })
                .eq('id', myProfile.id);
                
            if (updateError) throw updateError;
            
            setMyProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
            setMessage('Profilbillede opdateret!');
        } catch (err) {
            setError('Kunne ikke uploade profilbillede: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        setMessage('');
        
        try {
            // Opdater navn og telefon i carpenters tabellen
            const { error: dbError } = await supabase
                .from('carpenters')
                .update({ 
                    owner_name: formData.owner_name,
                    phone: formData.phone
                })
                .eq('id', myProfile.id);
                
            if (dbError) throw dbError;
            
            // Opdater password hvis angivet
            if (formData.newPassword) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: formData.newPassword
                });
                
                if (authError) throw authError;
                
                setFormData(prev => ({ ...prev, newPassword: '' }));
            }
            
            setMyProfile(prev => ({ 
                ...prev, 
                owner_name: formData.owner_name,
                phone: formData.phone
            }));
            
            setMessage('Din profil blev opdateret!');
        } catch (err) {
            setError('Kunne ikke gemme ændringerne: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyText = () => {
        const textToCopy = `Hej! Tak for snakken. Her er linket til vores prisberegner, så du nemt kan få et uforpligtende prisoverslag: ${window.location.origin}/wizard/${myProfile.id}`;
        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
    };

    return (
        <>
        <div className="settings-card">

            <div className="card-body">
                {message && <div className="glass-panel" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '4px solid #10b981', color: '#047857', marginBottom: '24px' }}>{message}</div>}
                {error && <div className="glass-panel" style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444', color: '#b91c1c', marginBottom: '24px' }}>{error}</div>}
                
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-32 h-32 rounded-full flex items-center justify-center overflow-hidden relative group cursor-pointer" 
                            style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-light)' }}
                            onClick={() => fileInputRef.current?.click()}>
                            {myProfile?.avatar_url ? (
                                <img src={myProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '2rem', fontWeight: '600' }}>
                                    {(myProfile?.owner_name || 'T')?.charAt(0).toUpperCase()}
                                </span>
                            )}
                            
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={24} className="text-white mb-2" />
                                <span className="text-white text-sm font-medium">Skift</span>
                            </div>
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleAvatarUpload} 
                        />
                        <button 
                            className="btn-secondary"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploader...' : 'Skift billede'}
                        </button>
                    </div>
                    
                    <div className="flex-1 w-full space-y-6">
                        <div className="input-group">
                            <label>Dit Navn</label>
                            <input 
                                type="text" 
                                value={formData.owner_name} 
                                onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))} 
                                placeholder="Indtast dit fulde navn" 
                            />
                        </div>
                        <div className="input-group">
                            <label>Dit Telefonnummer</label>
                            <input 
                                type="text" 
                                value={formData.phone} 
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} 
                                placeholder="+45 12 34 56 78" 
                            />
                        </div>
                        <div className="input-group">
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                Skift Kodeord
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'normal' }}>Efterlad blank for at beholde nuværende</span>
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                                <input 
                                    type="password" 
                                    value={formData.newPassword} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))} 
                                    placeholder="Nyt kodeord" 
                                    style={{ paddingLeft: '44px' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px' }}>
                <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Gemmer...' : 'Gem Oplysninger'}
                </button>
            </div>
        </div>

        <div className="settings-card" style={{ marginTop: '32px', background: 'linear-gradient(145deg, #ffffff, #f8fafc)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', background: '#ffffff' }}>
                <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}>
                    <Smartphone size={28} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 'bold' }}>Gør det nemt på farten</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>Del dit prisberegner-link lynhurtigt via SMS uden overhovedet at åbne platformen.</p>
                </div>
            </div>
            
            <div className="card-body" style={{ padding: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    
                    {/* Trin 1 */}
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '-12px', left: '24px', background: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}>Trin 1</div>
                        <h4 style={{ margin: '16px 0 8px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>Kopier din besked</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '16px' }}>
                            Dette er den besked, som automatisk vil blive skrevet til kunden, når du bruger genvejen.
                        </p>
                        
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1', position: 'relative' }}>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', fontStyle: 'italic', lineHeight: '1.5' }}>
                                "Hej! Tak for snakken. Her er linket til vores prisberegner, så du nemt kan få et uforpligtende prisoverslag: {window.location.origin}/wizard/{myProfile.id}"
                            </p>
                            <button 
                                onClick={handleCopyText}
                                style={{ 
                                    marginTop: '16px',
                                    width: '100%',
                                    background: isCopied ? '#10b981' : '#ffffff', 
                                    color: isCopied ? '#ffffff' : '#3b82f6',
                                    border: isCopied ? '1px solid #10b981' : '1px solid #bfdbfe', 
                                    borderRadius: '8px', 
                                    padding: '8px 16px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    gap: '8px', 
                                    fontSize: '0.9rem', 
                                    cursor: 'pointer', 
                                    fontWeight: '600', 
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}
                            >
                                {isCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
                                {isCopied ? 'Kopieret!' : 'Kopier besked'}
                            </button>
                        </div>
                    </div>
                    
                    {/* Trin 2 */}
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '-12px', left: '24px', background: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}>Trin 2</div>
                        <h4 style={{ margin: '16px 0 8px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>Opret teksterstatning</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '16px' }}>
                            Gå til indstillingerne på din telefon for at oprette genvejen.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                                <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                                    <Smartphone size={20} color="#334155" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#0f172a' }}>iPhone (iOS)</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4', marginTop: '2px' }}>Indstillinger → Generelt → Tastatur → Teksterstatning</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                                <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                                    <Smartphone size={20} color="#334155" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#0f172a' }}>Android</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4', marginTop: '2px' }}>Indstillinger → System → Sprog og input → Personlig ordbog</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trin 3 */}
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '-12px', left: '24px', background: '#10b981', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)' }}>Trin 3</div>
                        <h4 style={{ margin: '16px 0 8px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>Indsæt tekst & gem</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '16px' }}>
                            Sæt din kopierede besked ind, og vælg en genvej, f.eks. <strong style={{ color: '#0f172a', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>mitlink</strong>.
                        </p>
                        
                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={20} color="#059669" />
                                <div style={{ fontWeight: 'bold', color: '#065f46', fontSize: '1rem' }}>Du er klar!</div>
                            </div>
                            <div style={{ color: '#047857', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                Næste gang du åbner en SMS og skriver <strong>mitlink</strong>, forvandler telefonen det automatisk til din fulde tilbuds-besked!
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="settings-card" style={{ marginTop: '32px', background: '#ffffff', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#0f172a', fontWeight: 'bold' }}>Notifikationer</h3>
            <PushSubscriber />
        </div>
        </>
    );
};

export default MyProfileView;
