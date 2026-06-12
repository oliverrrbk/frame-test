import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Lock, Upload, Camera, Smartphone, Copy, CheckCircle, MapPin, Phone, MessageSquare, ChevronRight, Shield, Heart } from 'lucide-react';
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
        newPassword: '',
        confirmPassword: '',
        // Private oplysninger (gemmes i raw_data — kun synligt for medarbejderen selv + mester)
        home_address: myProfile?.raw_data?.home_address || '',
        home_zip: myProfile?.raw_data?.home_zip || '',
        home_city: myProfile?.raw_data?.home_city || '',
        next_of_kin_name: myProfile?.raw_data?.next_of_kin_name || myProfile?.raw_data?.next_of_kin || '',
        next_of_kin_phone: myProfile?.raw_data?.next_of_kin_phone || ''
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

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setError('De to kodeord stemmer ikke overens!');
            setIsSaving(false);
            return;
        }
        
        try {
            // Flet private felter ind i raw_data (overskriver ikke andet)
            const mergedRawData = {
                ...(myProfile?.raw_data || {}),
                home_address: formData.home_address,
                home_zip: formData.home_zip,
                home_city: formData.home_city,
                next_of_kin_name: formData.next_of_kin_name,
                next_of_kin_phone: formData.next_of_kin_phone
            };

            // Opdater navn og telefon i carpenters tabellen
            const { error: dbError } = await supabase
                .from('carpenters')
                .update({
                    owner_name: formData.owner_name,
                    phone: formData.phone,
                    raw_data: mergedRawData
                })
                .eq('id', myProfile.id);

            if (dbError) throw dbError;
            
            // Opdater password hvis angivet
            if (formData.newPassword) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: formData.newPassword
                });
                
                if (authError) throw authError;
                
                setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
            }
            
            setMyProfile(prev => ({
                ...prev,
                owner_name: formData.owner_name,
                phone: formData.phone,
                raw_data: mergedRawData
            }));
            
            setMessage('Din profil blev opdateret!');
        } catch (err) {
            setError('Kunne ikke gemme ændringerne: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const formatPhoneNumber = (value) => {
        let cleaned = value.replace(/[^\d+]/g, '');
        let prefix = '';
        let rest = cleaned;
        
        if (cleaned.startsWith('+45')) {
            prefix = '+45 ';
            rest = cleaned.substring(3);
        } else if (cleaned.startsWith('+')) {
            return cleaned;
        }
        
        rest = rest.substring(0, 8);
        const match = rest.match(/.{1,2}/g);
        return prefix + (match ? match.join(' ') : '');
    };

    const handleCopyText = () => {
        const textToCopy = `Hej! Tak for snakken. Her er linket til vores prisberegner, så du nemt kan få et uforpligtende prisoverslag: ${window.location.origin}/wizard/${myProfile.id}`;
        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '60px', padding: '0 16px' }}>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {message && <div style={{ padding: '12px 16px', background: '#d1fae5', color: '#065f46', borderRadius: '12px', marginBottom: '16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16}/> {message}</div>}
            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}

            {/* AVATAR SECTION */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0 24px' }}>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ 
                        width: '100px', height: '100px', borderRadius: '50%', background: '#f1f5f9', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        position: 'relative', cursor: 'pointer', overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '2px solid #fff'
                    }}
                >
                    {myProfile?.avatar_url ? (
                        <img src={myProfile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: '2.5rem', color: '#94a3b8', fontWeight: 'bold' }}>
                            {(formData.owner_name || 'T').charAt(0).toUpperCase()}
                        </span>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isUploading ? 1 : 0, transition: 'opacity 0.2s' }}>
                        {isUploading ? <span style={{ color: 'white', fontSize: '0.8rem' }}>...</span> : <Camera color="white" size={24} />}
                    </div>
                </div>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
                
                <h2 style={{ margin: '16px 0 4px', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>{formData.owner_name || 'Dit Navn'}</h2>
                <div style={{ fontSize: '0.9rem', color: '#64748b', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
                    {myProfile?.role === 'admin' ? 'Mester / Admin' : 'Medarbejder'}
                </div>
            </div>

            {/* GENERELLE OPLYSNINGER */}
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 8px 16px', fontWeight: '700', letterSpacing: '0.05em' }}>Generelt</h3>
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <User size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        placeholder="Dit fulde navn" 
                        value={formData.owner_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
                    <Phone size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        placeholder="Telefonnummer" 
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>
            </div>

            {/* PRIVATE OPLYSNINGER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 16px 8px 16px' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', margin: 0, fontWeight: '700', letterSpacing: '0.05em' }}>Private Oplysninger</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                    <Lock size={10} /> Kun for mester
                </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <MapPin size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        placeholder="Hjemmeadresse" 
                        value={formData.home_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, home_address: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: '36px', flexShrink: 0 }} />
                    <input 
                        placeholder="Postnummer" 
                        value={formData.home_zip}
                        onChange={(e) => setFormData(prev => ({ ...prev, home_zip: e.target.value }))}
                        style={{ border: 'none', outline: 'none', width: '90px', fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                    <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 16px' }} />
                    <input 
                        placeholder="By" 
                        value={formData.home_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, home_city: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <Heart size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        placeholder="Pårørendes navn" 
                        value={formData.next_of_kin_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, next_of_kin_name: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
                    <Phone size={20} color="#e2e8f0" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        placeholder="Pårørendes telefonnummer" 
                        value={formData.next_of_kin_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, next_of_kin_phone: formatPhoneNumber(e.target.value) }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>
            </div>

            {/* SIKKERHED */}
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 8px 16px', fontWeight: '700', letterSpacing: '0.05em' }}>Sikkerhed</h3>
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <Lock size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        type="password"
                        placeholder="Nyt kodeord (valgfrit)" 
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>
                {formData.newPassword.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
                        <div style={{ width: '36px', flexShrink: 0 }} />
                        <input 
                            type="password"
                            placeholder="Gentag nyt kodeord" 
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                        />
                    </div>
                )}
            </div>

            {/* GEM KNAP */}
            <button 
                onClick={handleSave} 
                disabled={isSaving}
                style={{ 
                    width: '100%', padding: '16px', borderRadius: '16px', background: '#0f172a', color: 'white', 
                    fontSize: '1.1rem', fontWeight: '700', border: 'none', cursor: 'pointer', marginBottom: '32px',
                    boxShadow: '0 8px 20px -6px rgba(15, 23, 42, 0.4)'
                }}
            >
                {isSaving ? 'Gemmer...' : 'Gem Profil'}
            </button>

            {/* SMS GENVEJ CAROUSEL */}
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 16px 8px', fontWeight: '800' }}>SMS Tilbuds-genvej</h3>
            <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: '16px', paddingBottom: '16px', margin: '0 -16px', paddingLeft: '16px', paddingRight: '16px' }}>
                
                {/* Kort 1 */}
                <div style={{ minWidth: '85%', maxWidth: '320px', scrollSnapAlign: 'center', background: 'linear-gradient(145deg, #3b82f6, #2563eb)', borderRadius: '24px', padding: '24px', color: 'white', boxShadow: '0 10px 30px -10px rgba(37, 99, 235, 0.5)' }}>
                    <div style={{ background: 'rgba(255,255,255,0.2)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '16px' }}>1</div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 'bold' }}>Kopiér link</h4>
                    <p style={{ margin: '0 0 16px', fontSize: '0.9rem', opacity: 0.9 }}>Kopiér din personlige besked, som du vil sende til kunderne.</p>
                    <button onClick={handleCopyText} style={{ width: '100%', background: 'white', color: '#2563eb', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                        {isCopied ? <CheckCircle size={18} /> : <Copy size={18} />}
                        {isCopied ? 'Kopieret!' : 'Kopiér besked'}
                    </button>
                </div>

                {/* Kort 2 */}
                <div style={{ minWidth: '85%', maxWidth: '320px', scrollSnapAlign: 'center', background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ background: '#f1f5f9', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '16px' }}>2</div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>Åbn indstillinger</h4>
                    <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#64748b' }}>Gå til tastaturindstillinger på din telefon.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', color: '#475569' }}><strong>iPhone:</strong> Indstillinger → Generelt → Tastatur → Teksterstatning</div>
                        <div style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', color: '#475569' }}><strong>Android:</strong> Indstillinger → System → Personlig ordbog</div>
                    </div>
                </div>

                {/* Kort 3 */}
                <div style={{ minWidth: '85%', maxWidth: '320px', scrollSnapAlign: 'center', background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ background: '#ecfdf5', color: '#10b981', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '16px' }}>3</div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>Opret genvej</h4>
                    <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#64748b' }}>Indsæt beskeden og vælg et kort ord, fx <strong>mitlink</strong>.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                        <MessageSquare size={20} color="#3b82f6" />
                        <div style={{ fontSize: '0.85rem', color: '#475569' }}>Skriv <strong>mitlink</strong> i en SMS næste gang!</div>
                    </div>
                </div>

            </div>
            
            {/* NOTIFIKATIONER */}
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '32px 0 16px 8px', fontWeight: '800' }}>Notifikationer</h3>
            <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <PushSubscriber />
            </div>

        </div>
    );
};

export default MyProfileView;
