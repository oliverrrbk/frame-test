import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Lock, Upload, Camera } from 'lucide-react';

const MyProfileView = ({ myProfile, setMyProfile }) => {

    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
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

    return (
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
    );
};

export default MyProfileView;
