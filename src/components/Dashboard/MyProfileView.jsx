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
        <div className="settings-card mb-8">
            <div className="card-header">
                <div className="icon-wrapper" style={{ background: '#eef2ff', color: '#6366f1' }}>
                    <User size={24} />
                </div>
                <h3>Personlig Profil</h3>
            </div>
            <div className="card-body">
                
                {message && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg mb-4 text-sm font-medium border border-emerald-200">{message}</div>}
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-200">{error}</div>}
                
                <div className="flex flex-col md:flex-row gap-8 items-start mb-6">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-slate-300 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            {myProfile?.avatar_url ? (
                                <img src={myProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-slate-500 font-bold text-2xl">
                                    {(myProfile?.owner_name || 'T')?.charAt(0).toUpperCase()}
                                </span>
                            )}
                            
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={20} className="text-white mb-1" />
                                <span className="text-white text-xs font-medium">Skift</span>
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
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploader...' : 'Skift profilbillede'}
                        </button>
                    </div>
                    
                    <div className="flex-1 w-full space-y-4">
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
                            <label>Skift Kodeord <span className="text-slate-400 font-normal">(efterlad blank for at beholde nuværende)</span></label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="password" 
                                    value={formData.newPassword} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))} 
                                    placeholder="Nyt kodeord" 
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-footer">
                <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Gemmer...' : 'Gem Personlige Oplysninger'}
                </button>
            </div>
        </div>
    );
};

export default MyProfileView;
